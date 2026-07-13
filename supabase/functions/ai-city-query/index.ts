// ============================================================================
// ai-city-query — Ask AI on /city-scoring (Phase 1 rewrite, May 24, 2026).
// ============================================================================
//
// Previous version was a one-shot JSON-mode call with 6 hardcoded category
// names (3 of which are retired) and zero data grounding — so it could never
// move sub-metric sliders or cite real numbers. That earned it a C-.
//
// This rewrite changes three things:
//   1) Smart prompt: the system message now lists the 3 real pillars + 12
//      enabled sub-metrics (real DB keys) AND live p10/median/p90 stats for
//      the most-used numeric columns AND the user's current session context
//      (applied filters, applied master weights, visible market count,
//      watchlist count, current top-5 markets). The model can finally say
//      "high income = above $95k in this universe" and "boost
//      income_100k_plus_pct" instead of guessing.
//   2) Tool calling (not free-form JSON): two strict tools the model MUST
//      pick from — `apply_filters_and_weights` (now with subMetricBoosts)
//      and `answer_factual` (grounded Q&A). Server routes on tool name.
//   3) Grounded factual answers: when `answer_factual` is picked, the
//      server fetches the cited cities' real rows from us_cities_scored,
//      then runs a second short LLM call to weave the actual numbers into
//      the answer. No more prose hallucinations like "Austin is great".
//
// Hard rules unchanged:
//   - AI never invents metric keys. Anything not in REGISTRY is dropped.
//   - AI does not modify scoring math (Rule: Sam-only). Sub-metric boosts
//     are deltas applied client-side to the existing sub-weight store.
//   - Multi-turn capped at 6 turns.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Real pillar + sub-metric registry (mirror of sowMetricRegistry.ts) ───
// Kept inline so the edge function has no cross-tree imports. If the
// frontend registry changes, update both. Only the fields the LLM needs.
const PILLAR_KEYS = ["demand", "competitiveLandscape", "franchiseeSupply"] as const;
type PillarKey = typeof PILLAR_KEYS[number];

// User-facing labels. The INTERNAL keys (franchiseeSupply, competitiveLandscape,
// demand) are the schema contract — never rename them. These labels are what
// the user reads in summary / reasoning / dataGaps. Source of truth:
// src/lib/cityScoringPageHelpers.ts (Brett, May 22–24).
const PILLAR_LABELS: Record<PillarKey, string> = {
  demand: "Demand",
  competitiveLandscape: "Competitive Opportunity",
  franchiseeSupply: "Operator & Venue Supply",
};

const PILLAR_PURPOSE: Record<PillarKey, string> = {
  demand: "Are there enough affluent families with the right-aged kids?",
  competitiveLandscape: "How crowded is the camp market — opportunity = 100 - saturation.",
  franchiseeSupply: "Are there enough teachers here to recruit as franchise operators?",
};

// Post-processor: scrub any leaked internal pillar keys out of user-facing
// prose. Defense-in-depth — the system prompt also forbids them, but models
// occasionally echo schema keys verbatim. Whole-word, case-insensitive.
function scrubPillarKeys(text: string): string {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const key of PILLAR_KEYS) {
    const label = PILLAR_LABELS[key];
    // Match the bare key as a whole word (not as a substring of another id).
    out = out.replace(new RegExp(`\\b${key}\\b`, "gi"), label);
  }
  // Defense-in-depth: scrub legacy pillar label "TAM Teachers" and the bare
  // acronym "TAM" out of user-facing prose. Renamed 2026-07-13 to
  // "Operator & Venue Supply" — old habits linger in the model.
  out = out.replace(/\bTAM Teachers\b/gi, "Operator & Venue Supply");
  out = out.replace(/\bTAM\b/g, "Operator & Venue Supply");
  return out;
}

type SubMetric = {
  key: string;
  pillar: PillarKey;
  label: string;
  blurb: string;
  // Database column this maps to on us_cities_scored, for live distributions.
  dbColumn: string | null;
  // "higher" = bigger is better for opportunity. "lower" = bigger is worse.
  direction: "higher" | "lower";
};

const SUB_METRICS: ReadonlyArray<SubMetric> = [
  // ─── Demand
  { key: "children_5_12_count", pillar: "demand", label: "Children 5–12",
    blurb: "Raw count of kids in the camp's target age range.",
    dbColumn: "children_5_12", direction: "higher" },
  { key: "median_household_income", pillar: "demand", label: "Median HH Income",
    blurb: "Typical family earnings. Above ~$90k supports discretionary camp spend.",
    dbColumn: "median_household_income", direction: "higher" },
  { key: "dual_income_household_pct", pillar: "demand", label: "% Dual-Income Households",
    blurb: "Two working parents need summer childcare more urgently.",
    dbColumn: "dual_working_families_pct", direction: "higher" },
  { key: "education_bachelors_plus_pct", pillar: "demand", label: "Parent Education (Bachelor's+)",
    blurb: "Share of adults with a college degree. Educated parents over-index on enrichment.",
    dbColumn: "college_degree_pct", direction: "higher" },
  // ─── Competitive Landscape (read-only Manus inputs but model can still talk about them)
  { key: "csi_national_brand_supply", pillar: "competitiveLandscape", label: "National Brand Supply",
    blurb: "Weighted count of national STEM/camp brands. Higher = more entrenched competition.",
    dbColumn: "csi_national_brand_count_weighted", direction: "lower" },
  { key: "csi_local_camp_estimate", pillar: "competitiveLandscape", label: "Local Camp Supply (estimate)",
    blurb: "Estimated local independent camp providers.",
    dbColumn: "csi_local_provider_estimate", direction: "lower" },
  { key: "csi_demand_adjusted_market", pillar: "competitiveLandscape", label: "Demand-Adjusted Market",
    blurb: "Elementary enrollment scaled by household income vs $65k baseline.",
    dbColumn: "csi_demand_adjusted_market", direction: "higher" },
  // ─── TAM Teachers
  { key: "public_elementary_school_count", pillar: "franchiseeSupply", label: "Public Elem. Schools",
    blurb: "Count of K-5 public schools = recruiting-pool proxy.",
    dbColumn: "public_elementary_count", direction: "higher" },
  { key: "public_elementary_teacher_count", pillar: "franchiseeSupply", label: "Public Elem. Teachers (FTE)",
    blurb: "NCES FTE teachers across elementary-serving public schools.",
    dbColumn: "public_elementary_teacher_count", direction: "higher" },
  { key: "private_charter_school_count", pillar: "franchiseeSupply", label: "Private + Charter Elem.",
    blurb: "Often more entrepreneurial teachers — open to franchise ownership.",
    dbColumn: null, direction: "higher" }, // sum of private+charter in app code
  { key: "public_elementary_enrollment", pillar: "franchiseeSupply", label: "Public Elem. Enrollment",
    blurb: "Total K-5 students. Cross-checks teacher count and market scale.",
    dbColumn: "public_elementary_enrollment", direction: "higher" },
  { key: "col_salary_index", pillar: "franchiseeSupply", label: "Teacher Salary × COL Index",
    blurb: "Teacher salary normalized by cost of living. Lower = stronger pull to franchise.",
    dbColumn: "col_salary_index", direction: "lower" },
];

const SUB_METRIC_KEYS = SUB_METRICS.map((m) => m.key);
const VALID_TIERS = ["A", "B", "C", "D"];

// ─── Live distributions cache (per cold start) ─────────────────────────────
// Computing p10/median/p90 every request would double LLM latency for no
// reason — the universe rarely changes between deploys. Cached at module
// scope so warm invocations are free.
type DistStats = Record<string, { p10: number; median: number; p90: number; max: number }>;
let distCache: DistStats | null = null;
let topMarketsCache: Array<{ city: string; state: string; composite: number; tier: string }> | null = null;

async function loadStats(supabase: any): Promise<{ dist: DistStats; topMarkets: typeof topMarketsCache }> {
  if (distCache && topMarketsCache) return { dist: distCache, topMarkets: topMarketsCache };

  const cols = SUB_METRICS.map((m) => m.dbColumn).filter((c): c is string => !!c);
  const { data, error } = await supabase
    .from("us_cities_scored")
    .select(["city_name", "state_name", "composite_score_default", ...cols].join(","))
    .not("composite_score_default", "is", null);

  if (error || !data) {
    console.warn("loadStats failed", error);
    return { dist: {}, topMarkets: [] };
  }

  const dist: DistStats = {};
  for (const col of cols) {
    const values = data
      .map((r: any) => Number(r[col]))
      .filter((v: number) => Number.isFinite(v))
      .sort((a: number, b: number) => a - b);
    if (values.length === 0) continue;
    const pick = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
    dist[col] = {
      p10: Math.round(pick(0.1)),
      median: Math.round(pick(0.5)),
      p90: Math.round(pick(0.9)),
      max: Math.round(values[values.length - 1]),
    };
  }

  // Crude tier from composite (server uses display-score tiers — but the
  // raw composite_score_default doesn't store the calibrated value, so we
  // approximate. Good enough for prompt context.)
  const tierOf = (raw: number) => (raw >= 59 ? "A" : raw >= 50 ? "B" : raw >= 41 ? "C" : "D");

  const topMarkets = data
    .map((r: any) => ({
      city: r.city_name as string,
      state: r.state_name as string,
      composite: Math.round(Number(r.composite_score_default) || 0),
      tier: tierOf(Number(r.composite_score_default) || 0),
    }))
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 8);

  distCache = dist;
  topMarketsCache = topMarkets;
  return { dist, topMarkets };
}

// ─── System prompt builder ────────────────────────────────────────────────
function buildSystemPrompt(
  dist: DistStats,
  topMarkets: NonNullable<typeof topMarketsCache>,
  session: SessionContext,
): string {
  const subMetricLines = SUB_METRICS.map((m) => {
    const d = m.dbColumn ? dist[m.dbColumn] : null;
    const distStr = d ? ` (p10=${d.p10}, median=${d.median}, p90=${d.p90}, max=${d.max})` : "";
    const dir = m.direction === "higher" ? "↑ better" : "↓ better";
    return `  - ${m.key} [${m.pillar}] "${m.label}" ${dir}${distStr}: ${m.blurb}`;
  }).join("\n");

  const pillarLines = PILLAR_KEYS.map(
    (p) => `  - internal key: ${p}  →  USER-FACING LABEL: "${PILLAR_LABELS[p]}"  — ${PILLAR_PURPOSE[p]}`,
  ).join("\n");

  const topLines = topMarkets
    .map((m, i) => `  ${i + 1}. ${m.city}, ${m.state} (raw=${m.composite}, tier ${m.tier})`)
    .join("\n");

  const sessLines: string[] = [];
  sessLines.push(`  - applied filters: ${JSON.stringify(session.appliedFilters)}`);
  sessLines.push(`  - applied master weights (%): ${JSON.stringify(session.appliedWeights)}`);
  sessLines.push(`  - visible markets after filters: ${session.visibleCount} of ${session.totalCount}`);
  sessLines.push(`  - watchlist size: ${session.watchlistCount}`);

  return `You are the Neuron Garage City Search assistant. Help franchise scouts find the best US cities for a kids' STEM camp franchise (817 pre-scored cities).

VOICE RULES (apply to every response):
- Never claim lived experience, history, or track record. This is a new analytical tool, not a veteran operator. Forbidden phrases: "in our experience", "we've seen", "we have seen", "from experience", "in our view", "we've found", "we would want", "historically we", "in our practice".
- Instead use neutral analytical framing: "in this analysis", "this analysis suggests", "the data indicates", "the signals suggest", "the model ranks".
- Speak about the data, not about us. Prefer "the score reflects…" over "we think…".
- LABEL RULES (strict): In any USER-FACING PROSE — summary, reasoning_steps, dataGaps — ALWAYS use the friendly labels: "Demand", "Competitive Opportunity", "Operator & Venue Supply". NEVER write the raw internal keys "demand", "competitiveLandscape", or "franchiseeSupply" in user-facing prose. Also NEVER write the legacy label "TAM Teachers" or the acronym "TAM" — the pillar was renamed to "Operator & Venue Supply". If a user asks about "TAM" or "TAM Teachers", treat that as the same pillar (Operator & Venue Supply) but reply using the new label. The JSON tool-call FIELDS (absoluteWeights.franchiseeSupply, weightAdjustments.competitiveLandscape, etc.) still use the original internal keys exactly — that is the schema contract and must not change. Keys in JSON: internal. Words to the user: friendly labels.


THE THREE PILLARS (each city has a 0-100 score per pillar; composite is a weighted blend):
${pillarLines}

THE 12 ENABLED SUB-METRICS — these are the REAL slider keys you can boost via subMetricBoosts. Distributions are across the live scored universe so you can calibrate intent ("high income" = above the p90):
${subMetricLines}

CURRENT SESSION:
${sessLines}

CURRENT TOP MARKETS (raw composite, for grounding only):
${topLines}

HOW TO RESPOND — call EXACTLY ONE of two tools:

A) apply_filters_and_weights — when the user wants to FILTER, RE-RANK, or NUDGE WEIGHTS.
   - filters: state (full name like "Texas") / minScore (0-100, on the raw composite) / tier (A|B|C|D), all optional. HARD RULE: NEVER set filters.state unless the user named a US state explicitly (full name like "Texas" / "California" or 2-letter postal code like "TX" / "CA"). Phrases like "good cities", "best markets", "top areas", "which of these", "of them", "good for teachers" carry NO state. Do NOT infer state from the CURRENT TOP MARKETS list — that list is for grounding only, not for picking a default state. When in doubt, leave filters.state null.
   - weightMode "absolute" → user said explicit %s or words like "100%", "only", "purely", "exclusively", "ignore the rest". Set absoluteWeights to EXACTLY what they said; un-named pillars = 0. Do not normalize.
   - weightMode "delta" → vague qualitative intent ("lean toward demand"). Integer deltas -20..+20 in weightAdjustments. NEVER use deltas larger than ±20 to fake an absolute.
   - subMetricBoosts: array of { key, delta } where key is from the sub-metric list above and delta is -20..+20. Use this for fine-grained intents — "high incomes" → { key: "median_household_income", delta: +15 }. "Lots of teachers" → boost public_elementary_teacher_count + public_elementary_school_count. Leave [] if the user only spoke about pillars.
   - In absolute mode, ALWAYS confirm the literal weights in summary (e.g. "Ranking purely by Demand — others at 0%.").
   - reasoning: 3-6 short steps. Be transparent: state what you changed AND what you did NOT change, and why.
   - dataGaps: any metrics the user implied that we don't have (e.g. Google Trends not live, GreatSchools not wired).

CRITICAL INTENT RULE — "good for Operator & Venue Supply" / "good for X pillar":
Users may still say "TAM" or "TAM Teachers" (the legacy name). Treat any of these — "TAM", "TAM Teachers", "teachers", "operator supply", "venue supply", "Operator & Venue Supply" — as referring to the SAME pillar (franchiseeSupply internal key). Reply using the new label "Operator & Venue Supply".

There are THREE tiers of intent. Pick the right one. Do not over-rotate.

  Tier 1 — WITHIN-SET HIGHLIGHT (DEFAULT for "which of these markets are good for X"):
    Examples: "which Tier A markets are good for Operator & Venue Supply",
              "which of these are good for TAM", "of these, which favor demand",
              "good cities for teachers among the ones I'm seeing".
    Action: weightMode="delta", weightAdjustments ALL ZERO (no master-weight change).
    Use subMetricBoosts to nudge the relevant sub-metrics (+8 to +12 each, 2-3 keys).
    The composite barely changes; ordering inside the existing filtered set surfaces the best
    matches. Say in summary: "Keeping your current pillar weights; nudged teacher-supply sub-metrics
    so within Tier A the strongest Operator & Venue Supply markets float up."
    NEVER set the named pillar above 50% in this tier. NEVER set it to 100%.

  Tier 2 — RANK BY / FOCUS ON / LEAN TOWARD:
    Examples: "rank by Operator & Venue Supply", "rank by TAM", "focus on demand",
              "weight teachers heavier", "lean toward competition".
    Action: weightMode="absolute" with the named pillar ~55-60%, others reduced but ALL > 0
    (e.g. Operator & Venue Supply 60 / Demand 25 / Competitive Opportunity 15). Confirm the literal split in summary.

  Tier 3 — ONLY / PURELY / 100% / IGNORE THE REST:
    Examples: "only Operator & Venue Supply", "only TAM", "100% teachers", "purely teachers", "ignore demand and competition".
    Action: weightMode="absolute" with the named pillar = 100, others = 0. Confirm in summary.

When in doubt between Tier 1 and Tier 2, pick Tier 1. The user can always say "no, weight it
heavier" as a follow-up. Over-rotating to 60-100% on the first ask is the bigger sin — it
distorts the entire ranking and looks broken.

If filters are already applied (see CURRENT SESSION above) and the user's query references
"these markets" / "of them" / "among" / "Tier A markets" / "the markets shown" — treat that as
Tier 1 unless they explicitly say "rank by" or "only".

B) answer_factual — when the user asks a FACTUAL question, not a re-ranking ("what's special about Nashville?", "compare Austin vs Houston", "why is Stillwater Tier A?", "which Texas city has the most teachers?").
   - summary: 2-4 sentences answering directly. Will be re-written by a second pass with real numbers — keep prose tight, no invented stats.
   - citedCityIds: list 1-5 cities (as "City, State") the answer is about. Server will fetch their actual rows and inject the numbers.
   - citedMetricKeys: which sub-metric keys are relevant (from the list above) — server will quote those columns for the cited cities.
   - reasoning: 2-4 steps.
   - dataGaps: if you can't fully answer because data is missing.

Be concise. Never invent cities. Never invent metric keys. Only use sub-metric keys from the list above.`;
}

// ─── Tools schema ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "apply_filters_and_weights",
      description: "Filter the city list and/or adjust master & sub-metric weights to re-rank.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", maxLength: 600 },
          filters: {
            type: "object",
            properties: {
              state: { type: ["string", "null"] },
              minScore: { type: ["number", "null"] },
              tier: { type: ["string", "null"], enum: ["A", "B", "C", "D", null] },
            },
            required: ["state", "minScore", "tier"],
            additionalProperties: false,
          },
          weightMode: { type: "string", enum: ["absolute", "delta"] },
          absoluteWeights: {
            type: "object",
            properties: {
              demand: { type: "number" },
              competitiveLandscape: { type: "number" },
              franchiseeSupply: { type: "number" },
            },
            required: ["demand", "competitiveLandscape", "franchiseeSupply"],
            additionalProperties: false,
          },
          weightAdjustments: {
            type: "object",
            properties: {
              demand: { type: "number" },
              competitiveLandscape: { type: "number" },
              franchiseeSupply: { type: "number" },
            },
            required: ["demand", "competitiveLandscape", "franchiseeSupply"],
            additionalProperties: false,
          },
          subMetricBoosts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string", enum: SUB_METRIC_KEYS },
                delta: { type: "number" },
              },
              required: ["key", "delta"],
              additionalProperties: false,
            },
          },
          reasoning_steps: { type: "array", items: { type: "string" } },
          dataGaps: { type: "array", items: { type: "string" } },
        },
        required: [
          "summary", "filters", "weightMode", "absoluteWeights",
          "weightAdjustments", "subMetricBoosts", "reasoning_steps", "dataGaps",
        ],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "answer_factual",
      description: "Answer a factual question about specific cities or metrics, with citations.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", maxLength: 800 },
          citedCityIds: { type: "array", items: { type: "string" } },
          citedMetricKeys: {
            type: "array",
            items: { type: "string", enum: SUB_METRIC_KEYS },
          },
          reasoning_steps: { type: "array", items: { type: "string" } },
          dataGaps: { type: "array", items: { type: "string" } },
        },
        required: [
          "summary", "citedCityIds", "citedMetricKeys",
          "reasoning_steps", "dataGaps",
        ],
        additionalProperties: false,
      },
    },
  },
];

// ─── Sanitizers (defense-in-depth — model is constrained by tool schema
// but we never trust schema enforcement alone) ─────────────────────────────
function sanitizeApply(raw: any) {
  const mode = raw?.weightMode === "absolute" ? "absolute" : "delta";
  const out = {
    mode: "apply" as const,
    summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 600) : "",
    filters: {
      state: typeof raw?.filters?.state === "string" ? raw.filters.state : null,
      minScore: typeof raw?.filters?.minScore === "number"
        ? Math.max(0, Math.min(100, Math.round(raw.filters.minScore)))
        : null,
      tier: typeof raw?.filters?.tier === "string" && VALID_TIERS.includes(raw.filters.tier)
        ? raw.filters.tier
        : null,
    },
    weightMode: mode as "absolute" | "delta",
    absoluteWeights: {} as Record<string, number>,
    weightAdjustments: {} as Record<string, number>,
    subMetricBoosts: [] as Array<{ key: string; delta: number; pillar: PillarKey; label: string }>,
    reasoning_steps: Array.isArray(raw?.reasoning_steps)
      ? raw.reasoning_steps.filter((s: any) => typeof s === "string").slice(0, 6).map((s: string) => s.slice(0, 240))
      : [],
    dataGaps: Array.isArray(raw?.dataGaps)
      ? raw.dataGaps.filter((s: any) => typeof s === "string").slice(0, 5).map((s: string) => s.slice(0, 200))
      : [],
  };

  for (const pillar of PILLAR_KEYS) {
    const d = raw?.weightAdjustments?.[pillar];
    out.weightAdjustments[pillar] = typeof d === "number" ? Math.max(-20, Math.min(20, Math.round(d))) : 0;
    const a = raw?.absoluteWeights?.[pillar];
    out.absoluteWeights[pillar] = typeof a === "number" ? Math.max(0, Math.min(100, Math.round(a))) : 0;
  }

  if (Array.isArray(raw?.subMetricBoosts)) {
    const seen = new Set<string>();
    for (const b of raw.subMetricBoosts.slice(0, 8)) {
      const key = String(b?.key ?? "");
      const meta = SUB_METRICS.find((m) => m.key === key);
      if (!meta || seen.has(key)) continue;
      seen.add(key);
      const delta = typeof b?.delta === "number" ? Math.max(-20, Math.min(20, Math.round(b.delta))) : 0;
      if (delta === 0) continue;
      out.subMetricBoosts.push({ key, delta, pillar: meta.pillar, label: meta.label });
    }
  }

  if (mode === "absolute") {
    const sum = Object.values(out.absoluteWeights).reduce((s, v) => s + v, 0);
    if (sum === 0) {
      out.weightMode = "delta";
    } else if (sum > 120 || sum < 80) {
      const factor = 100 / sum;
      const keys = Object.keys(out.absoluteWeights);
      let running = 0;
      keys.forEach((k, i) => {
        if (i === keys.length - 1) {
          out.absoluteWeights[k] = Math.max(0, 100 - running);
        } else {
          const v = Math.max(0, Math.round(out.absoluteWeights[k] * factor));
          out.absoluteWeights[k] = v;
          running += v;
        }
      });
    }
  }

  return out;
}

function sanitizeFactual(raw: any) {
  return {
    mode: "factual" as const,
    summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 800) : "",
    citedCityIds: Array.isArray(raw?.citedCityIds)
      ? raw.citedCityIds.filter((s: any) => typeof s === "string").slice(0, 5)
      : [],
    citedMetricKeys: Array.isArray(raw?.citedMetricKeys)
      ? raw.citedMetricKeys
          .filter((s: any) => typeof s === "string" && SUB_METRIC_KEYS.includes(s))
          .slice(0, 6)
      : [],
    reasoning_steps: Array.isArray(raw?.reasoning_steps)
      ? raw.reasoning_steps.filter((s: any) => typeof s === "string").slice(0, 4).map((s: string) => s.slice(0, 240))
      : [],
    dataGaps: Array.isArray(raw?.dataGaps)
      ? raw.dataGaps.filter((s: any) => typeof s === "string").slice(0, 5).map((s: string) => s.slice(0, 200))
      : [],
    evidence: [] as Array<{ city: string; state: string; metrics: Record<string, number | null> }>,
  };
}

// ─── Grounding: fetch cited cities + their metric columns and rewrite the
// answer so it quotes real numbers. ────────────────────────────────────────
async function groundFactual(
  supabase: any,
  apiKey: string,
  result: ReturnType<typeof sanitizeFactual>,
  query: string,
): Promise<typeof result> {
  if (result.citedCityIds.length === 0) return result;

  const cols = ["city_name", "state_name", "composite_score_default"];
  const metricCols = result.citedMetricKeys
    .map((k) => SUB_METRICS.find((m) => m.key === k)?.dbColumn)
    .filter((c): c is string => !!c);
  cols.push(...metricCols);

  // Parse "City, State" strings.
  const cityPairs = result.citedCityIds
    .map((id) => {
      const [city, state] = id.split(",").map((s) => s.trim());
      return city && state ? { city, state } : null;
    })
    .filter((p): p is { city: string; state: string } => !!p);

  if (cityPairs.length === 0) return result;

  // OR-join: (city_name=A AND state_name=A) OR ...
  const orExpr = cityPairs
    .map((p) => `and(city_name.eq.${p.city},state_name.eq.${p.state})`)
    .join(",");

  const { data, error } = await supabase
    .from("us_cities_scored")
    .select(cols.join(","))
    .or(orExpr);

  if (error || !data) {
    console.warn("groundFactual fetch failed", error);
    return result;
  }

  result.evidence = data.map((r: any) => {
    const metrics: Record<string, number | null> = {};
    for (const k of result.citedMetricKeys) {
      const col = SUB_METRICS.find((m) => m.key === k)?.dbColumn;
      metrics[k] = col ? (r[col] == null ? null : Number(r[col])) : null;
    }
    return { city: r.city_name, state: r.state_name, metrics };
  });

  // Second LLM pass: rewrite the summary to weave in the actual numbers.
  if (result.evidence.length > 0) {
    try {
      const evidencePrompt = `User asked: "${query}"
Your draft answer: ${result.summary}

Real data for the cities you cited:
${result.evidence.map((e) => {
  const lines = Object.entries(e.metrics).map(([k, v]) => {
    const label = SUB_METRICS.find((m) => m.key === k)?.label ?? k;
    return `    ${label}: ${v == null ? "n/a" : v.toLocaleString()}`;
  }).join("\n");
  return `  ${e.city}, ${e.state}:\n${lines}`;
}).join("\n")}

Rewrite the answer in 2-4 sentences, weaving in the specific numbers above naturally. Never invent values not in the data. Plain prose, no markdown, no bullet points.`;

      const rewriteResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You rewrite draft answers using the supplied real-world data. Never invent values." },
            { role: "user", content: evidencePrompt },
          ],
        }),
      });
      if (rewriteResp.ok) {
        const j = await rewriteResp.json();
        const rewritten = j?.choices?.[0]?.message?.content;
        if (typeof rewritten === "string" && rewritten.trim().length > 20) {
          result.summary = rewritten.trim().slice(0, 800);
        }
      }
    } catch (e) {
      console.warn("grounding rewrite failed", e);
    }
  }

  return result;
}

// ─── Session context the client sends with every turn ──────────────────────
type SessionContext = {
  appliedFilters: { state: string | null; tier: string | null; minScore: number | null };
  appliedWeights: Record<string, number>;
  visibleCount: number;
  totalCount: number;
  watchlistCount: number;
};

const DEFAULT_SESSION: SessionContext = {
  appliedFilters: { state: null, tier: null, minScore: null },
  appliedWeights: { demand: 40, competitiveLandscape: 30, franchiseeSupply: 30 },
  visibleCount: 0,
  totalCount: 817,
  watchlistCount: 0,
};

// ─── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = token
      ? await supabase.auth.getUser(token)
      : ({ data: { user: null }, error: null } as any);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated", detail: userErr?.message ?? "missing or invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const threadId: string | undefined = body.threadId;
    const previousTurns: Array<{ query: string; response: any }> = Array.isArray(body.previousTurns)
      ? body.previousTurns.slice(-5)
      : [];
    const session: SessionContext = {
      ...DEFAULT_SESSION,
      ...(body.session ?? {}),
      appliedFilters: { ...DEFAULT_SESSION.appliedFilters, ...(body.session?.appliedFilters ?? {}) },
      appliedWeights: { ...DEFAULT_SESSION.appliedWeights, ...(body.session?.appliedWeights ?? {}) },
    };

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (query.length > 500) {
      return new Response(JSON.stringify({ error: "Query too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (previousTurns.length >= 6) {
      return new Response(JSON.stringify({ error: "Conversation limit reached. Start a new search." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dist, topMarkets } = await loadStats(supabase);
    const systemPrompt = buildSystemPrompt(dist, topMarkets ?? [], session);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    for (const turn of previousTurns) {
      messages.push({ role: "user", content: turn.query });
      messages.push({ role: "assistant", content: JSON.stringify(turn.response ?? {}) });
    }
    messages.push({ role: "user", content: query });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: TOOLS,
        tool_choice: "required",
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable Cloud settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const choice = aiJson?.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    const toolName = toolCall?.function?.name;
    const argsRaw = toolCall?.function?.arguments ?? "{}";

    let parsed: any = {};
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Failed to parse tool args", e, argsRaw);
      return new Response(JSON.stringify({ error: "AI returned malformed response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    if (toolName === "answer_factual") {
      const factual = sanitizeFactual(parsed);
      result = await groundFactual(supabase, apiKey, factual, query);
    } else {
      // Default + fallback: treat as apply.
      result = sanitizeApply(parsed);
    }

    // Safety net: scrub any leaked internal pillar keys out of user-facing
    // prose. JSON tool fields (absoluteWeights.franchiseeSupply, etc.) are
    // untouched — only the human-readable strings get relabeled.
    if (result) {
      if (typeof result.summary === "string") result.summary = scrubPillarKeys(result.summary);
      if (Array.isArray(result.reasoning_steps)) {
        result.reasoning_steps = result.reasoning_steps.map((s: any) =>
          typeof s === "string" ? scrubPillarKeys(s) : s);
      }
      if (Array.isArray(result.dataGaps)) {
        result.dataGaps = result.dataGaps.map((s: any) =>
          typeof s === "string" ? scrubPillarKeys(s) : s);
      }
    }

    const finalThreadId = threadId ?? crypto.randomUUID();

    try {
      await supabase.from("ai_query_history").insert({
        user_id: userId,
        thread_id: finalThreadId,
        query,
        response: result,
      });
    } catch (e) {
      console.warn("ai_query_history insert failed", e);
    }

    return new Response(JSON.stringify({ threadId: finalThreadId, result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-city-query error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
