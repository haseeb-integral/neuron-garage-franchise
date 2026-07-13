// ============================================================================
// city-analyst — generates the executive summary + market research report
// shown on the City Detail page. Replaces the deterministic template prose.
//
// Input:  { cityId, weightsHash?, force?, model? }
// Output: { executive_summary, report_snapshot, report_demand,
//           report_supply, report_next_move, cached }
//
// Caches by (city_id, weights_hash, model_id, prompt_version) in the
// public.city_narratives table so the second view of a city is instant.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { KB_FULL_CONTEXT } from "../_shared/knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROMPT_VERSION = "v1";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const PRO_MODEL = "google/gemini-2.5-pro";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtUSD(v: number | null): string {
  return v == null ? "n/a" : `$${Math.round(v).toLocaleString("en-US")}`;
}

function fmtPct(v: number | null): string {
  return v == null ? "n/a" : `${Math.round(v)}%`;
}

function fmtInt(v: number | null): string {
  return v == null ? "n/a" : Math.round(v).toLocaleString("en-US");
}

function tierFromScore(s: number): "A" | "B" | "C" | "D" {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 50) return "C";
  return "D";
}

// Percentile rank of `value` within `values` (higher = better).
// Returns integer 0–100 or null when value/universe missing.
function percentile(value: number | null, values: number[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const arr = values.filter((v) => Number.isFinite(v));
  if (arr.length === 0) return null;
  const below = arr.filter((v) => v < value).length;
  const equal = arr.filter((v) => v === value).length;
  // midrank convention
  const pct = ((below + 0.5 * equal) / arr.length) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)));
}

const REFERENCE_CITIES: Array<{ name: string; state: string }> = [
  { name: "Austin", state: "TX" },
  { name: "Plano", state: "TX" },
  { name: "Houston", state: "TX" },
];

// Fields we percentile-rank across the scored universe.
const PCTL_FIELDS = [
  "children_5_12",
  "median_household_income",
  "dual_working_families_pct",
  "college_degree_pct",
  "affluent_families_count",
  "affluent_families_share",
  "public_elementary_teacher_count",
  "public_elementary_count",
  "private_elementary_count",
  "charter_elementary_count",
  "public_elementary_enrollment",
  "avg_elementary_teacher_salary_usd",
  "col_salary_index",
  "cost_of_living_index",
  "csi_national_brand_count_weighted",
  "csi_local_provider_estimate",
  "csi_demand_adjusted_market",
] as const;

type ScoredRow = Record<string, unknown> & {
  id: string;
  city_name: string;
  state_abbr: string;
};

// Build a per-signal object with value, percentile, and any drivers/flags.
function buildSignalBlock(
  row: ScoredRow,
  universe: Record<string, number[]>,
) {
  const v = (k: string) => num(row[k]);
  const p = (k: string) => percentile(v(k), universe[k] ?? []);
  const population = v("population");
  const children = v("children_5_12");
  const affluentCount = v("affluent_families_count");
  const affluentShare = v("affluent_families_share");
  const privateCount = v("private_elementary_count") ?? 0;
  const charterCount = v("charter_elementary_count") ?? 0;

  return {
    demand: {
      children_5_12: {
        label: "Children ages 5–12",
        value: fmtInt(children),
        raw: children,
        percentile: p("children_5_12"),
        drivers: {
          share_of_population:
            children != null && population && population > 0
              ? `${((children / population) * 100).toFixed(1)}%`
              : "n/a",
        },
      },
      median_household_income: {
        label: "Median household income",
        value: fmtUSD(v("median_household_income")),
        raw: v("median_household_income"),
        percentile: p("median_household_income"),
      },
      affluent_families: {
        label: "Affluent families (≥$150k)",
        count: fmtInt(affluentCount),
        share:
          affluentShare != null
            ? `${(affluentShare * (affluentShare <= 1 ? 100 : 1)).toFixed(1)}%`
            : "n/a",
        count_percentile: p("affluent_families_count"),
        share_percentile: p("affluent_families_share"),
        effective_threshold: fmtUSD(v("affluent_families_effective_threshold")),
        snapped_bracket: v("affluent_families_snapped_bracket"),
        flags: affluentCount == null ? ["thin data — affluent_families_count missing"] : [],
      },
      dual_income_share: {
        label: "Dual-income household share",
        value: fmtPct(v("dual_working_families_pct")),
        percentile: p("dual_working_families_pct"),
      },
      bachelors_or_higher: {
        label: "Adults with bachelor's degree or higher",
        value: fmtPct(v("college_degree_pct")),
        percentile: p("college_degree_pct"),
      },
    },
    supply: {
      public_elementary_teachers: {
        label: "Public elementary teachers",
        value: fmtInt(v("public_elementary_teacher_count")),
        percentile: p("public_elementary_teacher_count"),
      },
      teacher_salary: {
        label: "Average elementary teacher salary",
        value: fmtUSD(v("avg_elementary_teacher_salary_usd")),
        percentile: p("avg_elementary_teacher_salary_usd"),
      },
      col_salary_index: {
        label: "Cost-of-living adjusted salary index",
        value: num(row["col_salary_index"])?.toFixed(2) ?? "n/a",
        percentile: p("col_salary_index"),
      },
      cost_of_living_index: {
        label: "Cost of living index",
        value: num(row["cost_of_living_index"])?.toFixed(1) ?? "n/a",
        percentile: p("cost_of_living_index"),
      },
      public_elementary_schools: {
        label: "Public elementary schools",
        value: fmtInt(v("public_elementary_count")),
        percentile: p("public_elementary_count"),
      },
      private_and_charter_schools: {
        label: "Private and charter elementary schools",
        value: fmtInt(privateCount + charterCount),
        private_count: fmtInt(privateCount),
        charter_count: fmtInt(charterCount),
      },
      public_elementary_enrollment: {
        label: "Public elementary enrollment",
        value: fmtInt(v("public_elementary_enrollment")),
        percentile: p("public_elementary_enrollment"),
      },
    },
    competition: {
      national_brand_weighted: {
        label: "National brand competitor count (weighted)",
        value: num(row["csi_national_brand_count_weighted"])?.toFixed(1) ?? "n/a",
        percentile: p("csi_national_brand_count_weighted"),
      },
      local_provider_estimate: {
        label: "Local camp / provider count",
        value: fmtInt(v("csi_local_provider_estimate")),
        percentile: p("csi_local_provider_estimate"),
      },
      saturation_category: {
        label: "Competitive saturation category",
        value: (row["csi_saturation_category"] as string | null) ?? "n/a",
      },
      demand_adjusted_market: {
        label: "Demand-adjusted addressable market",
        value: fmtInt(v("csi_demand_adjusted_market")),
        percentile: p("csi_demand_adjusted_market"),
      },
    },
  };
}

function collectFlags(row: ScoredRow): string[] {
  const flags: string[] = [];
  const sat = (row["csi_saturation_category"] as string | null) ?? "";
  if (/saturat/i.test(sat)) flags.push("Saturated");
  if (/unproven/i.test(sat)) flags.push("Unproven camp culture");
  if (num(row["affluent_families_count"]) == null) {
    flags.push("thin data — affluent_families_count missing");
  }
  const csiConf = num(row["csi_confidence"]);
  if (csiConf != null && csiConf < 0.5) flags.push("pending calibration — csi_confidence low");
  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cityId, weightsHash = "default", force = false, model: modelOverride, context } =
      await req.json();

    if (!cityId || typeof cityId !== "string") {
      return new Response(JSON.stringify({ error: "cityId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = modelOverride === "pro" ? PRO_MODEL : DEFAULT_MODEL;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Cache check ─────────────────────────────────────────────────────
    if (!force) {
      const { data: cached } = await supabase
        .from("city_narratives")
        .select("*")
        .eq("city_id", cityId)
        .eq("weights_hash", weightsHash)
        .eq("model_id", model)
        .eq("prompt_version", PROMPT_VERSION)
        .maybeSingle();
      if (cached) {
        return new Response(
          JSON.stringify({
            executive_summary: cached.executive_summary,
            report_snapshot: cached.report_snapshot,
            report_demand: cached.report_demand,
            report_supply: cached.report_supply,
            report_next_move: cached.report_next_move,
            cached: true,
            model_id: cached.model_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ─── Pull the city row ───────────────────────────────────────────────
    const { data: city, error: cityErr } = await supabase
      .from("us_cities_scored")
      .select("*")
      .eq("id", cityId)
      .maybeSingle();
    if (cityErr || !city) {
      return new Response(JSON.stringify({ error: "city not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const composite = Math.round(num(context?.total_score) ?? num(city.composite_score_default) ?? 0);
    const pillarDemand = Math.round(num(context?.pillars?.demand) ?? num(city.score_demand) ?? 0);
    const pillarTam = Math.round(num(context?.pillars?.tam_teachers) ?? num(city.score_tam_teachers) ?? 0);
    const pillarOpp = Math.round(num(context?.pillars?.competitive_opportunity) ?? num(city.score_csi) ?? 0);
    const tier = typeof context?.tier === "string"
      ? context.tier.replace(/^Tier\s+/i, "")
      : tierFromScore(composite);

    // ─── Universe pull for percentiles + reference cities (Phase A) ─────
    // One query, all scored cities, only the columns we need. Small enough
    // (<2k rows) to compute percentiles in-memory here.
    const universeCols = [
      "id",
      "city_name",
      "state_abbr",
      "population",
      "csi_saturation_category",
      "csi_confidence",
      "affluent_families_effective_threshold",
      "affluent_families_snapped_bracket",
      ...PCTL_FIELDS,
    ];
    const { data: universeRows } = await supabase
      .from("us_cities_scored")
      .select(universeCols.join(","));

    const rows = (universeRows ?? []) as ScoredRow[];
    const universe: Record<string, number[]> = {};
    for (const f of PCTL_FIELDS) {
      universe[f] = rows
        .map((r) => num(r[f]))
        .filter((n): n is number => n != null);
    }

    const referenceCityRows = REFERENCE_CITIES.map((ref) => {
      const match = rows.find(
        (r) =>
          r.city_name?.toLowerCase() === ref.name.toLowerCase() &&
          r.state_abbr === ref.state,
      );
      if (!match) return { city: `${ref.name}, ${ref.state}`, available: false };
      return {
        city: `${ref.name}, ${ref.state}`,
        available: true,
        composite_score: Math.round(num(match["composite_score_default"]) ?? 0),
        signals: buildSignalBlock(match, universe),
        flags: collectFlags(match),
      };
    });

    const signalsDetailed = buildSignalBlock(city as ScoredRow, universe);
    const flags = collectFlags(city as ScoredRow);

    const payload = {
      city: city.city_name,
      state: city.state_name,
      state_abbr: city.state_abbr,
      metro: city.metro_area ?? null,
      composite_score: composite,
      tier: `Tier ${tier}`,
      pillars: {
        demand: pillarDemand,
        tam_teachers: pillarTam,
        competitive_opportunity: pillarOpp,
      },
      // v1 prompt still reads `signals` — keep this exactly as it was so
      // cached output does not change until the prompt is bumped to v2.
      signals: context?.signals?.length
        ? context.signals
        : {
            "Children ages 5–12": fmtInt(num(city.children_5_12)),
            "Median household income": fmtUSD(num(city.median_household_income)),
            "Dual-income household share": fmtPct(num(city.dual_working_families_pct)),
            "Adults with bachelor's degree or higher": fmtPct(num(city.college_degree_pct)),
            "Public elementary teachers": fmtInt(num(city.public_elementary_teacher_count)),
            "Public elementary schools": fmtInt(num(city.public_elementary_count)),
            "Private and charter elementary schools": fmtInt(
              (num(city.private_elementary_count) ?? 0) +
                (num(city.charter_elementary_count) ?? 0),
            ),
            "Public elementary enrollment": fmtInt(num(city.public_elementary_enrollment)),
            "Cost-of-living adjusted salary index": num(city.col_salary_index)?.toFixed(2) ?? "n/a",
            "Average elementary teacher salary": fmtUSD(num(city.avg_elementary_teacher_salary_usd)),
            "National brand competitor count (weighted)":
              num(city.csi_national_brand_count_weighted)?.toFixed(1) ?? "n/a",
            "Local camp / provider count": fmtInt(num(city.csi_local_provider_estimate)),
            "Competitive saturation category": city.csi_saturation_category ?? "n/a",
            "Demand-adjusted addressable market": fmtInt(num(city.csi_demand_adjusted_market)),
          },
      // New fields (Phase A) — the v1 prompt does not reference these,
      // so their addition to the payload does not change model output yet.
      // The v2 prompt (Phase B) will read from them.
      universe_size: rows.length,
      signals_detailed: signalsDetailed,
      flags,
      reference_cities: referenceCityRows,
    };

    // Phase A verification log — one line, remove after Phase B ships.
    console.log(
      "[city-analyst] phase-a payload enriched",
      JSON.stringify({
        city: `${city.city_name}, ${city.state_abbr}`,
        universe_size: rows.length,
        flags,
        reference_cities_found: referenceCityRows.filter((r) => r.available).map((r) => r.city),
        sample_percentiles: {
          children_5_12: signalsDetailed.demand.children_5_12.percentile,
          affluent_families_count: signalsDetailed.demand.affluent_families.count_percentile,
          teacher_salary: signalsDetailed.supply.teacher_salary.percentile,
        },
      }),
    );




    const systemPrompt = `${KB_FULL_CONTEXT}

---

# Your job RIGHT NOW

You are CityAnalyst. Produce TWO artifacts for the city in the input
payload, returned as a single tool call to \`emit_city_narrative\`:

1. **executive_summary** — ONE tight paragraph, 90–130 words, partner-
   meeting tone. Lead with the verdict, name the two most important
   signals by number, end with the recommended next move.

2. **report_snapshot / report_demand / report_supply / report_next_move**
   — four sections of the longer Market Research Report, 150–230 words
   each, formatted as plain prose (no markdown headers inside the
   sections themselves — the UI will render the section titles).

Voice & number rules apply. Every figure you cite must appear verbatim
in the payload below. If a value is "n/a", say the data is missing for
that signal — do not invent.

HARD FORMATTING RULES (violation = unusable output):
- NEVER write raw database field names, snake_case identifiers, or
  developer-style keys (e.g. "csi_national_brand_count_weighted",
  "col_salary_index", "public_elementary_enrollment"). Always use the
  plain-English label from the payload, or rephrase naturally.
- ALL integers ≥ 1,000 must include thousands separators (write
  "27,039" not "27039", "24,297" not "24297").
- Currency must include the dollar sign and commas ("$64,250").
- Percentages must include the % sign.
- Use the composite score, tier, and pillar scores EXACTLY as given —
  do not recompute or round differently.
- Write for a franchise recruiting partner (Kaylie & Sam). Confident,
  specific, no hedging, no developer jargon.

# Input payload
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`
`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                "Generate the executive summary and the four report sections for this city now.",
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_city_narrative",
                description: "Return the analyst write-up for this city.",
                parameters: {
                  type: "object",
                  properties: {
                    executive_summary: { type: "string" },
                    report_snapshot: { type: "string" },
                    report_demand: { type: "string" },
                    report_supply: { type: "string" },
                    report_next_move: { type: "string" },
                  },
                  required: [
                    "executive_summary",
                    "report_snapshot",
                    "report_demand",
                    "report_supply",
                    "report_next_move",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "emit_city_narrative" },
          },
        }),
      },
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      const message =
        aiResp.status === 429
          ? "Rate limits exceeded, please try again later."
          : aiResp.status === 402
            ? "Lovable AI credits exhausted — add credits in workspace settings."
            : "AI gateway error";
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "model did not return narrative" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);

    // ─── Persist cache row ───────────────────────────────────────────────
    await supabase.from("city_narratives").upsert(
      {
        city_id: cityId,
        weights_hash: weightsHash,
        model_id: model,
        prompt_version: PROMPT_VERSION,
        executive_summary: args.executive_summary,
        report_snapshot: args.report_snapshot,
        report_demand: args.report_demand,
        report_supply: args.report_supply,
        report_next_move: args.report_next_move,
        input_payload: payload,
      },
      { onConflict: "city_id,weights_hash,model_id,prompt_version" },
    );

    return new Response(
      JSON.stringify({
        executive_summary: args.executive_summary,
        report_snapshot: args.report_snapshot,
        report_demand: args.report_demand,
        report_supply: args.report_supply,
        report_next_move: args.report_next_move,
        cached: false,
        model_id: model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("city-analyst error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
