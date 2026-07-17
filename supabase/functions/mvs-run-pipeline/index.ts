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

  const cap = Number(Deno.env.get("MVS_PIPELINE_FIRECRAWL_CAP") ?? "500");
  // v1.2: bumped discover cap to 350 for missing prices catch-up loop
  const STEP_CAPS: Record<string, number> = { discover: 350, classify: 15, extract: 15 };

  // Auth: manager or admin required.
  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);
  const isServiceRole = authHeader.includes(serviceKey);

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

  const body = await req.json().catch(() => ({}));
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
          error: `City '${city}' is not in the Tier A allow-list or the shortlist. Add it from the Market Validation page first.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // ----- Backend freshness guard ---------------------------------------
  // Hard rule: do not start a new crawl if the city already has good saved
  // data ≤ 90 days old, unless the caller explicitly passed forceFresh=true.
  // This protects Firecrawl credits even when the UI check is bypassed.
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
              message: `Using saved data (${ageDays} day${ageDays === 1 ? "" : "s"} old). Fresh crawl skipped. Pass forceFresh:true to override.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
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
  // Per-step HTTP timeout. If a child function hangs (Apify stall, upstream
  // socket death), the parent must not hang with it — otherwise the run row
  // stays "running" indefinitely and the UI locks the city. 4 min per step
  // covers legit long child runs (discover with 5 queries × 100 places) while
  // still surfacing a hang within the overall pipeline budget.
  const STEP_TIMEOUT_MS = 4 * 60 * 1000;
  // Overall hard ceiling on the background pipeline. Anything longer means
  // something is wrong — fail loudly instead of leaving a stuck row.
  const PIPELINE_TIMEOUT_MS = 20 * 60 * 1000;

  const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number, label: string) => {
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
  };

  const work = (async () => {
    let totalCalls = 0;
    const stepResults: Record<string, unknown> = {};

    const invokeStep = async (step: StepName, payload: Record<string, unknown>) => {
      const url = `${supabaseUrl}/functions/v1/${STEP_FUNCTIONS[step]}`;
      const stepAuth = isServiceRole ? `Bearer ${serviceKey}` : authHeader;
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: stepAuth,
            apikey: anonKey,
          },
          body: JSON.stringify({ ...payload, parent_run_id: run.id }),
        },
        STEP_TIMEOUT_MS,
        `step '${step}'`,
      );
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
      const stepCap = STEP_CAPS[step];
      if (stepCap != null && calls > stepCap) {
        throw new Error(`step '${step}' used ${calls} Firecrawl calls — over per-step limit (${stepCap})`);
      }
      if (totalCalls > cap) {
        throw new Error(`Firecrawl cap exceeded after ${step}: ${totalCalls} > ${cap}`);
      }
      return json;
    };

    // Build a per-step summary so the UI can show "X/5 sources" instead of
    // just pass/fail. discover -> per-platform counts; classify -> batches done.
    const sourceCounts: Record<string, unknown> = {};

    try {
      const discoverPayload: Record<string, unknown> = { city };
      if (body?.tavilyPilot === true) discoverPayload.tavilyPilot = true;
      const discoverJson = await invokeStep("discover", discoverPayload);
      if (discoverJson?.source_counts) sourceCounts.discover = discoverJson.source_counts;
      // Always reclassify on a pipeline run — Turn 2.2 logic depends on
      // re-tagging existing rows after classifier changes ship.
      const classifyJson = await invokeStep("classify", { city, reclassify: true });
      if (classifyJson && (classifyJson.batches_total != null || classifyJson.batches_attempted != null)) {
        sourceCounts.classify = {
          batches_total: classifyJson.batches_total ?? null,
          batches_attempted: classifyJson.batches_attempted ?? null,
          aborted_at_batch: classifyJson.aborted_at_batch ?? null,
        };
      }

      // Step 0 (Provider Pricing Accuracy plan, Phase 0): cheap name-based
      // exclusion sweep. Marks obvious non-camp rows (Home Depot workshops,
      // public libraries, retail workshops, Boys & Girls Club) with
      // `category_excluded_reason` so the paid Firecrawl catch-up skips them.
      // Mirrors src/lib/mvs/classifyExclusion.ts (kept inline because edge
      // functions can't import from src/). Never deletes — audit-friendly.
      try {
        const excludeSweep = async () => {
          const { data: rows } = await admin
            .from("mvs_providers")
            .select("id, name, category_classified, category_excluded_reason")
            .eq("city", city)
            .is("category_excluded_reason", null)
            .limit(1000);
          if (!rows || rows.length === 0) return { scanned: 0, excluded: 0 };
          let excluded = 0;
          for (const p of rows) {
            const name = String(p?.name ?? "").toLowerCase();
            const rawName = String(p?.name ?? "");
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
            } else if (
              /\b(home\s*depot|lowe'?s|michael'?s|apple\s+store|barnes\s*&?\s*noble)\b/.test(name)
            ) {
              reason = "Free Retail Workshop";
            } else if (/\bboys\s*&?\s*girls\s+club\b/.test(name)) {
              reason = "Free / Charity Drop-in Club";
            }
            if (reason) {
              await admin
                .from("mvs_providers")
                .update({ category_excluded_reason: reason })
                .eq("id", p.id);
              excluded += 1;
            }
          }
          return { scanned: rows.length, excluded };
        };
        sourceCounts.step0_exclusions = await excludeSweep();
      } catch (excErr) {
        console.warn("[mvs-run-pipeline] step0 exclusion sweep failed (non-fatal):", excErr);
        sourceCounts.step0_exclusions = { ok: false };
      }

      // Step B3 (Provider Pricing Accuracy plan, Phase 2): Google AI Overview
      // price pass via Apify. Runs BEFORE the Firecrawl catch-up so any camp
      // priced here is skipped by catch-up (saves Firecrawl money). Gated by
      // MVS_B3_PRIMARY_ENABLED env flag — default OFF. Non-fatal.
      if (Deno.env.get("MVS_B3_PRIMARY_ENABLED") === "true") {
        try {
          const b3Url = `${supabaseUrl}/functions/v1/mvs-price-b3`;
          const b3Auth = isServiceRole ? `Bearer ${serviceKey}` : authHeader;
          const b3Res = await fetchWithTimeout(
            b3Url,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: b3Auth,
                apikey: anonKey,
              },
              body: JSON.stringify({ city, limit: 100, dryRun: false, concurrency: 3, parent_run_id: run.id }),
            },
            STEP_TIMEOUT_MS,
            "b3 price pass",
          );
          const b3Text = await b3Res.text();
          let b3Json: any = null;
          try { b3Json = JSON.parse(b3Text); } catch { /* keep raw */ }
          if (!b3Res.ok) {
            console.warn(`[mvs-run-pipeline] b3 price pass HTTP ${b3Res.status}: ${b3Text?.slice(0, 300)}`);
            sourceCounts.b3_price_pass = { ok: false, http_status: b3Res.status };
          } else {
            sourceCounts.b3_price_pass = {
              ok: true,
              scanned: b3Json?.scanned ?? null,
              high_conf: b3Json?.high_conf ?? null,
              medium_conf: b3Json?.medium_conf ?? null,
              needs_review: b3Json?.needs_review ?? null,
              apify_calls: b3Json?.apify_calls ?? null,
              gemini_calls: b3Json?.gemini_calls ?? null,
            };
          }
        } catch (b3Err) {
          console.warn("[mvs-run-pipeline] b3 price pass failed (non-fatal):", b3Err);
          sourceCounts.b3_price_pass = { ok: false, error: String(b3Err).slice(0, 300) };
        }
      }



      // Stage 4: ensure ACS denominators are populated before scoring.
      // Non-fatal: if ACS lookup fails the pipeline still completes.
      try {
        await invokeStep("acs", { city });
        sourceCounts.acs = { ok: true };
      } catch (acsErr) {
        console.warn("[mvs-run-pipeline] acs step failed (non-fatal):", acsErr);
        sourceCounts.acs = { ok: false };
      }
      // Stage 3 (mvs-extract-weeks) is RETIRED — Market Absorption was removed
      // from the composite (June 24, 2026). The weeks/registration-page scrape
      // produced ~80 QA-queue items per cycle and Firecrawl spend for a score
      // no longer shown to users. The function code is intentionally left in
      // place in case Absorption is ever revived. See plan: retire-weeks.
      stepResults["extract"] = { skipped: true, reason: "Market Absorption retired" };

      // Stage 5: Missing Prices Catch-Up. Chained automatically so "Force Fresh"
      // or standard pipeline runs complete the full end-to-end pricing sweep.
      try {
        const catchupJson = await invokeStep("discover", { city, missingPricesCatchup: true });
        if (catchupJson?.source_counts?.catchup) {
          sourceCounts.catchup = catchupJson.source_counts.catchup;
        } else {
          sourceCounts.catchup = { ran: true };
        }
      } catch (catchErr) {
        console.warn("[mvs-run-pipeline] missing prices catchup failed (non-fatal):", catchErr);
      }

      // Stage 6: Re-classify tiers. Catch-up fills price_min/price_max on rows
      // that were tagged "mid" (default when price unknown). Without this
      // second classify pass, a camp priced $500/wk stays tagged "mid" and
      // never counts toward Premium Providers.
      try {
        await invokeStep("classify", { city, reclassify: true });
      } catch (reclErr) {
        console.warn("[mvs-run-pipeline] post-catchup reclassify failed (non-fatal):", reclErr);
      }


      await admin
        .from("mvs_pipeline_runs")
        .update({
          status: "done",
          firecrawl_calls: totalCalls,
          source_counts: sourceCounts,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      // Phase 2: Send in-app header bell notification to the user who triggered the run
      if (triggeringUserId) {
        try {
          await admin.from("notifications").insert({
            user_id: triggeringUserId,
            kind: "city_scoring_finished",
            title: `Market Validation finished for ${city}`,
            message: `Processed providers and refreshed live scores. Used ${totalCalls} search calls.`,
            link: `/city-competitors?city=${encodeURIComponent(city)}`,
            created_at: new Date().toISOString(),
          });
        } catch (notifErr) {
          console.warn("[mvs-run-pipeline] failed to insert completion notification:", notifErr);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      // Graceful fallback: if the run failed but we have recent saved provider
      // data for this city, downgrade to `done_stale` (0–120 days) so the UI
      // can keep showing the last good score with an amber "saved data from
      // {date}" banner. Only mark `failed_no_data` when there is nothing
      // recent enough to fall back to.
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
            (Date.now() - new Date(latestProv.updated_at).getTime()) /
            (1000 * 60 * 60 * 24);
          if (ageDays <= 120) {
            fallbackStatus = "done_stale";
            fallbackDate = latestProv.updated_at as string;
            fallbackReason = `Crawl failed — using saved data ${Math.round(ageDays)} day(s) old. ${msg}`.slice(0, 1000);
          } else {
            fallbackStatus = "failed_no_data";
            fallbackReason = `Crawl failed and saved data is ${Math.round(ageDays)} day(s) old (>120). ${msg}`.slice(0, 1000);
          }
        } else {
          fallbackStatus = "failed_no_data";
          fallbackReason = `Crawl failed and no saved providers exist for this city. ${msg}`.slice(0, 1000);
        }
      } catch (lookupErr) {
        console.warn("[mvs-run-pipeline] fallback lookup failed:", lookupErr);
        fallbackStatus = "failed";
      }

      await admin
        .from("mvs_pipeline_runs")
        .update({
          status: fallbackStatus,
          error: msg.slice(0, 1000),
          firecrawl_calls: totalCalls,
          source_counts: sourceCounts,
          finished_at: new Date().toISOString(),
          fallback_reason: fallbackReason,
          fallback_data_date: fallbackDate,
        })
        .eq("id", run.id);

      // Phase 2: Send failure notification
      if (triggeringUserId) {
        try {
          await admin.from("notifications").insert({
            user_id: triggeringUserId,
            kind: "system",
            title: `Market Validation failed for ${city}`,
            message: fallbackStatus === "done_stale" ? `Crawl encountered an error; falling back to saved data. ${msg}`.slice(0, 250) : `Pipeline failed: ${msg}`.slice(0, 250),
            link: `/city-competitors?city=${encodeURIComponent(city)}`,
            created_at: new Date().toISOString(),
          });
        } catch (notifErr) {
          console.warn("[mvs-run-pipeline] failed to insert failure notification:", notifErr);
        }
      }
    }

  })();

  // Overall pipeline watchdog: if `work` doesn't resolve within
  // PIPELINE_TIMEOUT_MS, mark the run failed so the UI doesn't lock forever.
  const watchdog = (async () => {
    let timedOut = false;
    const timer = new Promise<void>((resolve) => {
      setTimeout(() => { timedOut = true; resolve(); }, PIPELINE_TIMEOUT_MS);
    });
    await Promise.race([work.catch(() => { /* handled inside work */ }), timer]);
    if (timedOut) {
      console.warn(`[mvs-run-pipeline] watchdog: run ${run.id} exceeded ${PIPELINE_TIMEOUT_MS}ms — marking failed`);
      try {
        await admin
          .from("mvs_pipeline_runs")
          .update({
            status: "failed",
            error: `pipeline watchdog: exceeded ${Math.round(PIPELINE_TIMEOUT_MS / 60000)} min ceiling`,
            finished_at: new Date().toISOString(),
          })
          .eq("id", run.id)
          .in("status", ["queued", "running"]);
      } catch (wdErr) {
        console.warn("[mvs-run-pipeline] watchdog update failed:", wdErr);
      }
    }
  })();

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(watchdog);
  } else {
    // Fallback for local/test environments without EdgeRuntime — fire-and-forget.
    watchdog.catch(() => { /* errors are already persisted to the run row */ });
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
