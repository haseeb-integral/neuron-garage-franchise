// mvs-price-b3
//
// Phase 1 of the "Most Accurate Provider Pricing" plan.
//
// For each provider in a city, ask Google (via Apify's Google Search Scraper
// actor) for the AI Overview about that provider's weekly summer camp price.
// Parse the answer, and when the text is ambiguous run a small Gemini safety
// net to pick out { amount, unit, is_summer_camp, source_quote }. Write the
// result to the new mvs_providers columns added in the Phase 0 migration.
//
// This function ONLY writes to mvs_providers. It does not change tier logic,
// discovery, scoring, or any other feature. Called ad-hoc for testing in
// Phase 1; wired into mvs-run-pipeline behind the MVS_B3_PRIMARY_ENABLED
// feature flag in Phase 2.
//
// Body: { city: string, state?: string, limit?: number, providerIds?: string[], dryRun?: boolean }
// Defaults: state = "TX", limit = 25, dryRun = false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_MODEL = "google/gemini-3-flash-preview";
const APIFY_ACTOR_DEFAULT = "apify~google-search-scraper";
const APIFY_TIMEOUT_MS = 60_000;

type Unit = "per_week" | "per_session" | "per_month" | "per_summer" | "per_day" | "unknown";
type Confidence = "high" | "medium" | "review";

interface ProviderRow {
  id: string;
  name: string;
  city: string;
  website?: string | null;
  category_excluded_reason?: string | null;
}

interface PriceResult {
  provider_id: string;
  name: string;
  price_min: number | null;
  price_max: number | null;
  unit: Unit;
  weekly_min: number | null;
  weekly_max: number | null;
  is_summer_camp: "yes" | "no" | "unsure";
  source_url: string | null;
  source_quote: string | null;
  confidence: Confidence;
  needs_review: boolean;
  parser: "regex" | "gemini" | "none";
  raw_ai_overview_len: number;
  error?: string;
}

// --- helpers ---------------------------------------------------------------

function normalizeUnit(u: string | null | undefined): Unit {
  if (!u) return "unknown";
  const s = u.toLowerCase();
  if (s.includes("week")) return "per_week";
  if (s.includes("session")) return "per_session";
  if (s.includes("month")) return "per_month";
  if (s.includes("summer") || s.includes("season") || s.includes("full camp")) return "per_summer";
  if (s.includes("day")) return "per_day";
  return "unknown";
}

function toWeekly(amount: number | null, unit: Unit): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  switch (unit) {
    case "per_week": return Math.round(amount);
    case "per_session": return Math.round(amount / 1); // will be refined in Phase 3
    case "per_month": return Math.round(amount / 4.33);
    case "per_summer": return Math.round(amount / 10);
    case "per_day": return Math.round(amount * 5);
    default: return null;
  }
}

function pickConfidence(p: PriceResult): { confidence: Confidence; needs_review: boolean } {
  if (p.is_summer_camp === "no") return { confidence: "review", needs_review: true };
  if (p.weekly_min == null && p.weekly_max == null) return { confidence: "review", needs_review: true };
  const hi = p.weekly_max ?? p.weekly_min ?? 0;
  if (hi > 1200) return { confidence: "review", needs_review: true };
  if (p.unit === "unknown") return { confidence: "review", needs_review: true };
  if (p.is_summer_camp === "unsure") return { confidence: "medium", needs_review: false };
  if (p.unit === "per_week") return { confidence: "high", needs_review: false };
  return { confidence: "medium", needs_review: false };
}

// Regex first pass over the AI Overview text. Cheap, catches ~70% of cases.
function regexParse(aioText: string): {
  price_min: number | null;
  price_max: number | null;
  unit: Unit;
  quote: string | null;
} {
  if (!aioText) return { price_min: null, price_max: null, unit: "unknown", quote: null };
  const text = aioText.replace(/\s+/g, " ");

  // Range: "$275-$450 per week" / "$275 to $450 weekly"
  const rangeRe = /\$?\s*(\d{2,4})\s*(?:-|to|–|—)\s*\$?\s*(\d{2,4})\s*(?:\/|per\s+)?\s*(week|wk|day|month|mo|session|summer|season)/i;
  const rangeM = text.match(rangeRe);
  if (rangeM) {
    return {
      price_min: Number(rangeM[1]),
      price_max: Number(rangeM[2]),
      unit: normalizeUnit(rangeM[3]),
      quote: rangeM[0],
    };
  }

  // Single: "$375/week", "$375 per week", "$375 weekly"
  const singleRe = /\$\s*(\d{2,5})(?:\.\d+)?\s*(?:\/|per\s+)?\s*(week|wk|weekly|day|daily|month|monthly|mo|session|summer|season)/i;
  const singleM = text.match(singleRe);
  if (singleM) {
    const amt = Number(singleM[1]);
    return { price_min: amt, price_max: amt, unit: normalizeUnit(singleM[2]), quote: singleM[0] };
  }

  // Bare dollar figure near "camp" without a unit — leave unit unknown so
  // the confidence layer flags it for review instead of trusting it.
  const bareRe = /\$\s*(\d{2,5})/;
  const bareM = text.match(bareRe);
  if (bareM) {
    const amt = Number(bareM[1]);
    return { price_min: amt, price_max: amt, unit: "unknown", quote: bareM[0] };
  }

  return { price_min: null, price_max: null, unit: "unknown", quote: null };
}

// Heuristic: does the AI Overview describe a real kids' summer day camp?
function guessIsCamp(aioText: string, providerName: string): "yes" | "no" | "unsure" {
  if (!aioText) return "unsure";
  const t = aioText.toLowerCase();
  const positive = /(summer\s+camp|day\s+camp|kids\s+camp|children'?s?\s+camp|camp\s+program|weekly\s+camp)/.test(t);
  const negative = /(daycare|preschool|year[-\s]round\s+childcare|retail|home\s+improvement|hardware\s+store|public\s+library|public\s+park)/.test(t);
  if (positive && !negative) return "yes";
  if (negative && !positive) return "no";
  if (positive && negative) return "unsure";
  return "unsure";
}

// --- Apify Google AI Overview fetch ---------------------------------------

async function fetchAiOverview(
  provider: ProviderRow,
  city: string,
  state: string,
  apifyToken: string,
  actorId: string,
): Promise<{ text: string; sourceUrl: string | null; raw: unknown }> {
  const currentYear = new Date().getFullYear();
  const query = `${provider.name} ${city} ${state} summer camp price per week ${currentYear}`;
  // Match the exact Apify call shape used by mvs-discover-providers' working
  // B3 audit (resultsPerPage=10, timeout=45, memory=1024, no mobileResults or
  // saveHtmlToKeyValueStore flags). Deviations caused aiOverview to come back
  // empty during Phase 1 verification.
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}&timeout=45&memory=1024`;
  const body = {
    queries: query,
    resultsPerPage: 10,
    maxPagesPerQuery: 1,
    countryCode: "us",
    languageCode: "en",
    includeUnfilteredResults: false,
    saveHtml: false,
  };

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), APIFY_TIMEOUT_MS);

  let json: any = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`apify HTTP ${res.status}: ${errTxt.slice(0, 200)}`);
    }
    json = await res.json();
  } finally {
    clearTimeout(to);
  }

  // Actor returns an array of items — one per query. Look for aiOverview.
  const item = Array.isArray(json) ? json[0] : json;
  const aio = item?.aiOverview ?? item?.ai_overview ?? null;

  let text = "";
  let sourceUrl: string | null = null;

  if (typeof aio === "string") {
    text = aio;
  } else if (aio && typeof aio === "object") {
    text = String((aio as any).content ?? (aio as any).text ?? (aio as any).snippet ?? "").trim();
    const linksRaw = (aio as any).source ?? (aio as any).sources ?? (aio as any).sourceLinks ?? [];
    if (Array.isArray(linksRaw) && linksRaw.length > 0) {
      sourceUrl = String(linksRaw[0]?.url ?? linksRaw[0]?.link ?? "") || null;
    }
  }

  // Fallback: concatenate top 3 organic result snippets so we still have
  // *something* to look at when Google shows no AI Overview.
  if (!text) {
    const organic = Array.isArray(item?.organicResults) ? item.organicResults : [];
    text = organic.slice(0, 3).map((r: any) => `${r?.title ?? ""}: ${r?.description ?? r?.snippet ?? ""}`).join(" | ");
    if (!sourceUrl && organic[0]?.url) sourceUrl = organic[0].url;
  }

  return { text, sourceUrl, raw: item };
}

// --- Gemini safety-net parser ---------------------------------------------

async function geminiSafetyNet(
  aioText: string,
  provider: ProviderRow,
): Promise<Partial<PriceResult> | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || !aioText) return null;

  const system = `You extract summer camp pricing from a Google AI Overview snippet. Return STRICT JSON only.

Schema:
{
  "price_min": number | null,
  "price_max": number | null,
  "unit": "per_week" | "per_session" | "per_month" | "per_summer" | "per_day" | "unknown",
  "is_summer_camp": "yes" | "no" | "unsure",
  "source_quote": string
}

Rules:
- Only fill price if the text clearly states an amount for this provider.
- If the text is about a different business or generic industry averages, set price_min/price_max=null and is_summer_camp="unsure".
- "is_summer_camp" is "yes" only if the text describes a kids/children's summer day camp (not a daycare, preschool, year-round childcare, retail workshop, or public library).
- "source_quote" MUST be a short sentence copied verbatim from the input text; empty string if no pricing sentence exists.
- Do NOT invent numbers.`;

  const user = `Provider: "${provider.name}" in ${provider.city}\n\nGoogle AI Overview text:\n"""${aioText.slice(0, 3000)}"""`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      price_min: parsed.price_min ?? null,
      price_max: parsed.price_max ?? null,
      unit: normalizeUnit(parsed.unit),
      is_summer_camp: (["yes", "no", "unsure"] as const).includes(parsed.is_summer_camp) ? parsed.is_summer_camp : "unsure",
      source_quote: typeof parsed.source_quote === "string" ? parsed.source_quote : null,
    };
  } catch {
    return null;
  }
}

// --- main handler ---------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    // Accept either { city: "Austin", state: "TX" } or { city: "Austin, TX" }.
    // The pipeline orchestrator passes the combined "City, ST" form.
    const rawCity = String(body.city ?? "").trim();
    let city = rawCity;
    let state = String(body.state ?? "").trim();
    if (rawCity.includes(",")) {
      const parts = rawCity.split(",").map((s) => s.trim()).filter(Boolean);
      city = parts[0] ?? "";
      if (!state && parts[1]) state = parts[1];
    }
    if (!state) state = "TX";
    const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);
    const providerIds: string[] | undefined = Array.isArray(body.providerIds) ? body.providerIds : undefined;
    const dryRun = Boolean(body.dryRun ?? false);

    if (!city) {
      return new Response(JSON.stringify({ error: "city is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    if (!apifyToken) {
      return new Response(JSON.stringify({ error: "APIFY_API_TOKEN not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actorId = Deno.env.get("APIFY_GOOGLE_SEARCH_ACTOR_ID") || APIFY_ACTOR_DEFAULT;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Pick providers to price.
    const cityLabel = `${city}, ${state}`;
    let query = admin.from("mvs_providers")
      .select("id,name,city,category_excluded_reason")
      .eq("city", cityLabel)
      .is("category_excluded_reason", null)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (providerIds && providerIds.length > 0) {
      query = admin.from("mvs_providers")
        .select("id,name,city,category_excluded_reason")
        .in("id", providerIds);
    }
    const { data: providers, error: pErr } = await query;
    if (pErr) throw new Error(`providers query: ${pErr.message}`);

    let apifyCalls = 0;
    let geminiCalls = 0;

    // Process providers in parallel batches so a big city doesn't stall the
    // tool caller. Apify calls are I/O bound and each takes ~30-45s.
    const CONCURRENCY = 6;
    const providerList = (providers ?? []) as ProviderRow[];

    async function processOne(p: ProviderRow): Promise<PriceResult> {
      const result: PriceResult = {
        provider_id: p.id,
        name: p.name,
        price_min: null,
        price_max: null,
        unit: "unknown",
        weekly_min: null,
        weekly_max: null,
        is_summer_camp: "unsure",
        source_url: null,
        source_quote: null,
        confidence: "review",
        needs_review: true,
        parser: "none",
        raw_ai_overview_len: 0,
      };

      try {
        const { text, sourceUrl } = await fetchAiOverview(p, city, state, apifyToken, actorId);
        apifyCalls += 1;
        result.raw_ai_overview_len = text.length;
        result.source_url = sourceUrl;

        const r = regexParse(text);
        result.price_min = r.price_min;
        result.price_max = r.price_max;
        result.unit = r.unit;
        result.source_quote = r.quote;
        result.is_summer_camp = guessIsCamp(text, p.name);
        result.parser = r.price_min != null ? "regex" : "none";

        const needsAi =
          (r.price_min == null && text.length > 40) ||
          r.unit === "unknown" ||
          result.is_summer_camp === "unsure";

        if (needsAi) {
          const g = await geminiSafetyNet(text, p);
          geminiCalls += 1;
          if (g) {
            if (g.price_min != null) result.price_min = g.price_min ?? result.price_min;
            if (g.price_max != null) result.price_max = g.price_max ?? result.price_max;
            if (g.unit && g.unit !== "unknown") result.unit = g.unit;
            if (g.is_summer_camp) result.is_summer_camp = g.is_summer_camp;
            if (g.source_quote) result.source_quote = g.source_quote;
            result.parser = "gemini";
          }
        }

        result.weekly_min = toWeekly(result.price_min, result.unit);
        result.weekly_max = toWeekly(result.price_max, result.unit);
        const conf = pickConfidence(result);
        result.confidence = conf.confidence;
        result.needs_review = conf.needs_review;
      } catch (e) {
        result.error = (e as Error).message;
      }

      if (!dryRun) {
        const update: Record<string, unknown> = {
          price_source: "Google AI Overview",
          price_source_url: result.source_url,
          price_source_quote: result.source_quote,
          price_unit_raw: result.unit === "unknown" ? null : result.unit,
          price_confidence: result.confidence,
          price_needs_review: result.needs_review,
          updated_at: new Date().toISOString(),
        };
        if (result.weekly_min != null) update.price_min = result.weekly_min;
        if (result.weekly_max != null) update.price_max = result.weekly_max;
        if (result.is_summer_camp === "no") {
          update.category_excluded_reason = "B3: not a summer camp";
        }
        const { error: uErr } = await admin.from("mvs_providers").update(update).eq("id", p.id);
        if (uErr) result.error = `update failed: ${uErr.message}`;
      }
      return result;
    }

    const results: PriceResult[] = [];
    for (let i = 0; i < providerList.length; i += CONCURRENCY) {
      const batch = providerList.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(processOne));
      results.push(...batchResults);
    }

    return new Response(JSON.stringify({
      city: cityLabel,
      providers_scanned: results.length,
      apify_calls: apifyCalls,
      gemini_calls: geminiCalls,
      priced_high: results.filter((r) => r.confidence === "high").length,
      priced_medium: results.filter((r) => r.confidence === "medium").length,
      needs_review: results.filter((r) => r.confidence === "review").length,
      excluded_by_b3: results.filter((r) => r.is_summer_camp === "no").length,
      dryRun,
      results,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
