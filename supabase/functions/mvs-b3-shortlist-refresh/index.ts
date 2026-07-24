// mvs-b3-shortlist-refresh
//
// Phase 1 (fire-and-chain edition):
//
// The outer runner NO LONGER polls per-city. For each city it:
//   1) Normalizes the label to "City, ST" using mvs_shortlist_cities.
//   2) Records a per-city start time on the run row.
//   3) Fires mvs-price-b3 with offset=0 (b3 self-chains internally until the
//      city is fully scanned).
//   4) Writes a heartbeat.
//   5) Sleeps a small stagger (45s) to avoid hammering Apify, then chains
//      itself to the next city.
//
// Progress is measured by counting rows with a real price_confidence value
// ('high' | 'medium' | 'review') written since the city's start time — never
// by raw updated_at, because b3 error rows also bump updated_at.
//
// The run row is written on every step so the sweeper (heartbeat-based) can
// tell a healthy run from a stalled one.
//
// Body (all optional):
//   { cities?: string[]     // "City, ST" or bare "City" — normalized here
//     queue?: string[]      // internal: remaining cities (chained)
//     started_ats?: Record<string, string>  // internal: per-city start ISOs
//     run_id?: string       // internal: tracking row id
//     dryRun?: boolean      // pass through to mvs-price-b3
//   }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// Small delay between city kickoffs so we don't slam Apify with 13 parallel
// b3 chains at once. B3 itself self-chains per city; this just staggers the
// starts.
const STAGGER_MS = 45_000;

Deno.serve(async (req) => {
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
    let startedAts: Record<string, string>;
    let runId: string | null = typeof body.run_id === "string" ? body.run_id : null;

    if (isChainedCall) {
      queue = body.queue as string[];
      startedAts = (body.started_ats ?? {}) as Record<string, string>;
    } else {
      const rawCities: string[] = Array.isArray(body.cities) ? body.cities : [];
      const shortlistLabels = await loadShortlistLabels(admin);

      let inputLabels: string[];
      if (rawCities.length === 0) {
        inputLabels = shortlistLabels;
      } else {
        inputLabels = rawCities
          .map((c) => normalizeLabel(c, shortlistLabels))
          .filter((c): c is string => Boolean(c));
      }
      queue = Array.from(new Set(inputLabels));
      startedAts = {};

      if (queue.length === 0) {
        return new Response(JSON.stringify({
          error: "no valid cities — pass cities:[\"City, ST\"] or leave empty to use shortlist",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Create tracking row.
      const nowIso = new Date().toISOString();
      const { data: runRow, error: runErr } = await admin
        .from("mvs_pipeline_runs")
        .insert({
          city: "__b3_shortlist_refresh__",
          stage: "b3_shortlist_refresh",
          status: "running",
          started_at: nowIso,
          heartbeat_at: nowIso,
          source_counts: {
            total_cities: queue.length,
            queue,
            kicked_off: [],
            current: null,
            started_at: nowIso,
            mode: "fire_and_chain",
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
        const sc = await readSourceCounts(admin, runId);
        await admin.from("mvs_pipeline_runs").update({
          status: "completed",
          finished_at: new Date().toISOString(),
          heartbeat_at: new Date().toISOString(),
          source_counts: { ...sc, done: true, started_ats: startedAts },
        }).eq("id", runId);
      }
      return new Response(JSON.stringify({
        ok: true, done: true, run_id: runId, started_ats: startedAts,
      }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [cityLabel, ...rest] = queue;
    const startedIso = new Date().toISOString();
    startedAts[cityLabel] = startedIso;

    // Heartbeat + mark current city.
    if (runId) {
      const sc = await readSourceCounts(admin, runId);
      const kickedOff = [...(sc.kicked_off ?? []), cityLabel];
      await admin.from("mvs_pipeline_runs").update({
        heartbeat_at: startedIso,
        source_counts: {
          ...sc,
          current: cityLabel,
          current_started_at: startedIso,
          kicked_off: kickedOff,
          started_ats: startedAts,
        },
      }).eq("id", runId);
    }

    // Snapshot eligible count for this city (for observability only —
    // progress is measured elsewhere by counting real prices).
    const eligibleCount = await countEligible(admin, cityLabel);

    // Fire b3 for this city. B3 self-chains internally through its own
    // batches; we DO NOT wait for it here.
    const b3P = fetch(`${supabaseUrl}/functions/v1/mvs-price-b3`, {
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
    }).catch((err) => {
      console.warn(`[mvs-b3-shortlist-refresh] b3 kickoff failed for ${cityLabel}:`, err);
    });
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(b3P);
    }

    // Stagger before chaining to the next city, unless this was the last one.
    if (rest.length > 0) {
      await sleep(STAGGER_MS);

      if (runId) {
        await admin.from("mvs_pipeline_runs").update({
          heartbeat_at: new Date().toISOString(),
        }).eq("id", runId);
      }

      const chainP = fetch(`${supabaseUrl}/functions/v1/mvs-b3-shortlist-refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          queue: rest,
          started_ats: startedAts,
          run_id: runId,
          dryRun,
        }),
      }).catch((err) => console.warn("[mvs-b3-shortlist-refresh] chain failed:", err));
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(chainP);
      }
    } else if (runId) {
      // Last city kicked off. Mark run as "all kicked off" — the sweeper
      // will close it out once b3 stops writing heartbeats. Keep status
      // 'running' so any DB-side progress tracker can observe completion.
      const sc = await readSourceCounts(admin, runId);
      await admin.from("mvs_pipeline_runs").update({
        heartbeat_at: new Date().toISOString(),
        source_counts: {
          ...sc,
          all_kicked_off_at: new Date().toISOString(),
          started_ats: startedAts,
        },
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      just_kicked_off: cityLabel,
      city_started_at: startedIso,
      eligible_snapshot: eligibleCount,
      remaining: rest,
      note: "b3 is self-chaining in the background; progress = rows with real price_confidence written since city_started_at",
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

// Load the shortlist as "City, ST" labels so we can normalize inputs.
async function loadShortlistLabels(admin: any): Promise<string[]> {
  const { data, error } = await admin
    .from("mvs_shortlist_cities")
    .select("city, state");
  if (error) throw new Error(`shortlist read failed: ${error.message}`);
  return (data ?? [])
    .filter((r: any) => r.city && r.state)
    .map((r: any) => `${r.city}, ${r.state}`);
}

// "Carlsbad" → "Carlsbad, CA" if it's on the shortlist.
// "Carlsbad, CA" → passes through unchanged.
// "washington dc" → "Washington, DC" (case-insensitive match).
// Unknown → null (caller filters).
function normalizeLabel(input: string, shortlistLabels: string[]): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  // Already "City, ST" — accept if it matches something on the shortlist
  // (case-insensitive), else keep the given value so callers can still test
  // ad-hoc cities.
  if (raw.includes(",")) {
    const hit = shortlistLabels.find((l) => l.toLowerCase() === raw.toLowerCase());
    return hit ?? raw;
  }

  // Bare city → expand from shortlist.
  const cleaned = raw.replace(/\s+/g, " ").toLowerCase();
  const hit = shortlistLabels.find((l) => l.split(",")[0].trim().toLowerCase() === cleaned);
  return hit ?? null;
}
