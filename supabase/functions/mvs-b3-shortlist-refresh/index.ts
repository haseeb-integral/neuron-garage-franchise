// mvs-b3-shortlist-refresh
//
// Phase 1a: Sequential B3 price refresh for every shortlisted city.
//
// Runs one city at a time (never in parallel) to avoid overloading the AI
// Gateway / Apify. For each city:
//   1) Snapshot the starting count of eligible providers.
//   2) POST mvs-price-b3 with offset=0. That function self-chains internally
//      through its own batches until the whole city is scanned.
//   3) Poll mvs_providers for that city until updated_at coverage looks done
//      (all eligible providers have a fresh price_confidence value written
//      after the start timestamp), or the polling budget is exhausted.
//   4) HTTP self-chain to the next city with the remaining queue.
//
// State lives in the request body (`queue`, `results`, `run_id`). A single
// tracking row in mvs_pipeline_runs (stage = "b3_shortlist_refresh") holds
// the live progress so the UI/curl can watch it.
//
// Body (all optional):
//   { cities?: string[]           // explicit "City, ST" list; defaults to shortlist
//     queue?: string[]            // internal: remaining cities (for self-chain)
//     results?: Record<string, unknown>  // internal: accumulated per-city results
//     run_id?: string             // internal: tracking row id
//     dryRun?: boolean            // pass through to mvs-price-b3
//   }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// Per-city polling budget. b3 processes ~4 providers concurrently in batches
// of 8; a 200-provider city takes ~6-8 min end-to-end. We poll up to 12 min
// per city, then move on regardless.
const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_MS = 8 * 60_000;                // per-city poll budget
const STABLE_CHECKS_TO_FINISH = 3;             // eligible-count stable for this many polls
// Wall-clock budget for this single invocation. Edge functions are killed
// around ~15 min; stop polling early and chain when we're close to it so the
// next city always gets kicked off, even if the current city isn't "done".
const INVOCATION_BUDGET_MS = 9 * 60_000;

Deno.serve(async (req) => {
  const invocationStart = Date.now();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({} as any));
    const dryRun = Boolean(body.dryRun ?? false);
    const isChainedCall = Array.isArray(body.queue);

    // First call: manager/admin auth check; chained calls use service-role and skip.
    if (!isChainedCall) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["manager", "admin"]);
      if (!roleRows || roleRows.length === 0) {
        return new Response(JSON.stringify({ error: "forbidden: manager required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build or receive the queue.
    let queue: string[];
    let results: Record<string, any>;
    let runId: string | null = typeof body.run_id === "string" ? body.run_id : null;

    if (isChainedCall) {
      queue = body.queue as string[];
      results = (body.results ?? {}) as Record<string, any>;
    } else {
      let cities: string[] = Array.isArray(body.cities) ? body.cities : [];
      if (cities.length === 0) {
        const { data: rows, error } = await admin
          .from("mvs_shortlist_cities")
          .select("city, state");
        if (error) throw new Error(`shortlist read failed: ${error.message}`);
        cities = (rows ?? [])
          .filter((r: any) => r.city && r.state)
          .map((r: any) => `${r.city}, ${r.state}`);
      }
      queue = Array.from(new Set(cities));
      results = {};

      // Create tracking row for live progress.
      const { data: runRow, error: runErr } = await admin
        .from("mvs_pipeline_runs")
        .insert({
          city: "__b3_shortlist_refresh__",
          stage: "b3_shortlist_refresh",
          status: "running",
          started_at: new Date().toISOString(),
          source_counts: {
            total_cities: queue.length,
            queue,
            completed: [],
            current: null,
            started_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();
      if (runErr) throw new Error(`run row insert failed: ${runErr.message}`);
      runId = runRow.id as string;
    }

    // Nothing left → mark done and return.
    if (queue.length === 0) {
      if (runId) {
        await admin.from("mvs_pipeline_runs").update({
          status: "completed",
          finished_at: new Date().toISOString(),
          source_counts: {
            ...(await readSourceCounts(admin, runId)),
            done: true,
            results,
          },
        }).eq("id", runId);
      }
      return new Response(JSON.stringify({ ok: true, done: true, run_id: runId, results }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [cityLabel, ...rest] = queue;
    const started = Date.now();
    const startedIso = new Date(started).toISOString();

    // Mark current city on the tracking row.
    if (runId) {
      const sc = await readSourceCounts(admin, runId);
      await admin.from("mvs_pipeline_runs").update({
        source_counts: { ...sc, current: cityLabel, current_started_at: startedIso },
      }).eq("id", runId);
    }

    // How many providers are eligible right now?
    const eligibleCount = await countEligible(admin, cityLabel);

    // Kick off mvs-price-b3 (fire-and-forget). It self-chains internally.
    const b3Response = await fetch(`${supabaseUrl}/functions/v1/mvs-price-b3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        city: cityLabel,
        offset: 0,
        batchSize: 8,
        totalLimit: 500,
        dryRun,
      }),
    });
    const b3Text = await b3Response.text();
    let b3First: any = null;
    try { b3First = JSON.parse(b3Text); } catch { /* keep raw */ }

    // Poll until every eligible provider has a fresh updated_at (>= startedIso).
    let lastRefreshed = -1;
    let stable = 0;
    let doneReason = "timeout";
    const deadline = started + MAX_POLL_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const refreshed = await countRefreshed(admin, cityLabel, startedIso);
      if (refreshed >= eligibleCount && eligibleCount > 0) {
        doneReason = "complete";
        lastRefreshed = refreshed;
        break;
      }
      if (refreshed === lastRefreshed) {
        stable += 1;
        if (stable >= STABLE_CHECKS_TO_FINISH) {
          doneReason = "stable";
          break;
        }
      } else {
        stable = 0;
        lastRefreshed = refreshed;
      }
      if (runId) {
        const sc = await readSourceCounts(admin, runId);
        await admin.from("mvs_pipeline_runs").update({
          source_counts: {
            ...sc,
            current: cityLabel,
            current_progress: { refreshed, eligible: eligibleCount, stable_polls: stable },
          },
        }).eq("id", runId);
      }
    }

    const finalRefreshed = lastRefreshed >= 0
      ? await countRefreshed(admin, cityLabel, startedIso)
      : 0;
    const finalHigh = await countConfidence(admin, cityLabel, startedIso, "high");
    const finalMedium = await countConfidence(admin, cityLabel, startedIso, "medium");
    const finalReview = await countConfidence(admin, cityLabel, startedIso, "review");

    const cityResult = {
      eligible: eligibleCount,
      refreshed: finalRefreshed,
      high: finalHigh,
      medium: finalMedium,
      review: finalReview,
      done_reason: doneReason,
      duration_ms: Date.now() - started,
      b3_first_response: b3First ? {
        providers_scanned: b3First.providers_scanned,
        apify_calls: b3First.apify_calls,
        gemini_calls: b3First.gemini_calls,
      } : null,
    };
    results[cityLabel] = cityResult;

    // Update tracking row: mark this city done.
    if (runId) {
      const sc = await readSourceCounts(admin, runId);
      const completed = [...(sc.completed ?? []), cityLabel];
      await admin.from("mvs_pipeline_runs").update({
        source_counts: {
          ...sc,
          current: null,
          current_progress: null,
          completed,
          results,
        },
      }).eq("id", runId);
    }

    // Chain to the next city.
    if (rest.length > 0) {
      const chainP = fetch(`${supabaseUrl}/functions/v1/mvs-b3-shortlist-refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ queue: rest, results, run_id: runId, dryRun }),
      }).catch((err) => console.warn("[mvs-b3-shortlist-refresh] chain failed:", err));
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(chainP);
      }
    } else if (runId) {
      await admin.from("mvs_pipeline_runs").update({
        status: "completed",
        finished_at: new Date().toISOString(),
        source_counts: {
          ...(await readSourceCounts(admin, runId)),
          done: true,
          results,
        },
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      just_processed: cityLabel,
      city_result: cityResult,
      remaining: rest,
      results,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[mvs-b3-shortlist-refresh] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readSourceCounts(admin: any, runId: string): Promise<Record<string, any>> {
  const { data } = await admin
    .from("mvs_pipeline_runs")
    .select("source_counts")
    .eq("id", runId)
    .maybeSingle();
  return (data?.source_counts ?? {}) as Record<string, any>;
}

async function countEligible(admin: any, cityLabel: string): Promise<number> {
  const { count } = await admin
    .from("mvs_providers")
    .select("id", { count: "exact", head: true })
    .eq("city", cityLabel)
    .is("category_excluded_reason", null);
  return count ?? 0;
}

async function countRefreshed(admin: any, cityLabel: string, sinceIso: string): Promise<number> {
  const { count } = await admin
    .from("mvs_providers")
    .select("id", { count: "exact", head: true })
    .eq("city", cityLabel)
    .is("category_excluded_reason", null)
    .gte("updated_at", sinceIso);
  return count ?? 0;
}

async function countConfidence(
  admin: any, cityLabel: string, sinceIso: string, level: string,
): Promise<number> {
  const { count } = await admin
    .from("mvs_providers")
    .select("id", { count: "exact", head: true })
    .eq("city", cityLabel)
    .eq("price_confidence", level)
    .gte("updated_at", sinceIso);
  return count ?? 0;
}
