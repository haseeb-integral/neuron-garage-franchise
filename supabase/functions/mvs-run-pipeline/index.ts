// Phase 5 / Turn 5.2 — mvs-run-pipeline (orchestrator)
//
// Per the approved Feature 1A Build Plan, Turn 5.2:
//   - Manager/admin only. Gated by MVS_PIPELINE_ENABLED kill switch.
//   - Runs discover → classify → extract sequentially.
//   - Writes a single parent row to mvs_pipeline_runs with status
//     queued → running → done|failed and aggregate firecrawl_calls.
//   - Hard cap: max 30 Firecrawl calls per orchestrated run (configurable
//     via MVS_PIPELINE_FIRECRAWL_CAP env, default 30).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUSTIN = "Austin, TX";

type StepName = "discover" | "classify" | "extract";

const STEP_FUNCTIONS: Record<StepName, string> = {
  discover: "mvs-discover-providers",
  classify: "mvs-classify-tier",
  extract: "mvs-extract-weeks-austin-all",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Kill switch: if explicitly disabled, refuse. Default allow.
  if (Deno.env.get("MVS_PIPELINE_ENABLED") === "false") {
    return new Response(
      JSON.stringify({ error: "MVS pipeline disabled (kill switch)" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const cap = Number(Deno.env.get("MVS_PIPELINE_FIRECRAWL_CAP") ?? "30");

  // Auth: manager or admin required.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ["manager", "admin"]);
  if (!roleRows || roleRows.length === 0) {
    return new Response(JSON.stringify({ error: "forbidden: manager required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Body: { city } — Austin-only for this turn.
  const body = await req.json().catch(() => ({}));
  const city: string = (body?.city ?? AUSTIN).trim();
  if (city !== AUSTIN) {
    return new Response(
      JSON.stringify({ error: `Turn 5.2 supports Austin only (got ${city})` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Reject if a run is already in flight for this city.
  const { data: inflight } = await admin
    .from("mvs_pipeline_runs")
    .select("id, status")
    .eq("city", city)
    .in("status", ["queued", "running"])
    .limit(1);
  if (inflight && inflight.length > 0) {
    return new Response(
      JSON.stringify({ error: "a run is already in flight", run_id: inflight[0].id }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create parent orchestrator run row.
  const { data: run, error: runErr } = await admin
    .from("mvs_pipeline_runs")
    .insert({
      city,
      status: "running",
      firecrawl_calls: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(
      JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let totalCalls = 0;
  const stepResults: Record<string, unknown> = {};

  const invokeStep = async (step: StepName, payload: Record<string, unknown>) => {
    const url = `${supabaseUrl}/functions/v1/${STEP_FUNCTIONS[step]}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* keep raw text */ }
    if (!res.ok) {
      throw new Error(`${step} failed: ${res.status} ${json?.error ?? text.slice(0, 300)}`);
    }
    const calls = Number(json?.firecrawl_calls ?? 0);
    totalCalls += calls;
    stepResults[step] = json ?? text;
    if (totalCalls > cap) {
      throw new Error(`Firecrawl cap exceeded after ${step}: ${totalCalls} > ${cap}`);
    }
    return json;
  };

  try {
    await invokeStep("discover", { city });
    await invokeStep("classify", { city });
    await invokeStep("extract", { city });

    await admin
      .from("mvs_pipeline_runs")
      .update({
        status: "done",
        firecrawl_calls: totalCalls,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: run.id,
        firecrawl_calls: totalCalls,
        steps: stepResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin
      .from("mvs_pipeline_runs")
      .update({
        status: "failed",
        error: msg.slice(0, 1000),
        firecrawl_calls: totalCalls,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return new Response(
      JSON.stringify({
        ok: false,
        run_id: run.id,
        firecrawl_calls: totalCalls,
        error: msg,
        steps: stepResults,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
