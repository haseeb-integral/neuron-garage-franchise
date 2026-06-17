// Phase 2 / Turn 2.1b
// mvs-discover-providers
// Sustainable: no per-city URL hardcoding. Uses Firecrawl SEARCH with a
// city-scoped query against hisawyer.com to discover the right pages
// dynamically, scrapes the top N in one call, then extracts + dedupes
// providers via Gemini. Adding more platforms = appending more queries.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Platforms we discover against. Add more entries here to expand coverage
// (e.g. activityhero.com, classpass.com) — no per-city work required.
const PLATFORMS: Array<{
  platform: string;
  domain: string;
  // Query template — {city} replaced at runtime.
  queryTemplate: string;
}> = [
  {
    platform: "sawyer",
    domain: "hisawyer.com",
    queryTemplate: `site:hisawyer.com "{city}" kids classes`,
  },
];

const SEARCH_RESULT_LIMIT = 8; // top N pages per platform
const MAX_MARKDOWN_PER_PAGE = 12000;

type ProviderExtract = {
  name: string;
  url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  category_raw?: string | null;
  confidence: number;
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

  // Auth: manager or admin required.
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
  const city: string = (body?.city ?? "Austin, TX").trim();
  if (!city) {
    return new Response(JSON.stringify({ error: "city required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  let firecrawlCalls = 0;
  const debug: Record<string, unknown> = { platforms: {} };

  try {
    const allRows: Array<Record<string, unknown>> = [];
    const seen = new Set<string>(); // dedupe by (platform + normalized name)

    for (const plat of PLATFORMS) {
      const query = plat.queryTemplate.replace("{city}", city);
      // 1) Firecrawl SEARCH with scraped markdown for each result.
      const sRes = await fetch(`${FIRECRAWL_V2}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: SEARCH_RESULT_LIMIT,
          scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
        }),
      });
      firecrawlCalls += 1;
      const sJson = await sRes.json();
      if (!sRes.ok) {
        throw new Error(
          `firecrawl search ${sRes.status}: ${JSON.stringify(sJson).slice(0, 400)}`,
        );
      }

      // Firecrawl v2 search response: { data: { web: [ { url, title, markdown, ... } ] } }
      // Some responses use { data: [...] } directly. Handle both.
      const webResults: Array<{ url?: string; title?: string; markdown?: string; description?: string }> =
        sJson?.data?.web ?? sJson?.data ?? [];

      const platformDebug = {
        query,
        results_found: webResults.length,
        urls: webResults.map((r) => r.url).filter(Boolean).slice(0, 20),
      };
      (debug.platforms as Record<string, unknown>)[plat.platform] = platformDebug;

      if (webResults.length === 0) continue;

      // 2) Stitch the markdown from each result into one extraction prompt.
      const stitched = webResults
        .map((r, i) => {
          const md = (r.markdown ?? r.description ?? "").slice(0, MAX_MARKDOWN_PER_PAGE);
          return `\n\n=== RESULT ${i + 1} ===\nURL: ${r.url ?? ""}\nTITLE: ${r.title ?? ""}\n${md}`;
        })
        .join("");

      const sys = `You extract kids' activity providers from scraped marketplace pages.
Return strict JSON:
{ "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }

Rules:
- A "provider" is a real business/brand offering kids' classes, camps, or activities (e.g. "Bilinguitos Spanish Immersion", "Austin Gymnastics Club").
- DO NOT include: search categories, location names, navigation links, ads, marketplace platform names (Sawyer, ActivityHero), generic terms ("Kids Classes", "Music"), or individual class titles unless the provider name is clearly identifiable.
- Prefer in-person providers in the requested city. Include online providers only if no in-person ones are present.
- Prices in USD per class or per session. Use null if unknown — DO NOT guess.
- Confidence 0..1 reflects how sure you are this is a real, distinct provider operating in or serving the city.
- Dedupe by provider name across all results.
- Hard cap: 60 providers.`;

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
              content: `City: ${city}\nPlatform: ${plat.platform} (${plat.domain})\n\nSCRAPED PAGES:\n${stitched}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const aiJson = await aiRes.json();
      if (!aiRes.ok) {
        throw new Error(
          `ai gateway ${aiRes.status}: ${JSON.stringify(aiJson).slice(0, 400)}`,
        );
      }
      const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
      let parsed: { providers?: ProviderExtract[] } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`failed to parse AI JSON for ${plat.platform}: ${raw.slice(0, 300)}`);
      }
      const providers = (parsed.providers ?? []).filter((p) => p?.name);

      for (const p of providers) {
        const key = `${plat.platform}:${normalizeName(p.name)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allRows.push({
          city,
          name: p.name.trim().slice(0, 300),
          platform: plat.platform,
          url: p.url ?? null,
          price_min: p.price_min ?? null,
          price_max: p.price_max ?? null,
          category_raw: p.category_raw ?? null,
          tier: classifyTier(p),
          screenshot_url: null,
          confidence: Math.max(0, Math.min(1, p.confidence ?? 0.5)),
          source_run_id: run.id,
        });
      }

      (platformDebug as Record<string, unknown>).providers_extracted = providers.length;
    }

    let inserted = 0;
    if (allRows.length > 0) {
      const { error: insErr, count } = await admin
        .from("mvs_providers")
        .insert(allRows, { count: "exact" });
      if (insErr) throw new Error(`insert providers: ${insErr.message}`);
      inserted = count ?? allRows.length;
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
