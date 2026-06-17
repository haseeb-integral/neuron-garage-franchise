// Phase 2 / Turn 2.1
// mvs-discover-providers
// Austin-only Sawyer scrape via Firecrawl + Gemini classification.
// Writes to mvs_providers, screenshots to mvs-screenshots bucket,
// tracked under mvs_pipeline_runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Hard-coded for Turn 2.1. Tier B / additional cities come later.
const SAWYER_CITY_URLS: Record<string, string> = {
  "Austin, TX":
    "https://www.hisawyer.com/search?location=Austin%2C+TX&distance=15",
};

type ProviderExtract = {
  name: string;
  url?: string;
  price_min?: number | null;
  price_max?: number | null;
  category_raw?: string | null;
  confidence: number; // 0..1
};

function classifyTier(
  p: ProviderExtract,
): "premium" | "mid" | "budget" | "community" {
  const cat = (p.category_raw || "").toLowerCase();
  if (
    cat.includes("library") ||
    cat.includes("parks") ||
    cat.includes("rec center") ||
    cat.includes("ymca") ||
    cat.includes("community") ||
    p.price_min === 0
  ) {
    return "community";
  }
  const px = p.price_min ?? p.price_max ?? null;
  if (px == null) return "mid";
  if (px >= 60) return "premium";
  if (px >= 30) return "mid";
  return "budget";
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

  // Auth: require manager.
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

  const body = await req.json().catch(() => ({}));
  const city: string = body?.city ?? "Austin, TX";
  const sourceUrl = SAWYER_CITY_URLS[city];
  if (!sourceUrl) {
    return new Response(
      JSON.stringify({ error: `no Sawyer URL configured for city: ${city}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create run row.
  const { data: run, error: runErr } = await admin
    .from("mvs_pipeline_runs")
    .insert({ city, status: "running", firecrawl_calls: 0 })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(
      JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 1) Firecrawl scrape (markdown + screenshot)
    const fcRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: sourceUrl,
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        waitFor: 2500,
      }),
    });
    const fcJson = await fcRes.json();
    if (!fcRes.ok) {
      throw new Error(`firecrawl ${fcRes.status}: ${JSON.stringify(fcJson).slice(0, 500)}`);
    }
    const doc = fcJson.data ?? fcJson;
    const markdown: string = doc.markdown ?? "";
    const screenshotB64OrUrl: string | undefined = doc.screenshot;

    // Upload screenshot if base64; if it's a URL, store as-is.
    let screenshotUrl: string | null = null;
    if (screenshotB64OrUrl) {
      if (screenshotB64OrUrl.startsWith("http")) {
        screenshotUrl = screenshotB64OrUrl;
      } else {
        const b64 = screenshotB64OrUrl.replace(/^data:image\/\w+;base64,/, "");
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const path = `${run.id}/sawyer-landing.png`;
        const { error: upErr } = await admin.storage
          .from("mvs-screenshots")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (!upErr) screenshotUrl = path;
      }
    }

    // 2) Gemini extraction via Lovable AI Gateway (JSON output)
    const sys = `You extract kids' activity providers from a marketplace listing page.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }.
Prices in USD per class or per session. Use null if unknown. Confidence 0..1.
Only include real providers (not categories, ads, navigation). Limit to 40 max.`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: `City: ${city}\nSource: ${sourceUrl}\n\nPAGE MARKDOWN:\n${markdown.slice(0, 60000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(`ai gateway ${aiRes.status}: ${JSON.stringify(aiJson).slice(0, 500)}`);
    }
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { providers?: ProviderExtract[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`failed to parse AI JSON: ${raw.slice(0, 300)}`);
    }
    const providers = (parsed.providers ?? []).filter((p) => p?.name);

    // 3) Insert into mvs_providers
    const rows = providers.map((p) => ({
      city,
      name: p.name.trim().slice(0, 300),
      platform: "sawyer",
      url: p.url ?? null,
      price_min: p.price_min ?? null,
      price_max: p.price_max ?? null,
      category_raw: p.category_raw ?? null,
      tier: classifyTier(p),
      screenshot_url: screenshotUrl,
      confidence: Math.max(0, Math.min(1, p.confidence ?? 0.5)),
      source_run_id: run.id,
    }));

    let inserted = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await admin
        .from("mvs_providers")
        .insert(rows, { count: "exact" });
      if (insErr) throw new Error(`insert providers: ${insErr.message}`);
      inserted = count ?? rows.length;
    }

    // 4) Mark run done
    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "done", firecrawl_calls: 1 })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        city,
        source_url: sourceUrl,
        providers_extracted: providers.length,
        providers_inserted: inserted,
        screenshot_path: screenshotUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "failed", error: msg })
      .eq("id", run.id);
    return new Response(
      JSON.stringify({ run_id: run.id, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
