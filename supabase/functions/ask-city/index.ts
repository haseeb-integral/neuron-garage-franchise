// ============================================================================
// ask-city — AskCity AI agent. Streaming SSE chat that answers questions
// about a specific city and can compare it to any of the other 816 cities.
//
// Tools exposed to the model:
//   - get_city_brief(city_id_or_name)
//   - get_city_signals(city_id_or_name)
//   - compare_cities(city_a, city_b)
//   - search_cities({ tier?, state?, min_score?, min_demand?, ... })
//
// Input:  { cityId, messages: [{role, content}] }
// Output: streaming SSE chunks (OpenAI-style) — frontend reads token by token.
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { KB_FULL_CONTEXT } from "../_shared/knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function tierFromScore(s: number): "A" | "B" | "C" | "D" {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 50) return "C";
  return "D";
}

async function resolveCity(supabase: SupabaseClient, ref: string) {
  // Try as UUID first
  if (/^[0-9a-f]{8}-/i.test(ref)) {
    const { data } = await supabase
      .from("us_cities_scored")
      .select("*")
      .eq("id", ref)
      .maybeSingle();
    if (data) return data;
  }
  // Try "City, ST" or just "City"
  const parts = ref.split(",").map((s) => s.trim()).filter(Boolean);
  let q = supabase.from("us_cities_scored").select("*").ilike("city_name", parts[0]);
  if (parts[1]) {
    q = q.or(`state_abbr.ilike.${parts[1]},state_name.ilike.${parts[1]}`);
  }
  const { data } = await q.order("population", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

function briefForCity(city: any) {
  const composite = Math.round(num(city.composite_score_default) ?? 0);
  return {
    city_id: city.id,
    name: `${city.city_name}, ${city.state_abbr}`,
    state: city.state_name,
    metro: city.metro_area,
    composite_score: composite,
    tier: `Tier ${tierFromScore(composite)}`,
    pillars: {
      demand: Math.round(num(city.score_demand) ?? 0),
      tam_teachers: Math.round(num(city.score_tam_teachers) ?? 0),
      competitive_opportunity: Math.round(num(city.score_csi) ?? 0),
    },
    signals: {
      children_5_12: num(city.children_5_12),
      median_household_income: num(city.median_household_income),
      dual_income_household_pct: num(city.dual_working_families_pct),
      education_bachelors_plus_pct: num(city.college_degree_pct),
      public_elementary_teacher_count: num(city.public_elementary_teacher_count),
      public_elementary_school_count: num(city.public_elementary_count),
      public_elementary_enrollment: num(city.public_elementary_enrollment),
      avg_elementary_teacher_salary_usd: num(city.avg_elementary_teacher_salary_usd),
      col_salary_index: num(city.col_salary_index),
      csi_national_brand_count_weighted: num(city.csi_national_brand_count_weighted),
      csi_local_camp_estimate: num(city.csi_local_provider_estimate),
      csi_saturation_category: city.csi_saturation_category,
      csi_demand_adjusted_market: num(city.csi_demand_adjusted_market),
    },
  };
}

async function runTool(
  supabase: SupabaseClient,
  name: string,
  args: any,
): Promise<unknown> {
  if (name === "get_city_brief" || name === "get_city_signals") {
    const city = await resolveCity(supabase, args.city);
    if (!city) return { error: `city not found: ${args.city}` };
    return briefForCity(city);
  }
  if (name === "compare_cities") {
    const [a, b] = await Promise.all([
      resolveCity(supabase, args.city_a),
      resolveCity(supabase, args.city_b),
    ]);
    if (!a || !b) return { error: "one or both cities not found" };
    const ba = briefForCity(a);
    const bb = briefForCity(b);
    return {
      city_a: ba,
      city_b: bb,
      deltas: {
        composite: ba.composite_score - bb.composite_score,
        demand: ba.pillars.demand - bb.pillars.demand,
        tam_teachers: ba.pillars.tam_teachers - bb.pillars.tam_teachers,
        competitive_opportunity:
          ba.pillars.competitive_opportunity - bb.pillars.competitive_opportunity,
      },
    };
  }
  if (name === "search_cities") {
    let q = supabase.from("us_cities_scored").select(
      "id,city_name,state_abbr,metro_area,composite_score_default,score_demand,score_tam_teachers,score_csi",
    );
    if (args.state) q = q.ilike("state_abbr", args.state);
    if (typeof args.min_score === "number") {
      q = q.gte("composite_score_default", args.min_score);
    }
    if (typeof args.min_demand === "number") {
      q = q.gte("score_demand", args.min_demand);
    }
    if (typeof args.min_tam === "number") {
      q = q.gte("score_tam_teachers", args.min_tam);
    }
    if (typeof args.min_opportunity === "number") {
      q = q.gte("score_csi", args.min_opportunity);
    }
    if (args.tier) {
      const tierMap: Record<string, [number, number]> = {
        A: [90, 200],
        B: [80, 89],
        C: [50, 79],
        D: [0, 49],
      };
      const range = tierMap[String(args.tier).toUpperCase()];
      if (range) {
        q = q
          .gte("composite_score_default", range[0])
          .lte("composite_score_default", range[1]);
      }
    }
    const { data } = await q
      .order("composite_score_default", { ascending: false })
      .limit(args.limit ?? 15);
    return { results: data ?? [] };
  }
  return { error: `unknown tool: ${name}` };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_city_brief",
      description:
        "Get the full context bundle (score, tier, pillars, signals) for any city. Use this whenever you need facts about a city other than the focus city.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City id (UUID) OR human-readable 'City, ST' name.",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_cities",
      description:
        "Get a pre-diffed comparison of two cities. Use this whenever the user implies a comparison.",
      parameters: {
        type: "object",
        properties: {
          city_a: { type: "string" },
          city_b: { type: "string" },
        },
        required: ["city_a", "city_b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_cities",
      description:
        "Filter the 817-city universe by tier, state, or minimum pillar scores. Returns up to ~15 cities ranked by composite.",
      parameters: {
        type: "object",
        properties: {
          tier: { type: "string", enum: ["A", "B", "C", "D"] },
          state: { type: "string", description: "Two-letter state abbreviation" },
          min_score: { type: "number" },
          min_demand: { type: "number" },
          min_tam: { type: "number" },
          min_opportunity: { type: "number" },
          limit: { type: "number" },
        },
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cityId, messages = [] } = await req.json();
    if (!cityId) {
      return new Response(JSON.stringify({ error: "cityId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: city } = await supabase
      .from("us_cities_scored")
      .select("*")
      .eq("id", cityId)
      .maybeSingle();
    if (!city) {
      return new Response(JSON.stringify({ error: "city not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const focusBrief = briefForCity(city);

    // Try to attach the cached analyst narrative if it exists
    const { data: narrative } = await supabase
      .from("city_narratives")
      .select(
        "executive_summary,report_snapshot,report_demand,report_supply,report_next_move",
      )
      .eq("city_id", cityId)
      .eq("weights_hash", "default")
      .maybeSingle();

    const systemPrompt = `${KB_FULL_CONTEXT}

---

# Your job RIGHT NOW

You are **AskCity**, an analyst chat agent helping the Neuron Garage
franchise recruiting team understand a specific market. Voice and number
rules from the knowledge base above apply at all times.

## Focus city (always loaded)
\`\`\`json
${JSON.stringify(focusBrief, null, 2)}
\`\`\`

${narrative ? `## Pre-written analyst report on the focus city
**Exec summary:** ${narrative.executive_summary}

**Market snapshot:** ${narrative.report_snapshot}

**Demand-side read:** ${narrative.report_demand}

**Supply & competitive read:** ${narrative.report_supply}

**Recommended next move:** ${narrative.report_next_move}
` : ""}

## How to answer
- For any question about a city OTHER than the focus city, you MUST call
  \`get_city_brief\` first. Never freelance facts about other cities.
- For comparisons, call \`compare_cities\` — do not eyeball it from
  memory.
- For "what are some alternatives?" style questions, call
  \`search_cities\` with sensible filters.
- Keep answers tight: 2–4 short paragraphs unless asked for depth. Use
  markdown — bold for verdicts, tables for comparisons.
- If the user asks something the data can't answer (real estate, specific
  operator interest, regulations), say so plainly.
`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Tool loop (non-streaming) → final streaming completion ─────────
    const convo: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    for (let turn = 0; turn < 4; turn++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: convo,
          tools: TOOLS,
        }),
      });

      if (!resp.ok) {
        const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
        const message =
          resp.status === 429
            ? "Rate limits exceeded, please try again later."
            : resp.status === 402
              ? "Lovable AI credits exhausted — add credits in workspace settings."
              : "AI gateway error";
        return new Response(JSON.stringify({ error: message }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const j = await resp.json();
      const msg = j?.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // Final answer — re-issue as streaming so UI can token-stream it.
        convo.push({
          role: "user",
          content:
            "Now reply to the user with that answer, formatted in markdown as described.",
        });
        break;
      }

      convo.push(msg);
      for (const call of toolCalls) {
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // ignore
        }
        const toolResult = await runTool(supabase, call.function.name, args);
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // ─── Final streaming completion ──────────────────────────────────────
    const finalResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: convo,
          stream: true,
        }),
      },
    );

    if (!finalResp.ok || !finalResp.body) {
      return new Response(
        JSON.stringify({ error: "stream failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(finalResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-city error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
