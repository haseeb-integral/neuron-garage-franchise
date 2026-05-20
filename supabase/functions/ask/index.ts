// Per-screen read-only "Ask" assistant.
// Phase 1: Email Outreach only. Reusable foundation — pass `screen` to switch
// system prompt + tool registry. No writes. Tool-call loop, max 4 iterations.
//
// Hard rules (AGENTS.md):
//  - Read-only. No mutations.
//  - "Show the math": every answer must return the tool calls used (toolCalls[]).
//  - Cheap default model: google/gemini-2.5-flash via Lovable AI Gateway.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_TOOL_ITERATIONS = 4;
const ROW_CAP = 25; // hard cap on rows returned to the model per tool call

// ============================================================================
// Per-screen system prompts
// ============================================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  email: `You are the Neuron Garage Email Outreach assistant. You help 3 internal users (Kaylie, Sam, Haseeb) understand what is happening on the Email Outreach screen.

You are READ-ONLY. You can answer questions and explain data. You cannot promote, snooze, suppress, send, or change anything — if asked, say the user should click the button in the UI.

You have tools to read:
- outreach_queue (state: queued/assigned/sending/sent/failed/promoted/snoozed/suppressed)
- reply triage events from smartlead_events (event_type='reply', with reply_intent: positive/neutral/negative/referral/auto_reply)
- SmartLead campaigns (cached metadata + stats)
- prospect_batches (status: pending/approved/pushed)
- candidates (the pipeline — to check if a lead has been promoted)
- teacher_prospects lookup by name/email

Rules:
1. Always use tools to get real numbers. Never guess counts.
2. Cite which tool you used in your final answer (briefly, e.g. "Based on the outreach queue…").
3. Be concise. Plain English. Markdown tables OK for lists. No filler.
4. If a tool returns 0 rows, say so plainly.
5. Today's date in queries should use the user's local sense of "today" — when filtering by date, use ISO dates and prefer last 24h / last 7d windows unless the user specifies.
6. If asked to do something that requires a write, refuse politely and point to the UI control.`,
};

// ============================================================================
// Tool definitions (OpenAI tool-call shape)
// ============================================================================

const EMAIL_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_outreach_queue",
      description:
        "Count and sample rows from outreach_queue. Use for questions about how many leads are queued/sent/promoted/snoozed/etc.",
      parameters: {
        type: "object",
        properties: {
          state: {
            type: "string",
            enum: ["queued", "assigned", "sending", "sent", "failed", "promoted", "snoozed", "suppressed", "any"],
            description: "Filter by state. 'any' for all.",
          },
          campaign_id: { type: "string", description: "Optional SmartLead campaign id filter." },
          since_iso: { type: "string", description: "Optional ISO timestamp; only rows updated at/after this." },
          limit: { type: "number", description: "Max rows to return (1-25). Default 10." },
        },
        required: ["state"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_reply_triage",
      description:
        "Count and sample reply events from smartlead_events. Use for questions about replies, sentiment, positive/negative leads, who replied.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["positive", "neutral", "negative", "referral", "auto_reply", "any"],
            description: "Filter by reply intent. 'any' for all.",
          },
          since_iso: { type: "string", description: "Optional ISO timestamp; only events received at/after this." },
          campaign_id: { type: "string", description: "Optional SmartLead campaign id filter." },
          limit: { type: "number", description: "Max rows to return (1-25). Default 10." },
        },
        required: ["intent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_campaigns",
      description: "List SmartLead campaigns with name, status, created_at. Use for questions about campaigns.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Optional status filter (e.g. 'active', 'paused')." },
          limit: { type: "number", description: "Max rows to return (1-25). Default 25." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_prospect_batches",
      description: "List prospect batches with status (pending/approved/pushed), counts, city. Use for batch-related questions.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Optional status filter." },
          limit: { type: "number", description: "Max rows to return (1-25). Default 15." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_lead",
      description:
        "Look up a teacher prospect by name or email. Returns their profile, queue state(s), and whether they're already a candidate in the pipeline.",
      parameters: {
        type: "object",
        properties: {
          name_or_email: { type: "string", description: "Partial name or email to search." },
        },
        required: ["name_or_email"],
      },
    },
  },
];

const TOOL_REGISTRY: Record<string, typeof EMAIL_TOOLS> = { email: EMAIL_TOOLS };

// ============================================================================
// Tool implementations
// ============================================================================

function cap(n: unknown, def: number): number {
  const v = typeof n === "number" ? n : def;
  return Math.max(1, Math.min(ROW_CAP, Math.floor(v)));
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
): Promise<unknown> {
  switch (name) {
    case "query_outreach_queue": {
      const state = String(args.state ?? "any");
      const limit = cap(args.limit, 10);
      let q = supabase.from("outreach_queue").select(
        "id, teacher_prospect_id, campaign_id, state, added_at, updated_at, smartlead_lead_id, last_error, snoozed_until, notes",
        { count: "exact" },
      );
      if (state !== "any") q = q.eq("state", state);
      if (args.campaign_id) q = q.eq("campaign_id", String(args.campaign_id));
      if (args.since_iso) q = q.gte("updated_at", String(args.since_iso));
      q = q.order("updated_at", { ascending: false }).limit(limit);
      const { data, error, count } = await q;
      if (error) return { error: error.message };

      // Enrich with prospect name/email
      const ids = (data ?? []).map((r) => r.teacher_prospect_id).filter(Boolean);
      let prospects: Record<string, { name?: string; email?: string; city?: string; school?: string }> = {};
      if (ids.length) {
        const { data: ps } = await supabase
          .from("teacher_prospects")
          .select("id, name, email, city, school")
          .in("id", ids);
        for (const p of ps ?? []) prospects[String(p.id)] = p;
      }
      const rows = (data ?? []).map((r) => ({
        ...r,
        prospect: prospects[String(r.teacher_prospect_id)] ?? null,
      }));
      return { total_count: count ?? rows.length, returned: rows.length, rows };
    }
    case "query_reply_triage": {
      const intent = String(args.intent ?? "any");
      const limit = cap(args.limit, 10);
      let q = supabase.from("smartlead_events").select(
        "id, event_type, campaign_id, lead_id, lead_email, reply_message, reply_intent, reply_intent_reason, received_at",
        { count: "exact" },
      ).eq("event_type", "reply");
      if (intent !== "any") q = q.eq("reply_intent", intent);
      if (args.since_iso) q = q.gte("received_at", String(args.since_iso));
      if (args.campaign_id) q = q.eq("campaign_id", String(args.campaign_id));
      q = q.order("received_at", { ascending: false }).limit(limit);
      const { data, error, count } = await q;
      if (error) return { error: error.message };
      const rows = (data ?? []).map((r) => ({
        ...r,
        reply_message: r.reply_message ? String(r.reply_message).slice(0, 300) : null,
      }));
      return { total_count: count ?? rows.length, returned: rows.length, rows };
    }
    case "query_campaigns": {
      const limit = cap(args.limit, 25);
      let q = supabase.from("campaign_cache").select("*").order("created_at", { ascending: false }).limit(limit);
      if (args.status) q = q.eq("status", String(args.status));
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { returned: data?.length ?? 0, rows: data ?? [] };
    }
    case "query_prospect_batches": {
      const limit = cap(args.limit, 15);
      let q = supabase.from("prospect_batches").select("*").order("created_at", { ascending: false }).limit(limit);
      if (args.status) q = q.eq("status", String(args.status));
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { returned: data?.length ?? 0, rows: data ?? [] };
    }
    case "find_lead": {
      const term = String(args.name_or_email ?? "").trim();
      if (!term) return { error: "name_or_email required" };
      const pattern = `%${term}%`;
      const { data: ps, error } = await supabase
        .from("teacher_prospects")
        .select("id, name, email, city, state, school, verification_status, enrichment_source")
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5);
      if (error) return { error: error.message };
      const prospects = ps ?? [];
      if (!prospects.length) return { found: 0, prospects: [] };
      const ids = prospects.map((p) => p.id);
      const { data: queueRows } = await supabase
        .from("outreach_queue")
        .select("teacher_prospect_id, campaign_id, state, updated_at, last_error, snoozed_until")
        .in("teacher_prospect_id", ids);
      const { data: cands } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, email, current_stage, fit_score, fit_tag")
        .in("email", prospects.map((p) => p.email).filter(Boolean) as string[]);
      return {
        found: prospects.length,
        prospects: prospects.map((p) => ({
          ...p,
          queue: (queueRows ?? []).filter((q) => q.teacher_prospect_id === p.id),
          pipeline_candidate: (cands ?? []).find((c) => c.email === p.email) ?? null,
        })),
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const screen = String(body.screen ?? "email");
    const question = String(body.question ?? "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    if (!question) {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const systemPrompt = SYSTEM_PROMPTS[screen];
    const tools = TOOL_REGISTRY[screen];
    if (!systemPrompt || !tools) {
      return new Response(JSON.stringify({ error: `Unknown screen: ${screen}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Conversation state
    type Msg = { role: string; content?: string | null; tool_call_id?: string; tool_calls?: unknown[]; name?: string };
    const today = new Date().toISOString();
    const messages: Msg[] = [
      { role: "system", content: `${systemPrompt}\n\nCurrent timestamp (ISO): ${today}` },
      ...history,
      { role: "user", content: question },
    ];
    const toolCallsTrace: Array<{ name: string; args: unknown; result: unknown }> = [];

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto" }),
      });
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!aiResp.ok) {
        const text = await aiResp.text();
        return new Response(JSON.stringify({ error: `AI gateway error: ${aiResp.status} ${text.slice(0, 200)}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiJson = await aiResp.json();
      const choice = aiJson?.choices?.[0]?.message;
      if (!choice) {
        return new Response(JSON.stringify({ error: "Empty AI response" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // No tool calls → final answer
      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({
            answer: choice.content ?? "",
            toolCalls: toolCallsTrace,
            model: MODEL,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Execute tools
      messages.push({ role: "assistant", content: choice.content ?? null, tool_calls: choice.tool_calls });
      for (const tc of choice.tool_calls) {
        const name = tc.function?.name;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch { /* ignore */ }
        const result = await runTool(name, parsedArgs, supabase);
        toolCallsTrace.push({ name, args: parsedArgs, result });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: JSON.stringify(result).slice(0, 12_000),
        });
      }
    }

    // Hit iteration cap
    return new Response(
      JSON.stringify({
        answer: "I gathered some data but couldn't finish reasoning in time. Try a more specific question.",
        toolCalls: toolCallsTrace,
        model: MODEL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
