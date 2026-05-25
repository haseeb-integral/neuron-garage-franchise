// ============================================================================
// Observability AI — read-only agent for /observability.
//
// - Trained on the Data Observability User's Guide + Technical Spec
//   (see _shared/observabilityKnowledge.ts)
// - Context-aware: takes a `section` ("global" | "status" | "accuracy" |
//   "alerts" | "rule" | "domain") + optional topic so it knows which
//   Ask-AI button was clicked and which feature the user is on.
// - Full live access via tools: status overview, rules, incidents, history,
//   outliers, random sample.
// - Manager-only. JWT verified in code; every privileged tool is a
//   SECURITY DEFINER RPC that re-checks the role server-side.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { OBSERVABILITY_KB, SECTION_GUIDANCE } from "../_shared/observabilityKnowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_TOOL_ITERATIONS = 6;
const ROW_CAP = 25;

// ============================================================================
// Tool definitions (OpenAI tool-call shape)
// ============================================================================

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_status_overview",
      description:
        "Returns the current row count for every tracked domain plus the configured floor. Use this to answer 'are tables healthy / populated' questions.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_rules",
      description:
        "Returns the catalog of invariant rules (name, description, severity, expected_zero). Does NOT run them.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "run_rule",
      description:
        "Execute a single invariant rule by name. Returns { rule, count, rows[] }. Count = 0 means the rule passes when expected_zero is true.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Exact rule name from list_rules." } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_all_rules",
      description:
        "Execute every invariant rule and return a summary plus per-rule pass/fail counts. Use when the user asks broad accuracy questions.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_incidents",
      description:
        "List incidents from db_health_incidents, newest first. Open incidents (closed_at IS NULL) come first when only_open is true.",
      parameters: {
        type: "object",
        properties: {
          only_open: { type: "boolean", description: "Only return open incidents." },
          limit: { type: "number", description: "1-25, default 15." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_domain_history",
      description:
        "Return snapshot history for a domain over the last N days. Useful for trend / 'when did it break' questions.",
      parameters: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description:
              "Domain key: us_cities_scored, us_cities_geo, teacher_prospects, public_schools, candidates, city_seed_runs, or 'rules'.",
          },
          days: { type: "number", description: "1-30, default 7." },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_outliers",
      description:
        "Run the >3σ outlier finder for a single numeric column on us_cities_scored.",
      parameters: {
        type: "object",
        properties: {
          column: {
            type: "string",
            enum: [
              "composite_score_default",
              "population",
              "median_household_income",
              "cost_of_living_index",
              "col_salary_index",
              "population_density",
              "public_elementary_teacher_count",
              "csi_score",
            ],
          },
          n: { type: "number", description: "1-25 outliers to return, default 10." },
        },
        required: ["column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_random_sample",
      description:
        "Pull one random row from us_cities_scored with every column. Use for sanity-checks.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_subscriptions",
      description: "Return the current user's notification subscriptions (domain + rule).",
      parameters: { type: "object", properties: {} },
    },
  },
];

function cap(n: unknown, def: number): number {
  const v = typeof n === "number" ? n : def;
  return Math.max(1, Math.min(ROW_CAP, Math.floor(v)));
}

const TRACKED_DOMAINS = [
  { key: "us_cities_scored", min_rows: 500 },
  { key: "us_cities_geo", min_rows: 25000 },
  { key: "teacher_prospects", min_rows: 100 },
  { key: "public_schools", min_rows: 50000 },
  { key: "candidates", min_rows: 1 },
  { key: "city_seed_runs", min_rows: 1 },
];

// ============================================================================
// Tool implementations — all reads, all RLS / RPC enforced.
// ============================================================================

async function runTool(
  name: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
): Promise<unknown> {
  switch (name) {
    case "get_status_overview": {
      const rows: unknown[] = [];
      for (const d of TRACKED_DOMAINS) {
        const { count, error } = await supabase
          .from(d.key as never)
          .select("*", { count: "exact", head: true });
        if (error) {
          rows.push({ domain: d.key, error: error.message });
          continue;
        }
        const c = count ?? 0;
        const status = c <= 0 ? "red" : c < d.min_rows ? "yellow" : "green";
        rows.push({ domain: d.key, row_count: c, min_expected: d.min_rows, status });
      }
      const greens = rows.filter((r: any) => r.status === "green").length;
      const trust = Math.round((greens / TRACKED_DOMAINS.length) * 100);
      return { trust_score: trust, domains: rows };
    }

    case "list_rules": {
      const { data, error } = await supabase
        .from("db_health_rules" as never)
        .select("name, description, severity, expected_zero")
        .order("severity", { ascending: true })
        .order("name", { ascending: true });
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, rules: data ?? [] };
    }

    case "run_rule": {
      const ruleName = String(args.name ?? "").trim();
      if (!ruleName) return { error: "name required" };
      const { data, error } = await supabase.rpc("db_health_run_rule" as never, { _name: ruleName });
      if (error) return { error: error.message };
      const r = data as any;
      return {
        rule: r?.rule ?? ruleName,
        count: r?.count ?? 0,
        sample_rows: Array.isArray(r?.rows) ? r.rows.slice(0, 10) : [],
      };
    }

    case "run_all_rules": {
      const { data: rules, error } = await supabase
        .from("db_health_rules" as never)
        .select("name, description, severity, expected_zero");
      if (error) return { error: error.message };
      const results: any[] = [];
      for (const r of rules ?? []) {
        const { data, error: rerr } = await supabase.rpc("db_health_run_rule" as never, {
          _name: (r as any).name,
        });
        if (rerr) {
          results.push({ name: (r as any).name, error: rerr.message });
          continue;
        }
        const res = data as any;
        const count = res?.count ?? 0;
        const pass = (r as any).expected_zero ? count === 0 : count > 0;
        results.push({
          name: (r as any).name,
          severity: (r as any).severity,
          description: (r as any).description,
          count,
          passing: pass,
        });
      }
      const passing = results.filter((r) => r.passing).length;
      const failing = results.length - passing;
      return { total: results.length, passing, failing, results };
    }

    case "get_incidents": {
      const only_open = !!args.only_open;
      const limit = cap(args.limit, 15);
      let q = supabase
        .from("db_health_incidents" as never)
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(limit);
      if (only_open) q = q.is("closed_at", null);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, incidents: data ?? [] };
    }

    case "get_domain_history": {
      const domain = String(args.domain ?? "");
      const days = Math.max(1, Math.min(30, Number(args.days ?? 7)));
      if (!domain) return { error: "domain required" };
      const { data, error } = await supabase.rpc("db_health_history_for" as never, {
        _domain: domain,
        _days: days,
      });
      if (error) return { error: error.message };
      const rows = (data ?? []) as any[];
      const summary: Record<string, number> = { green: 0, yellow: 0, red: 0, unknown: 0 };
      for (const r of rows) summary[r.status] = (summary[r.status] ?? 0) + 1;
      return {
        domain,
        days,
        snapshot_count: rows.length,
        status_counts: summary,
        latest: rows[rows.length - 1] ?? null,
        recent: rows.slice(-12),
      };
    }

    case "find_outliers": {
      const column = String(args.column ?? "");
      const n = cap(args.n, 10);
      if (!column) return { error: "column required" };
      const { data, error } = await supabase.rpc("db_health_outliers" as never, {
        _column: column,
        _n: n,
      });
      if (error) return { error: error.message };
      return data ?? { column, rows: [] };
    }

    case "get_random_sample": {
      const { data, error } = await supabase.rpc("db_health_random_city" as never);
      if (error) return { error: error.message };
      return { row: data ?? {} };
    }

    case "get_subscriptions": {
      const { data, error } = await supabase
        .from("db_health_subscriptions" as never)
        .select("id, domain, rule_name, channel, created_at");
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, subscriptions: data ?? [] };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ============================================================================
// System prompt builder
// ============================================================================

function buildSystemPrompt(section: string, topic: string | null): string {
  const guidance = SECTION_GUIDANCE[section] ?? SECTION_GUIDANCE.global;
  const topicLine = topic ? `\nThe user is specifically focused on: ${topic}.` : "";
  const today = new Date().toISOString();
  return `You are the Data Observability Assistant on the /observability page of Neuron Garage. You are READ-ONLY: you can only call read tools. If asked to mutate anything (add a rule, close an incident, send an email), refuse politely and direct the user to the matching UI control.

CONTEXT — the user just clicked Ask AI from the "${section}" surface.${topicLine}
${guidance}

Current timestamp (ISO): ${today}

VOICE
- Concise, plain English. Short paragraphs and bullets.
- Confident, neutral analytical framing. Never use "in our experience" / "we've seen" / "historically" — this tool is brand-new.
- Always cite which tool(s) you used in one short clause, e.g. "Based on run_all_rules…".
- Never guess counts. If you need a number, call a tool.
- If a tool returns nothing, say so plainly.

KNOWLEDGE BASE
${OBSERVABILITY_KB}`;
}

// ============================================================================
// Handler
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
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body.question ?? "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const section = String(body.section ?? "global");
    const topic = body.topic ? String(body.topic) : null;
    if (!question) {
      return new Response(JSON.stringify({ error: "question required" }), {
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

    type Msg = {
      role: string;
      content?: string | null;
      tool_call_id?: string;
      tool_calls?: unknown[];
      name?: string;
    };
    const messages: Msg[] = [
      { role: "system", content: buildSystemPrompt(section, topic) },
      ...history,
      { role: "user", content: question },
    ];
    const toolCallsTrace: Array<{ name: string; args: unknown; result: unknown }> = [];

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto" }),
      });
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!aiResp.ok) {
        const text = await aiResp.text();
        return new Response(
          JSON.stringify({ error: `AI gateway error: ${aiResp.status} ${text.slice(0, 200)}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const aiJson = await aiResp.json();
      const choice = aiJson?.choices?.[0]?.message;
      if (!choice) {
        return new Response(JSON.stringify({ error: "Empty AI response" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({
            answer: choice.content ?? "",
            toolCalls: toolCallsTrace,
            model: MODEL,
            section,
            topic,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      messages.push({ role: "assistant", content: choice.content ?? null, tool_calls: choice.tool_calls });
      for (const tc of choice.tool_calls) {
        const tname = tc.function?.name;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          /* ignore */
        }
        const result = await runTool(tname, parsedArgs, supabase);
        toolCallsTrace.push({ name: tname, args: parsedArgs, result });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tname,
          content: JSON.stringify(result).slice(0, 12_000),
        });
      }
    }

    return new Response(
      JSON.stringify({
        answer:
          "I gathered some data but couldn't finish reasoning in time. Try a more specific question.",
        toolCalls: toolCallsTrace,
        model: MODEL,
        section,
        topic,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
