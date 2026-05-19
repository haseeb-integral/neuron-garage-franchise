// AI-powered city search assistant.
// Takes a natural-language query, returns structured filters + weight nudges +
// reasoning chain. Persists each turn to ai_query_history so the UI can show a
// Google-style history dropdown and multi-turn refinement.
//
// Hard rules (per AGENTS.md):
//  - AI never invents metric/category keys. Anything unknown is stripped server-side.
//  - AI does not modify scoring math (Rule: Sam only). It nudges weights as deltas.
//  - Multi-turn capped at 6 turns to keep gateway cost predictable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_CATEGORIES = [
  "demand",
  "pricingPower",
  "competitiveLandscape",
  "franchiseeSupply",
  "easeOfOperations",
  "parentMindset",
] as const;

const VALID_TIERS = ["A", "B", "C", "D"];

const SYSTEM_PROMPT = `You are the Neuron Garage City Search assistant. Help franchise scouts find the best US cities for a kids' STEM camp franchise.

You have access to ~960 pre-scored US cities. Each city has:
- A default composite score (0-100) and tier (A best, D worst)
- Six category scores: demand, pricingPower, competitiveLandscape, franchiseeSupply, easeOfOperations, parentMindset
- Filterable attributes: state (full name like "Texas"), tier (A/B/C/D), composite score

When the user asks a question:
1) Translate intent into FILTERS (state, minScore 0-100, tier) when appropriate.
2) Suggest WEIGHT ADJUSTMENTS to the six categories as integer deltas (-20..+20). Positive = make this category matter more.
3) Write a 1-2 sentence plain-English SUMMARY answering the user's question.
4) Provide 3-6 short REASONING STEPS showing how you decided.
5) Flag any DATA GAPS — metrics the user might expect that aren't fully populated yet (e.g. Google Trends data is not yet live; weather covers ~506/960 cities; GreatSchools quality data is not yet wired).

Be concise. Never invent cities or categories. Only use the six categories listed above. If the user asks for something you cannot do (e.g. "rank by AP test scores"), say so honestly in summary + dataGaps and return empty filter/weight adjustments.

Respond ONLY with a valid JSON object matching this exact shape (no markdown, no prose):
{
  "summary": "string",
  "filters": { "state": "string | null", "minScore": "number | null", "tier": "A|B|C|D | null" },
  "weightAdjustments": { "demand": 0, "pricingPower": 0, "competitiveLandscape": 0, "franchiseeSupply": 0, "easeOfOperations": 0, "parentMindset": 0 },
  "reasoning_steps": ["string", "..."],
  "dataGaps": ["string", "..."]
}`;

function sanitizeResponse(raw: any) {
  const out = {
    summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 600) : "",
    filters: {
      state: typeof raw?.filters?.state === "string" ? raw.filters.state : null,
      minScore:
        typeof raw?.filters?.minScore === "number"
          ? Math.max(0, Math.min(100, Math.round(raw.filters.minScore)))
          : null,
      tier:
        typeof raw?.filters?.tier === "string" &&
        VALID_TIERS.includes(raw.filters.tier)
          ? raw.filters.tier
          : null,
    },
    weightAdjustments: {} as Record<string, number>,
    reasoning_steps: Array.isArray(raw?.reasoning_steps)
      ? raw.reasoning_steps
          .filter((s: any) => typeof s === "string")
          .slice(0, 6)
          .map((s: string) => s.slice(0, 240))
      : [],
    dataGaps: Array.isArray(raw?.dataGaps)
      ? raw.dataGaps
          .filter((s: any) => typeof s === "string")
          .slice(0, 5)
          .map((s: string) => s.slice(0, 200))
      : [],
  };

  for (const cat of VALID_CATEGORIES) {
    const v = raw?.weightAdjustments?.[cat];
    out.weightAdjustments[cat] =
      typeof v === "number" ? Math.max(-20, Math.min(20, Math.round(v))) : 0;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Explicitly validate the JWT against auth — works regardless of how
    // the global headers are forwarded by the edge runtime.
    const { data: userData, error: userErr } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null }, error: null } as any;
    const userId = userData?.user?.id;
    if (!userId) {
      console.error("ai-city-query auth failed", { hasToken: !!token, userErr });
      return new Response(JSON.stringify({ error: "Not authenticated", detail: userErr?.message ?? "missing or invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const threadId: string | undefined = body.threadId;
    const previousTurns: Array<{ query: string; response: any }> = Array.isArray(
      body.previousTurns,
    )
      ? body.previousTurns.slice(-5)
      : [];

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (query.length > 500) {
      return new Response(JSON.stringify({ error: "Query too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (previousTurns.length >= 6) {
      return new Response(
        JSON.stringify({
          error: "Conversation limit reached. Start a new search.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    for (const turn of previousTurns) {
      messages.push({ role: "user", content: turn.query });
      messages.push({
        role: "assistant",
        content: JSON.stringify(turn.response ?? {}),
      });
    }
    messages.push({ role: "user", content: query });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({
          error: "AI credits exhausted. Add credits in Lovable Cloud settings.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any = {};
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Failed to parse AI JSON", e, content);
      return new Response(
        JSON.stringify({ error: "AI returned malformed response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sanitized = sanitizeResponse(parsed);
    const finalThreadId = threadId ?? crypto.randomUUID();

    try {
      await supabase.from("ai_query_history").insert({
        user_id: userId,
        thread_id: finalThreadId,
        query,
        response: sanitized,
      });
    } catch (e) {
      console.warn("ai_query_history insert failed", e);
    }

    return new Response(
      JSON.stringify({ threadId: finalThreadId, result: sanitized }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ai-city-query error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
