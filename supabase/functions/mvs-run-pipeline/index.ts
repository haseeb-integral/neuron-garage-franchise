// mvs-run-pipeline (orchestrator) — background-execution model.
//
// Flow:
//   1. Validate auth / city.
//   2. Insert a single mvs_pipeline_runs row (parent).
//   3. Kick off discover → classify → extract in the BACKGROUND via
//      EdgeRuntime.waitUntil so the HTTP response returns in ~1 second.
//   4. The rollout UI polls mvs_pipeline_runs every 5s and sees status
//      transition queued → running → done|failed.
//
// Step functions accept `parent_run_id` and skip creating their own row,
// so the rollout table only ever sees one row per click.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUSTIN = "Austin, TX";

const TIER_A_CITIES = new Set<string>([
  "Austin, TX",
  "New York, NY",
  "Houston, TX",
  "Chicago, IL",
  "Boston, MA",
  "San Antonio, TX",
  "Philadelphia, PA",
  "Los Angeles, CA",
  "Indianapolis, IN",
]);

type StepName = "discover" | "classify" | "acs" | "extract";

const STEP_FUNCTIONS: Record<StepName, string> = {
  discover: "mvs-discover-providers",
  classify: "mvs-classify-tier",
  acs: "mvs-acs-pull",
  extract: "mvs-extract-weeks",
};

// Stale-run cutoff: a real run never legitimately exceeds ~2 min.
const STALE_MS = 3 * 60 * 1000;

// EdgeRuntime is provided by Supabase's edge runtime.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (Deno.env.get("MVS_PIPELINE_ENABLED") === "false") {
    return new Response(
      JSON.stringify({
        error: "Pipeline is paused by admin kill switch (MVS_PIPELINE_ENABLED=false). Clear that env var to re-enable.",
      }),
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

  const body = await req.json().catch(() => ({}));
  const city: string = (body?.city ?? AUSTIN).trim();
  if (!TIER_A_CITIES.has(city)) {
    const [cityName, stateAbbr] = city.split(",").map((s) => s.trim());
    const { data: addedRow } = await admin
      .from("mvs_shortlist_cities")
      .select("id")
      .ilike("city", cityName ?? "")
      .ilike("state", stateAbbr ?? "")
      .maybeSingle();
    if (!addedRow) {
      return new Response(
        JSON.stringify({
          error: `City '${city}' is not in the Tier A allow-list or the shortlist. Add it from the Market Validation page first.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Clear stale in-flight rows (>3 min) so a crashed earlier run can't lock the city.
  const staleCutoff = new Date(Date.now() - STALE_MS).toISOString();
  await admin
    .from("mvs_pipeline_runs")
    .update({
      status: "failed",
      error: "auto-cleared stale in-flight run (>3 min old)",
      finished_at: new Date().toISOString(),
    })
    .eq("city", city)
    .in("status", ["queued", "running"])
    .lt("started_at", staleCutoff);

  // Reject if a fresh run is still running.
  const { data: inflight } = await admin
    .from("mvs_pipeline_runs")
    .select("id, status, started_at")
    .eq("city", city)
    .in("status", ["queued", "running"])
    .gte("started_at", staleCutoff)
    .limit(1);
  if (inflight && inflight.length > 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        already_running: true,
        run_id: inflight[0].id,
        message: `A pipeline run for ${city} is already in flight. Wait for it to finish before starting another.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create the single parent run row.
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
      JSON.stringify({ error: "Failed to create pipeline run row", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ----- Background work — does not block the HTTP response -----
  const work = (async () => {
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
        body: JSON.stringify({ ...payload, parent_run_id: run.id }),
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* keep raw */ }
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
      await invokeStep("discover", { city });
      // Always reclassify on a pipeline run — Turn 2.2 logic depends on
      // re-tagging existing rows after classifier changes ship.
      await invokeStep("classify", { city, reclassify: true });
      // Stage 4: ensure ACS denominators are populated before scoring.
      // Non-fatal: if ACS lookup fails the pipeline still completes.
      try {
        await invokeStep("acs", { city });
      } catch (acsErr) {
        console.warn("[mvs-run-pipeline] acs step failed (non-fatal):", acsErr);
      }
      await invokeStep("extract", { city });

      await admin
        .from("mvs_pipeline_runs")
        .update({
          status: "done",
          firecrawl_calls: totalCalls,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
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
    }
  })();

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    // Fallback for local/test environments without EdgeRuntime — fire-and-forget.
    work.catch(() => { /* errors are already persisted to the run row */ });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      run_id: run.id,
      status: "running",
      message: "Pipeline started in background — poll mvs_pipeline_runs for status.",
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
