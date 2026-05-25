// ============================================================================
// neuron-ai — Global Ask AI assistant (v2)
// ============================================================================
// v2 upgrades:
//   - Real data lookups: the model can call query_cities / explain_city /
//     query_candidates / query_campaigns mid-turn, get results, then answer.
//   - Tool-loop: up to 3 tool calls per turn before final answer.
//   - Thread persistence via existing ai_threads / ai_thread_messages tables.
//   - Self-explaining failures (the AI re-frames tool errors as helpful prose).
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { APP_KNOWLEDGE, SCREEN_KNOWLEDGE } from "../_shared/appKnowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_TURNS = 12;
const MAX_TOOL_HOPS = 3;

type Role = "user" | "assistant" | "system" | "tool";
type ChatMsg = { role: Role; content: string; tool_call_id?: string; name?: string; tool_calls?: unknown[] };

type ScreenState = Record<string, unknown> | null;
type Context = {
  route: string;
  screenState: ScreenState;
  user: { id: string; email?: string; role: string };
};

function buildSystemPrompt(ctx: Context): string {
  const screenBlock = SCREEN_KNOWLEDGE[ctx.route] ?? "";
  return `You are Neuron AI — the in-app copilot for the Neuron Garage franchise-scouting console. Speak in plain English; never mention internal tech (Supabase, edge functions, Postgres, RLS). Refer to the backend as "the system".

YOU HAVE LIVE DATA. You can look things up before answering. ALWAYS prefer calling a lookup tool over guessing or saying you can't.

VOICE
- Warm, direct, never patronizing. No emojis.
- Never claim lived experience. Use "the data shows", "the signals indicate".
- Never invent cities, teachers, candidates, or numbers. If a lookup returns empty, say so.

HOW TO RESPOND — TWO PHASES
PHASE 1 (lookup): If the question needs data, call one of the LOOKUP TOOLS
(query_cities, explain_city, query_candidates, query_campaigns, query_capabilities).
You may chain up to 3 lookups. Tool results come back; you then answer.

PHASE 2 (final answer): Call EXACTLY ONE of:
  1) answer — factual/explainer with the data you just fetched. 2-6 sentences
     with concrete numbers. Markdown bullets fine.
  2) propose_action — for anything that would CHANGE the screen or write data.
     action_type:
       - navigate                → payload: { route }
       - apply_screen_state      → payload: { route, apply }
       - add_to_watchlist        → payload: { cityId }
       - remove_from_watchlist   → payload: { cityId }
       - change_candidate_stage  → payload: { candidateId, toStage }
     summary: the real INFORMATION ANSWER (2-6 sentences with the data you found).
       Do NOT write "Navigating..." or "Applying..." — write a useful answer.
     preview_text: ONE short sentence summarizing the action for the Confirm card.
  3) clarify — when intent is ambiguous.
     question: ONE short follow-up. chip_suggestions: 2-3 short answer chips.

HARD RULES
- NEVER set a state filter unless the user named a US state explicitly (e.g. "Texas" or "TX").
  Phrases like "best cities" carry NO state.
- NEVER apply navigation/filters without going through propose_action.
- If a lookup fails, explain plainly what went wrong and what the user can try.

APP KNOWLEDGE
${APP_KNOWLEDGE}

CURRENT ROUTE: ${ctx.route}
USER ROLE: ${ctx.user.role}
${screenBlock}

CURRENT SCREEN STATE (JSON, may be empty):
${JSON.stringify(ctx.screenState ?? {}, null, 2)}
`;
}

const LOOKUP_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_cities",
      description: "Look up cities by tier/state/score/pillar. Returns top N with composite + pillar scores. Use this BEFORE answering any question about 'best cities', 'top markets', or 'cities in X state'.",
      parameters: {
        type: "object",
        properties: {
          state_abbr: { type: "string", description: "Optional 2-letter US state code, e.g. TX." },
          tier: { type: "string", enum: ["A", "B", "C", "D"], description: "Optional quartile filter." },
          min_score: { type: "number", description: "Optional minimum composite score (0-100)." },
          sort_by: {
            type: "string",
            enum: ["composite", "demand", "csi", "tam_teachers", "population"],
            description: "What to sort by. Default composite.",
          },
          limit: { type: "number", description: "Max rows, default 10, hard cap 25." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_city",
      description: "Get full breakdown for a specific city: composite, all 3 pillars, demographics, and data freshness.",
      parameters: {
        type: "object",
        properties: {
          city_name: { type: "string" },
          state_abbr: { type: "string", description: "Required when multiple cities share a name (e.g. Frisco TX vs CO)." },
          city_id: { type: "string", description: "UUID if known — preferred over name." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_candidates",
      description: "Count or list candidates by stage. Use for 'how many in confirmation', 'who's in signing', etc.",
      parameters: {
        type: "object",
        properties: {
          stage: {
            type: "string",
            enum: ["new_lead", "qualified", "discovery", "confirmation", "selection_committee", "signing", "signed"],
          },
          limit: { type: "number", description: "Max rows when listing, default 10." },
          mode: { type: "string", enum: ["count", "list"], description: "Default list." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_campaigns",
      description: "List email campaigns with status. Use for 'active campaigns', 'reply rates'.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "e.g. ACTIVE, PAUSED, COMPLETED." },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_capabilities",
      description: "Return the list of things Neuron AI can do, optionally scoped to the current screen. Use when the user asks 'what can you do', 'help', or '/help'.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["current_screen", "all"], description: "Default all." },
        },
        additionalProperties: false,
      },
    },
  },
];

const FINAL_TOOLS = [
  {
    type: "function",
    function: {
      name: "answer",
      description: "Plain factual or explainer answer. No side effects.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "2-6 sentences. Markdown OK. Include concrete numbers from any lookups you ran." },
          followups: {
            type: "array",
            items: { type: "string" },
            description: "0-3 short natural next questions phrased as the user (first person).",
          },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_action",
      description: "Preview an action (navigation, filter apply, or write). Client shows Confirm card; nothing runs yet.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Real information answer shown in the chat bubble (2-6 sentences, markdown OK)." },
          action_type: {
            type: "string",
            enum: ["navigate", "apply_screen_state", "add_to_watchlist", "remove_from_watchlist", "change_candidate_stage"],
          },
          payload: { type: "object", additionalProperties: true },
          preview_text: { type: "string", description: "Short sentence shown on the Confirm card." },
        },
        required: ["summary", "action_type", "payload", "preview_text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clarify",
      description: "Ask one short follow-up when intent is ambiguous.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          question: { type: "string" },
          chip_suggestions: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 3,
          },
        },
        required: ["summary", "question", "chip_suggestions"],
        additionalProperties: false,
      },
    },
  },
];

// ----------------------------------------------------------------------------
// Lookup tool implementations
// ----------------------------------------------------------------------------
async function runLookup(
  name: string,
  args: Record<string, unknown>,
  supa: SupabaseClient,
  ctx: Context,
): Promise<unknown> {
  try {
    if (name === "query_cities") {
      const limit = Math.min(Number(args.limit ?? 10), 25);
      const sortMap: Record<string, string> = {
        composite: "composite_score_default",
        demand: "score_demand",
        csi: "score_csi",
        tam_teachers: "score_tam_teachers",
        population: "population",
      };
      const sortCol = sortMap[String(args.sort_by ?? "composite")] ?? "composite_score_default";
      let q = supa
        .from("us_cities_scored")
        .select("id, city_name, state_abbr, population, composite_score_default, score_demand, score_csi, score_tam_teachers")
        .order(sortCol, { ascending: false, nullsFirst: false })
        .limit(limit);
      if (args.state_abbr) q = q.eq("state_abbr", String(args.state_abbr).toUpperCase());
      if (typeof args.min_score === "number") q = q.gte("composite_score_default", args.min_score);
      // Tier filter via score buckets: A>=75, B>=60, C>=45, D<45
      if (args.tier === "A") q = q.gte("composite_score_default", 75);
      else if (args.tier === "B") q = q.gte("composite_score_default", 60).lt("composite_score_default", 75);
      else if (args.tier === "C") q = q.gte("composite_score_default", 45).lt("composite_score_default", 60);
      else if (args.tier === "D") q = q.lt("composite_score_default", 45);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { rows: data, count: data?.length ?? 0 };
    }

    if (name === "explain_city") {
      let q = supa
        .from("us_cities_scored")
        .select("id, city_name, state_abbr, state_name, population, children_5_12, median_household_income, college_degree_pct, composite_score_default, score_demand, score_csi, score_tam_teachers, public_school_count, public_elementary_count, csi_saturation_category, csi_national_brand_count_weighted, scored_at")
        .limit(1);
      if (args.city_id) q = q.eq("id", String(args.city_id));
      else if (args.city_name) {
        q = q.ilike("city_name", String(args.city_name));
        if (args.state_abbr) q = q.eq("state_abbr", String(args.state_abbr).toUpperCase());
      } else return { error: "Provide city_name or city_id." };
      const { data, error } = await q;
      if (error) return { error: error.message };
      if (!data || data.length === 0) return { error: "City not found." };
      return { city: data[0] };
    }

    if (name === "query_candidates") {
      const mode = String(args.mode ?? "list");
      if (mode === "count") {
        let q = supa.from("candidates").select("current_stage", { count: "exact", head: true });
        if (args.stage) q = q.eq("current_stage", String(args.stage));
        const { count, error } = await q;
        if (error) return { error: error.message };
        return { count };
      }
      const limit = Math.min(Number(args.limit ?? 10), 25);
      let q = supa
        .from("candidates")
        .select("id, first_name, last_name, city, state, current_stage, fit_score, fit_tag")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (args.stage) q = q.eq("current_stage", String(args.stage));
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { rows: data, count: data?.length ?? 0 };
    }

    if (name === "query_campaigns") {
      const limit = Math.min(Number(args.limit ?? 10), 25);
      let q = supa.from("campaign_cache").select("id, name, status, last_synced").limit(limit);
      if (args.status) q = q.eq("status", String(args.status).toUpperCase());
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { rows: data, count: data?.length ?? 0 };
    }

    if (name === "query_capabilities") {
      const scope = String(args.scope ?? "all");
      const perScreen: Record<string, string[]> = {
        "/city-scoring": [
          "Look up the top cities by score, state, or tier (live data)",
          "Explain why a specific city scores the way it does",
          "Apply filters or open a city — with your confirmation",
          "Add a city to your Watchlist",
        ],
        "/teacher-search": [
          "Open Teacher Search with filters (city, tag, source)",
          "Answer questions about teacher counts in a city",
        ],
        "/email-outreach": [
          "List active campaigns and their status",
          "Explain reply categories and outreach flow",
        ],
        "/candidate-pipeline": [
          "Count or list candidates by stage",
          "Move a candidate to a different stage — with your confirmation",
        ],
      };
      if (scope === "current_screen") {
        return { capabilities: perScreen[ctx.route] ?? ["Answer general questions about this app."] };
      }
      return {
        general: [
          "Find and rank the 817 scored US cities by live data",
          "Explain composite scores and pillar breakdowns",
          "Navigate you to any screen with filters preset (you confirm first)",
          "Manage your Watchlist and candidate pipeline (you confirm writes)",
        ],
        per_screen: perScreen,
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ----------------------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supa: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
    });

    let userId = "guest";
    let userEmail: string | undefined;
    let role = "viewer";
    if (authHeader) {
      try {
        const { data: userData } = await supa.auth.getUser();
        if (userData?.user) {
          userId = userData.user.id;
          userEmail = userData.user.email;
          const { data: roleRows } = await supa.from("user_roles").select("role").eq("user_id", userId);
          if (roleRows && roleRows.length > 0) {
            const roles = roleRows.map((r: { role: string }) => r.role);
            if (roles.includes("admin")) role = "admin";
            else if (roles.includes("manager")) role = "manager";
          }
        }
      } catch (e) {
        console.error("neuron-ai: auth lookup failed", e);
      }
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const messages = Array.isArray(body.messages) ? (body.messages as ChatMsg[]) : [];
    const route = typeof body.route === "string" ? body.route : "/";
    const screenState = (body.screenState ?? null) as ScreenState;
    const threadId = typeof body.threadId === "string" ? body.threadId : null;

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > MAX_TURNS) {
      return new Response(JSON.stringify({ error: `Thread cap reached (${MAX_TURNS} turns). Start a new chat.` }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: Context = { route, screenState, user: { id: userId, email: userEmail, role } };
    const systemPrompt = buildSystemPrompt(ctx);

    // Build conversation. We allow up to MAX_TOOL_HOPS rounds where the model
    // calls a lookup tool, gets results back, then continues.
    const convo: Record<string, unknown>[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const callGateway = async (tools: unknown[], toolChoice: "required" | "auto") => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: convo,
          tools,
          tool_choice: toolChoice,
          temperature: 0.2,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        const status = resp.status;
        if (status === 429) throw new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) throw new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        console.error("AI gateway error", status, text);
        throw new Response(JSON.stringify({ error: "Assistant failed. Please retry." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return resp.json();
    };

    let finalReply: { kind: string; [k: string]: unknown } | null = null;

    for (let hop = 0; hop <= MAX_TOOL_HOPS; hop++) {
      // Last hop must produce a final answer.
      const isLast = hop === MAX_TOOL_HOPS;
      const tools = isLast ? FINAL_TOOLS : [...LOOKUP_TOOLS, ...FINAL_TOOLS];
      const aiJson = await callGateway(tools, "required").catch((r) => {
        if (r instanceof Response) return r;
        throw r;
      });
      if (aiJson instanceof Response) return aiJson;

      const choice = aiJson?.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];

      if (!toolCall) {
        const summary = choice?.message?.content ?? "Sorry — I couldn't form a response.";
        finalReply = { kind: "answer", summary, followups: [] };
        break;
      }

      const name = toolCall.function?.name as string;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(toolCall.function?.arguments ?? "{}"); } catch { /* noop */ }

      const isLookup = LOOKUP_TOOLS.some((t) => t.function.name === name);
      if (isLookup && !isLast) {
        const result = await runLookup(name, args, supa, ctx);
        convo.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });
        convo.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name,
          content: JSON.stringify(result).slice(0, 6000),
        });
        continue;
      }

      // Final tool — return.
      finalReply = { kind: name, ...args };
      break;
    }

    if (!finalReply) {
      finalReply = { kind: "answer", summary: "Sorry — I couldn't form a response.", followups: [] };
    }

    // Persist to thread if we have an authed user.
    let savedThreadId = threadId;
    if (userId !== "guest") {
      try {
        if (!savedThreadId) {
          const { data: t } = await supa
            .from("ai_threads")
            .insert({ user_id: userId, route_at_start: route })
            .select("id")
            .single();
          savedThreadId = t?.id ?? null;
        }
        if (savedThreadId) {
          const lastUserMsg = messages[messages.length - 1];
          await supa.from("ai_thread_messages").insert([
            { thread_id: savedThreadId, role: lastUserMsg.role, content: { text: lastUserMsg.content } },
            { thread_id: savedThreadId, role: "assistant", content: finalReply as unknown as Record<string, unknown> },
          ]);
          await supa.from("ai_threads").update({ last_message_at: new Date().toISOString() }).eq("id", savedThreadId);
        }
      } catch (e) {
        console.error("neuron-ai: thread persist failed", e);
      }
    }

    return new Response(JSON.stringify({ ...finalReply, threadId: savedThreadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("neuron-ai unhandled", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
