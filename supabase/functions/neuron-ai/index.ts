// ============================================================================
// neuron-ai — Global Ask AI assistant (v1)
// ============================================================================
//
// Single endpoint the Neuron AI side panel calls every turn.
// Returns ONE of four shapes via tool calling:
//   - answer            (factual / explainer, no side effects)
//   - navigate_and_apply (route + state to apply on the client)
//   - propose_action     (preview only; nothing written here)
//   - clarify            (ask one short follow-up with chip suggestions)
//
// Writes are NOT executed here. The client calls neuron-ai-confirm with the
// previously-returned propose_action payload after the user clicks Confirm.
//
// v1 deferred (per Haseeb / Brett): multi-step planning, deep-reasoning
// model, charts/images, streaming, NL-to-SQL.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { APP_KNOWLEDGE, SCREEN_KNOWLEDGE } from "../_shared/appKnowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_TURNS = 12;

type Role = "user" | "assistant" | "system";
type ChatMsg = { role: Role; content: string };

type ScreenState = Record<string, unknown> | null;
type Context = {
  route: string;
  screenState: ScreenState;
  user: { id: string; email?: string; role: string };
};

function buildSystemPrompt(ctx: Context): string {
  const screenBlock = SCREEN_KNOWLEDGE[ctx.route] ?? "";
  return `You are Neuron AI — the in-app assistant for the Neuron Garage franchise-scouting console. Speak in plain English; never mention internal tech (Supabase, edge functions, Postgres). Refer to the backend as "the system".

VOICE
- Warm, concise, never patronizing. No emojis (one welcome 👋 is fine in the very first greeting only; never afterwards).
- Never claim lived experience. Use "this analysis suggests", "the data indicates", "the signals show". Forbidden: "in our experience", "we've seen", "we've found", "historically we".
- Always be honest about data gaps. Never invent cities, teachers, candidates, or numbers.

HOW TO RESPOND
You MUST call EXACTLY ONE of four tools every turn:

1) answer — for factual / explainer questions, anything that needs no side effect.
   Keep prose tight (2-6 sentences). Use markdown bullets for lists.

2) navigate_and_apply — when the user wants to GO TO a screen and apply state.
   route: one of "/city-scoring", "/teacher-search", "/email-outreach", "/candidate-pipeline".
   apply: a JSON object whose shape depends on the route (see screen knowledge below).
   summary: one short sentence telling the user what you're doing.

3) propose_action — when the user wants a WRITE (add to watchlist, change candidate stage).
   action_type: one of the allowed types listed in the screen knowledge for the CURRENT route.
   payload: the data needed to execute.
   preview_text: a clear, human-readable sentence the user will see on the Confirm card.
   Nothing is written yet. The client will show a Confirm card. Only after the user confirms
   will the action actually run.

4) clarify — when intent is ambiguous (e.g. "find Frisco" → Texas or Colorado).
   question: ONE short follow-up question.
   chip_suggestions: 2-3 short clickable answer chips.

HARD RULES
- NEVER set a state filter unless the user named a US state explicitly (full name like "Texas"
  or 2-letter code like "TX"). Phrases like "good cities", "best markets", "top areas" carry NO state.
- NEVER invent values, cities, or numbers.
- NEVER propose actions outside the allowed list for the current route.
- If you can't help, use the answer tool to say so and suggest who to ask (Brett for product
  decisions, Sam for scoring methodology, Haseeb for engineering).

APP KNOWLEDGE
${APP_KNOWLEDGE}

CURRENT ROUTE: ${ctx.route}
USER ROLE: ${ctx.user.role}
${screenBlock}

CURRENT SCREEN STATE (JSON, may be empty):
${JSON.stringify(ctx.screenState ?? {}, null, 2)}
`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "answer",
      description: "Plain factual or explainer answer. No side effects.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "The answer in 2-6 sentences. Markdown OK." },
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
      name: "navigate_and_apply",
      description: "Take the user to a screen and apply state (filters, weights, etc).",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          route: {
            type: "string",
            enum: ["/city-scoring", "/teacher-search", "/email-outreach", "/candidate-pipeline"],
          },
          apply: { type: "object", additionalProperties: true },
        },
        required: ["summary", "route", "apply"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_action",
      description: "Preview a write action. Client shows a Confirm card; nothing runs yet.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          action_type: {
            type: "string",
            enum: ["add_to_watchlist", "remove_from_watchlist", "change_candidate_stage"],
          },
          payload: { type: "object", additionalProperties: true },
          preview_text: { type: "string", description: "Sentence shown on the Confirm card." },
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
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supa.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role lookup (best-effort; default to viewer).
    let role = "viewer";
    const { data: roleRows } = await supa.from("user_roles").select("role").eq("user_id", user.id);
    if (roleRows && roleRows.length > 0) {
      const roles = roleRows.map((r: { role: string }) => r.role);
      if (roles.includes("admin")) role = "admin";
      else if (roles.includes("manager")) role = "manager";
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const messages = Array.isArray(body.messages) ? (body.messages as ChatMsg[]) : [];
    const route = typeof body.route === "string" ? body.route : "/";
    const screenState = (body.screenState ?? null) as ScreenState;
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

    const ctx: Context = { route, screenState, user: { id: user.id, email: user.email, role } };
    const systemPrompt = buildSystemPrompt(ctx);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: TOOLS,
        tool_choice: "required",
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text().catch(() => "");
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error", status, text);
      return new Response(JSON.stringify({ error: "Assistant failed. Please retry." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const choice = aiJson?.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: model returned plain text.
      const summary = choice?.message?.content ?? "Sorry — I couldn't form a response.";
      return new Response(JSON.stringify({ kind: "answer", summary, followups: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = toolCall.function?.name as string;
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(toolCall.function?.arguments ?? "{}"); } catch { /* keep empty */ }

    return new Response(JSON.stringify({ kind: name, ...args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("neuron-ai unhandled", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
