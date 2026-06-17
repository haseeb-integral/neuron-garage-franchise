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

// Phase 7 / Turn 7.1 — Tier A allow-list. Anything outside this list keeps the
// Sample Data badge. Predictable cost: 8 cities × 30 Firecrawl-call cap = 240
// calls worst case.
const TIER_A_CITIES = new Set<string>([
  "Austin, TX",
  "New York, NY",
  "Houston, TX",
  "Chicago, IL",
  "Boston, MA",
  "San Antonio, TX",
  "Philadelphia, PA",
  "Los Angeles, CA",
]);

type StepName = "discover" | "classify" | "extract";

const STEP_FUNCTIONS: Record<StepName, string> = {
  discover: "mvs-discover-providers",
  classify: "mvs-classify-tier",
  extract: "mvs-extract-weeks-all",
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

  // Body: { city } — must be a Tier A city.
  const body = await req.json().catch(() => ({}));
  const city: string = (body?.city ?? AUSTIN).trim();
  if (!TIER_A_CITIES.has(city)) {
    return new Response(
      JSON.stringify({
        error: `city '${city}' is not in the Tier A allow-list`,
        allowed: Array.from(TIER_A_CITIES),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }


  // Auto-clear stale runs (older than 10 minutes) so a crashed run doesn't lock the city forever.
  const staleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await admin
    .from("mvs_pipeline_runs")
    .update({ status: "failed", error: "auto-cleared stale in-flight run", finished_at: new Date().toISOString() })
    .eq("city", city)
    .in("status", ["queued", "running"])
    .lt("started_at", staleCutoff);

  // Reject if a fresh run is still in flight for this city.
  const { data: inflight } = await admin
    .from("mvs_pipeline_runs")
    .select("id, status")
    .eq("city", city)
    .in("status", ["queued", "running"])
    .limit(1);
  if (inflight && inflight.length > 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        already_running: true,
        run_id: inflight[0].id,
        message: "a run is already in flight",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
      const detail = json?.error ?? json?.message ?? text?.slice(0, 500) ?? `HTTP ${res.status}`;
      throw new Error(`step '${step}' failed (HTTP ${res.status}): ${detail}`);
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
    const discoverRes = await invokeStep("discover", { city });
    const classifyRes = await invokeStep("classify", { city });
    const extractRes = await invokeStep("extract", { city });

    const screenshotsStored =
      (Array.isArray(extractRes?.outcomes)
        ? extractRes.outcomes.filter((o: any) => o?.no_reg_page === false && o?.weeks_inserted > 0).length
        : 0) + (discoverRes?.screenshot_path ? 1 : 0);

    const summary = {
      providers_discovered: Number(discoverRes?.providers_inserted ?? 0),
      providers_classified: Number(classifyRes?.classified ?? 0),
      providers_processed: Number(extractRes?.providers_processed ?? 0),
      weeks_upserted: Number(extractRes?.weeks_inserted_total ?? 0),
      screenshots_stored: screenshotsStored,
      firecrawl_calls: totalCalls,
    };

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
        summary,
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },

    );
  }
});
