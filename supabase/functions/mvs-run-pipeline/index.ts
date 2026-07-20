// mvs-run-pipeline (orchestrator) — self-chaining stage machine.
//
// Phase 1 rebuild: instead of running every step inside ONE background task
// (which the edge runtime kills at ~25 min), each HTTP invocation now runs
// exactly ONE stage of the pipeline, updates the run row, then fires a
// short fire-and-forget POST to itself with { run_id, continue: true } to
// advance to the next stage. Fresh CPU/wall budget per hop.
//
// Request shapes:
//   1. { city, forceFresh? }                → create a new run, start at 'discover'
//   2. { run_id, continue: true }           → advance existing run to next stage
//
// Stages, in order:
//   discover → step0_exclude → classify → b3 → acs → catchup → reclassify → done
//
// The child step functions (mvs-discover-providers, mvs-classify-tier, etc.)
// already accept `parent_run_id` and skip creating their own row.

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

type Stage =
  | "discover"
  | "step0_exclude"
  | "classify"
  | "b3"
  | "acs"
  | "catchup"
  | "reclassify"
  | "done";

const STAGE_ORDER: Stage[] = [
  "discover",
  "step0_exclude",
  "classify",
  "b3",
  "acs",
  "catchup",
  "reclassify",
  "done",
];

function nextStage(s: Stage): Stage {
  const i = STAGE_ORDER.indexOf(s);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return "done";
  return STAGE_ORDER[i + 1];
}

const STEP_TIMEOUT_MS = 4 * 60 * 1000;
const STALE_MS = 3 * 60 * 1000;

// EdgeRuntime is provided by Supabase's edge runtime.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

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
        error:
          "Pipeline is paused by admin kill switch (MVS_PIPELINE_ENABLED=false).",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRole = authHeader.includes(serviceKey);

  const body = await req.json().catch(() => ({}));

  // -------- CONTINUATION PATH --------------------------------------------
  if (body?.continue === true && body?.run_id) {
    // Continuations MUST come from the service role (we self-invoke with it).
    if (!isServiceRole) {
      return new Response(JSON.stringify({ error: "forbidden: continuation requires service role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return await advanceRun(admin, supabaseUrl, serviceKey, anonKey, body.run_id);
  }

  // -------- NEW RUN PATH --------------------------------------------------

  // Auth: manager or admin required.
  let triggeringUserId: string | null = null;
  if (!isServiceRole) {
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
    triggeringUserId = userData.user.id;
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
  }

  const city: string = (body?.city ?? AUSTIN).trim();
  const forceFresh: boolean = body?.forceFresh === true || body?.force === true;

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
          error: `City '${city}' is not in the Tier A allow-list or the shortlist.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Freshness guard (unchanged).
  if (!forceFresh) {
    const FRESH_SKIP_DAYS = 90;
    const { data: lastGood } = await admin
      .from("mvs_pipeline_runs")
      .select("id, status, finished_at, created_at, fallback_data_date")
      .eq("city", city)
      .in("status", ["done", "done_stale"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastGood) {
      const effectiveIso =
        lastGood.status === "done_stale"
          ? lastGood.fallback_data_date
          : (lastGood.finished_at ?? lastGood.created_at);
      if (effectiveIso) {
        const ageDays = Math.round(
          (Date.now() - new Date(effectiveIso).getTime()) / 86_400_000,
        );
        if (ageDays >= 0 && ageDays <= FRESH_SKIP_DAYS) {
          return new Response(
            JSON.stringify({
              ok: true,
              skipped: true,
              reason: "fresh_saved_data",
              age_days: ageDays,
              saved_data_date: effectiveIso,
              last_run_id: lastGood.id,
              message: `Using saved data (${ageDays} day${ageDays === 1 ? "" : "s"} old). Pass forceFresh:true to override.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }
  }

  // Clear stale in-flight rows.
  const staleCutoff = new Date(Date.now() - STALE_MS).toISOString();
  await admin
    .from("mvs_pipeline_runs")
    .update({
      status: "failed",
      error: "auto-cleared stale in-flight run (>3 min old, no stage progress)",
      finished_at: new Date().toISOString(),
    })
    .eq("city", city)
    .in("status", ["queued", "running"])
    .lt("stage_started_at", staleCutoff);

  // Reject if a run is legitimately in progress.
  const { data: inflight } = await admin
    .from("mvs_pipeline_runs")
    .select("id, stage, stage_started_at")
    .eq("city", city)
    .in("status", ["queued", "running"])
    .gte("stage_started_at", staleCutoff)
    .limit(1);
  if (inflight && inflight.length > 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        already_running: true,
        run_id: inflight[0].id,
        stage: inflight[0].stage,
        message: `Pipeline for ${city} is already running (stage: ${inflight[0].stage}).`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create the parent run row at stage 'discover'.
  const nowIso = new Date().toISOString();
  const { data: run, error: runErr } = await admin
    .from("mvs_pipeline_runs")
    .insert({
      city,
      status: "running",
      stage: "discover",
      stage_started_at: nowIso,
      started_at: nowIso,
      firecrawl_calls: 0,
      triggering_user_id: triggeringUserId,
    })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(
      JSON.stringify({ error: "Failed to create pipeline run row", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Fire-and-forget: kick off the first stage via self-invoke.
  scheduleContinuation(supabaseUrl, serviceKey, run.id);

  return new Response(
    JSON.stringify({
      ok: true,
      run_id: run.id,
      status: "running",
      stage: "discover",
      message: "Pipeline started — polling mvs_pipeline_runs will show stage progress.",
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

// ---------------------------------------------------------------------------
// Continuation handler — runs ONE stage, updates row, self-invokes next stage.
// ---------------------------------------------------------------------------

async function advanceRun(
  admin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  anonKey: string,
  runId: string,
): Promise<Response> {
  const { data: run, error } = await admin
    .from("mvs_pipeline_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error || !run) {
    return new Response(JSON.stringify({ error: "run not found", detail: error?.message }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (run.status !== "running" && run.status !== "queued") {
    return new Response(JSON.stringify({ ok: true, done: true, status: run.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stage = (run.stage ?? "discover") as Stage;
  const city: string = run.city;
  const sourceCounts: Record<string, unknown> = (run.source_counts as Record<string, unknown>) ?? {};
  let firecrawlCalls: number = Number(run.firecrawl_calls ?? 0);

  // Mark this stage as started (for stale detection).
  await admin
    .from("mvs_pipeline_runs")
    .update({ stage_started_at: new Date().toISOString() })
    .eq("id", runId);

  const doWork = (async () => {
    try {
      const stepAuth = `Bearer ${serviceKey}`;

      const invokeStep = async (fnName: string, payload: Record<string, unknown>, label: string) => {
        const res = await fetchWithTimeout(
          `${supabaseUrl}/functions/v1/${fnName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: stepAuth,
              apikey: serviceKey,
            },
            body: JSON.stringify({ ...payload, parent_run_id: runId }),
          },
          STEP_TIMEOUT_MS,
          label,
        );
        const text = await res.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch { /* keep raw */ }
        if (!res.ok) {
          const detail = json?.error ?? json?.message ?? text?.slice(0, 500) ?? `HTTP ${res.status}`;
          throw new Error(`${label} failed (HTTP ${res.status}): ${detail}`);
        }
        firecrawlCalls += Number(json?.firecrawl_calls ?? 0);
        return json;
      };

      // -------- Per-stage work ----------
      if (stage === "discover") {
        const j = await invokeStep("mvs-discover-providers", { city }, "discover");
        if (j?.source_counts) sourceCounts.discover = j.source_counts;
      } else if (stage === "step0_exclude") {
        sourceCounts.step0_exclusions = await runStep0Exclusions(admin, city);
      } else if (stage === "classify") {
        const j = await invokeStep("mvs-classify-tier", { city, reclassify: true }, "classify");
        if (j && (j.batches_total != null || j.batches_attempted != null)) {
          sourceCounts.classify = {
            batches_total: j.batches_total ?? null,
            batches_attempted: j.batches_attempted ?? null,
            aborted_at_batch: j.aborted_at_batch ?? null,
          };
        }
      } else if (stage === "b3") {
        if (Deno.env.get("MVS_B3_PRIMARY_ENABLED") === "true") {
          // b3 self-chains its own batches. Fire the FIRST batch as
          // fire-and-forget so this stage returns fast and the orchestrator
          // can move on to acs/catchup while b3 keeps running in the
          // background. Progress is written to source_counts.b3_price_pass
          // by each b3 batch.
          const firstBody = {
            city,
            offset: 0,
            batchSize: 8,
            totalLimit: 200,
            dryRun: false,
            parent_run_id: runId,
          };
          const kickoff = fetch(`${supabaseUrl}/functions/v1/mvs-price-b3`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: stepAuth,
              apikey: serviceKey,
            },
            body: JSON.stringify(firstBody),
          }).catch((err) => console.warn("[mvs-run-pipeline] b3 kickoff failed:", err));
          if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
            EdgeRuntime.waitUntil(kickoff);
          }
          sourceCounts.b3_price_pass = {
            ok: true,
            in_progress: true,
            batches: 0,
            scanned: 0,
            kicked_off_at: new Date().toISOString(),
          };
        } else {
          sourceCounts.b3_price_pass = { skipped: true, reason: "MVS_B3_PRIMARY_ENABLED not true" };
        }

      } else if (stage === "acs") {
        try {
          await invokeStep("mvs-acs-pull", { city }, "acs");
          sourceCounts.acs = { ok: true };
        } catch (acsErr) {
          console.warn("[mvs-run-pipeline] acs failed (non-fatal):", acsErr);
          sourceCounts.acs = { ok: false };
        }
      } else if (stage === "catchup") {
        try {
          const j = await invokeStep(
            "mvs-discover-providers",
            { city, missingPricesCatchup: true },
            "catchup",
          );
          sourceCounts.catchup = j?.source_counts?.catchup ?? { ran: true };
        } catch (catchErr) {
          console.warn("[mvs-run-pipeline] catchup failed (non-fatal):", catchErr);
          sourceCounts.catchup = { ok: false };
        }
      } else if (stage === "reclassify") {
        try {
          await invokeStep("mvs-classify-tier", { city, reclassify: true }, "reclassify");
          sourceCounts.reclassify = { ok: true };
        } catch (reclErr) {
          console.warn("[mvs-run-pipeline] reclassify failed (non-fatal):", reclErr);
          sourceCounts.reclassify = { ok: false };
        }
      }

      // -------- Advance stage ----------
      const upcoming = nextStage(stage);

      if (upcoming === "done") {
        await admin
          .from("mvs_pipeline_runs")
          .update({
            status: "done",
            stage: "done",
            firecrawl_calls: firecrawlCalls,
            source_counts: sourceCounts,
            finished_at: new Date().toISOString(),
          })
          .eq("id", runId);

        // Completion notification.
        if (run.triggering_user_id) {
          try {
            await admin.from("notifications").insert({
              user_id: run.triggering_user_id,
              kind: "city_scoring_finished",
              title: `Market Validation finished for ${city}`,
              message: `Processed providers and refreshed live scores. Used ${firecrawlCalls} search calls.`,
              link: `/city-competitors?city=${encodeURIComponent(city)}`,
              created_at: new Date().toISOString(),
            });
          } catch (nErr) {
            console.warn("[mvs-run-pipeline] completion notification failed:", nErr);
          }
        }
      } else {
        await admin
          .from("mvs_pipeline_runs")
          .update({
            stage: upcoming,
            stage_started_at: new Date().toISOString(),
            firecrawl_calls: firecrawlCalls,
            source_counts: sourceCounts,
          })
          .eq("id", runId);

        scheduleContinuation(supabaseUrl, serviceKey, runId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await handleFailure(admin, runId, run, city, firecrawlCalls, sourceCounts, msg);
    }
  })();

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(doWork);
  } else {
    doWork.catch(() => { /* errors persisted to row */ });
  }

  return new Response(
    JSON.stringify({ ok: true, run_id: runId, stage, message: "stage started" }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scheduleContinuation(supabaseUrl: string, serviceKey: string, runId: string) {
  const url = `${supabaseUrl}/functions/v1/mvs-run-pipeline`;
  const p = fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ run_id: runId, continue: true }),
  }).catch((err) => {
    console.warn("[mvs-run-pipeline] continuation POST failed:", err);
  });
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(p);
  }
}

async function runStep0Exclusions(
  admin: ReturnType<typeof createClient>,
  city: string,
): Promise<{ scanned: number; excluded: number }> {
  const { data: rows } = await admin
    .from("mvs_providers")
    .select("id, name, category_classified, category_excluded_reason")
    .eq("city", city)
    .is("category_excluded_reason", null)
    .limit(1000);
  if (!rows || rows.length === 0) return { scanned: 0, excluded: 0 };
  let excluded = 0;
  for (const p of rows) {
    const rawName = String(p?.name ?? "");
    const name = rawName.toLowerCase();
    const isCampish =
      /(camp|academy|school|studio|gym|dance|art|stem|music|tutor|after[- ]?school)/i.test(rawName);
    let reason: string | null = null;
    const cat = String(p?.category_classified ?? "").toLowerCase().replace(/[^a-z]/g, "");
    if (cat === "childcareexcluded") {
      reason = "Baby Daycare / Year-round Childcare";
    } else if (
      /\b(park|garden|zoo|harbor|harbour|beach|reservation|sanctuary|public\s+library)\b/.test(name) &&
      !isCampish
    ) {
      reason = "Public Park / Public Space";
    } else if (/\b(home\s*depot|lowe'?s|michael'?s|apple\s+store|barnes\s*&?\s*noble)\b/.test(name)) {
      reason = "Free Retail Workshop";
    } else if (/\bboys\s*&?\s*girls\s+club\b/.test(name)) {
      reason = "Free / Charity Drop-in Club";
    }
    if (reason) {
      await admin.from("mvs_providers").update({ category_excluded_reason: reason }).eq("id", p.id);
      excluded += 1;
    }
  }
  return { scanned: rows.length, excluded };
}

async function handleFailure(
  admin: ReturnType<typeof createClient>,
  runId: string,
  run: any,
  city: string,
  firecrawlCalls: number,
  sourceCounts: Record<string, unknown>,
  msg: string,
) {
  let fallbackStatus: "failed" | "done_stale" | "failed_no_data" = "failed";
  let fallbackDate: string | null = null;
  let fallbackReason: string | null = null;
  try {
    const { data: latestProv } = await admin
      .from("mvs_providers")
      .select("updated_at")
      .eq("city", city)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestProv?.updated_at) {
      const ageDays =
        (Date.now() - new Date(latestProv.updated_at as string).getTime()) /
        (1000 * 60 * 60 * 24);
      if (ageDays <= 120) {
        fallbackStatus = "done_stale";
        fallbackDate = latestProv.updated_at as string;
        fallbackReason = `Stage failed — using saved data ${Math.round(ageDays)} day(s) old. ${msg}`.slice(0, 1000);
      } else {
        fallbackStatus = "failed_no_data";
        fallbackReason = `Stage failed and saved data is ${Math.round(ageDays)} day(s) old (>120). ${msg}`.slice(0, 1000);
      }
    } else {
      fallbackStatus = "failed_no_data";
      fallbackReason = `Stage failed and no saved providers exist. ${msg}`.slice(0, 1000);
    }
  } catch {
    fallbackStatus = "failed";
  }

  await admin
    .from("mvs_pipeline_runs")
    .update({
      status: fallbackStatus,
      error: msg.slice(0, 1000),
      firecrawl_calls: firecrawlCalls,
      source_counts: sourceCounts,
      finished_at: new Date().toISOString(),
      fallback_reason: fallbackReason,
      fallback_data_date: fallbackDate,
    })
    .eq("id", runId);

  if (run?.triggering_user_id) {
    try {
      await admin.from("notifications").insert({
        user_id: run.triggering_user_id,
        kind: "system",
        title: `Market Validation failed for ${city}`,
        message:
          fallbackStatus === "done_stale"
            ? `Crawl error; falling back to saved data. ${msg}`.slice(0, 250)
            : `Pipeline failed: ${msg}`.slice(0, 250),
        link: `/city-competitors?city=${encodeURIComponent(city)}`,
        created_at: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }
}
