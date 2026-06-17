// Phase 2 / Turn 2.1 — mvs-discover-providers (Austin only, Sawyer only)
//
// Per the approved Feature 1A Build Plan, Turn 2.1:
//   - Firecrawl scrape of a Sawyer city listing with JS wait + screenshot
//   - Gemini Flash extracts provider rows into strict JSON
//   - Writes to mvs_providers with platform='sawyer', screenshot URL stored
//   - Hardcoded to Austin. No UI. Invoked via `supabase functions invoke`.
//
// QA queue auto-flagging is NOT in this turn (belongs to Phase 3).
// Tier classification is NOT in this turn (Turn 2.2 = mvs-classify-tier).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SAWYER_AUSTIN_URL = "https://www.hisawyer.com/camps/austin-tx";
const SCREENSHOT_BUCKET = "mvs-screenshots";

type ProviderExtract = {
  name: string;
  url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  category_raw?: string | null;
  confidence: number;
};

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!firecrawlKey || !lovableKey) {
    return new Response(
      JSON.stringify({ error: "missing FIRECRAWL_API_KEY or LOVABLE_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Manager or admin required.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ["manager", "admin"]);
  if (!roleRows || roleRows.length === 0) {
    return new Response(JSON.stringify({ error: "forbidden: manager required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // City is hardcoded to Austin per Turn 2.1.
  const city = "Austin, TX";

  const { data: run, error: runErr } = await admin
    .from("mvs_pipeline_runs")
    .insert({ city, status: "running", firecrawl_calls: 0, started_at: new Date().toISOString() })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(
      JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let firecrawlCalls = 0;
  const debug: Record<string, unknown> = {};

  try {
    // 1) Firecrawl scrape with JS wait + screenshot.
    const scrapeRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: SAWYER_AUSTIN_URL,
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });
    firecrawlCalls += 1;
    const scrapeJson = await scrapeRes.json();
    if (!scrapeRes.ok) {
      throw new Error(
        `firecrawl scrape ${scrapeRes.status}: ${JSON.stringify(scrapeJson).slice(0, 400)}`,
      );
    }
    const markdown: string = scrapeJson?.data?.markdown ?? "";
    const screenshotUrlRemote: string | undefined =
      scrapeJson?.data?.screenshot ?? scrapeJson?.data?.screenshotUrl;
    debug.scrape_url = SAWYER_AUSTIN_URL;
    debug.markdown_chars = markdown.length;
    debug.screenshot_received = Boolean(screenshotUrlRemote);

    if (!markdown) throw new Error("firecrawl returned empty markdown");

    // 2) Store screenshot in mvs-screenshots bucket.
    let screenshotPath: string | null = null;
    if (screenshotUrlRemote) {
      try {
        const imgRes = await fetch(screenshotUrlRemote);
        if (imgRes.ok) {
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          const path = `${run.id}/sawyer-austin.png`;
          const { error: upErr } = await admin.storage
            .from(SCREENSHOT_BUCKET)
            .upload(path, bytes, { contentType: "image/png", upsert: true });
          if (!upErr) screenshotPath = path;
          else debug.screenshot_upload_error = upErr.message;
        }
      } catch (e) {
        debug.screenshot_fetch_error = e instanceof Error ? e.message : String(e);
      }
    }

    // 3) Gemini Flash extracts provider rows into strict JSON.
    const sys = `You extract kids' activity providers from a Sawyer marketplace listing page.
Return strict JSON:
{ "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }

Rules:
- A "provider" is a real business/brand offering kids' classes, camps, or activities (e.g. "Austin Gymnastics Club", "ArtBarnATX").
- DO NOT include: search categories, location names, navigation links, ads, the marketplace platform itself ("Sawyer"), generic terms ("Kids Classes", "Music"), or individual class titles unless the provider name is clearly identifiable.
- Prefer in-person providers serving Austin. Skip online-only providers.
- Prices in USD per class or per session. Use null if unknown — DO NOT guess.
- Confidence 0..1 reflects how sure you are this is a real, distinct provider operating in Austin.
- Dedupe by provider name.
- Hard cap: 60 providers.`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: `City: ${city}\nSource URL: ${SAWYER_AUSTIN_URL}\n\nSCRAPED PAGE MARKDOWN:\n${markdown.slice(0, 24000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(`ai gateway ${aiRes.status}: ${JSON.stringify(aiJson).slice(0, 400)}`);
    }
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { providers?: ProviderExtract[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`failed to parse AI JSON: ${raw.slice(0, 300)}`);
    }
    const providers = (parsed.providers ?? []).filter((p) => p?.name);

    // 4) Dedupe + insert into mvs_providers (platform='sawyer').
    const seen = new Set<string>();
    const rows = providers.flatMap((p) => {
      const key = normalizeName(p.name);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{
        city,
        name: p.name.trim().slice(0, 300),
        platform: "sawyer",
        url: p.url ?? null,
        price_min: p.price_min ?? null,
        price_max: p.price_max ?? null,
        category_raw: p.category_raw ?? null,
        screenshot_url: screenshotPath,
        confidence: Math.max(0, Math.min(1, p.confidence ?? 0.5)),
        source_run_id: run.id,
      }];
    });

    let inserted = 0;
    if (rows.length > 0) {
      const { data: insData, error: insErr } = await admin
        .from("mvs_providers")
        .insert(rows)
        .select("id");
      if (insErr) throw new Error(`insert providers: ${insErr.message}`);
      inserted = insData?.length ?? 0;
    }

    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "done", firecrawl_calls: firecrawlCalls })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        city,
        firecrawl_calls: firecrawlCalls,
        providers_inserted: inserted,
        screenshot_path: screenshotPath,
        debug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "failed", error: msg, firecrawl_calls: firecrawlCalls })
      .eq("id", run.id);
    return new Response(
      JSON.stringify({ run_id: run.id, error: msg, debug }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
