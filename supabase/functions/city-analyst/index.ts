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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cityId, weightsHash = "default", force = false, model: modelOverride } =
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

    const composite = Math.round(num(city.composite_score_default) ?? 0);
    const pillarDemand = Math.round(num(city.score_demand) ?? 0);
    const pillarTam = Math.round(num(city.score_tam_teachers) ?? 0);
    const pillarOpp = Math.round(num(city.score_csi) ?? 0);
    const tier = tierFromScore(composite);

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
      signals: {
        children_5_12: fmtInt(num(city.children_5_12)),
        median_household_income: fmtUSD(num(city.median_household_income)),
        dual_income_household_pct: fmtPct(num(city.dual_working_families_pct)),
        education_bachelors_plus_pct: fmtPct(num(city.college_degree_pct)),
        public_elementary_teacher_count: fmtInt(
          num(city.public_elementary_teacher_count),
        ),
        public_elementary_school_count: fmtInt(num(city.public_elementary_count)),
        private_charter_school_count: fmtInt(
          (num(city.private_elementary_count) ?? 0) +
            (num(city.charter_elementary_count) ?? 0),
        ),
        public_elementary_enrollment: fmtInt(num(city.public_elementary_enrollment)),
        col_salary_index: num(city.col_salary_index)?.toFixed(2) ?? "n/a",
        avg_elementary_teacher_salary_usd: fmtUSD(
          num(city.avg_elementary_teacher_salary_usd),
        ),
        csi_national_brand_count_weighted:
          num(city.csi_national_brand_count_weighted)?.toFixed(1) ?? "n/a",
        csi_local_camp_estimate:
          num(city.csi_local_provider_estimate)?.toFixed(0) ?? "n/a",
        csi_saturation_category: city.csi_saturation_category ?? "n/a",
        csi_demand_adjusted_market:
          num(city.csi_demand_adjusted_market)?.toFixed(0) ?? "n/a",
      },
    };

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
