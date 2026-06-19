// mvs-refresh-all — trigger mvs-run-pipeline for every city that already
// has live providers (intersected with the Tier A allow-list). Each pipeline
// run executes in the background, so this function returns within a few
// seconds with a summary of which cities were kicked off vs. skipped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  "Denver, CO",
]);

const STALE_MS = 3 * 60 * 1000;
const DELAY_BETWEEN_CITIES_MS = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: manager/admin
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

  // Run union of: cities that already have providers AND user's shortlist.
  // Without the shortlist branch, brand-new cities (e.g. Denver with 0 providers)
  // would never get seeded.
  const { data: provRows, error: provErr } = await admin
    .from("mvs_providers")
    .select("city");
  if (provErr) {
    return new Response(
      JSON.stringify({ error: "failed to read mvs_providers", detail: provErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { data: shortlistRows } = await admin
    .from("mvs_shortlist_cities")
    .select("city, state");
  const shortlistKeys = (shortlistRows ?? [])
    .map((r) => (r.city && r.state ? `${r.city}, ${r.state}` : null))
    .filter((s): s is string => !!s);

  const allCities = Array.from(new Set([
    ...((provRows ?? []).map((r) => r.city).filter(Boolean) as string[]),
    ...shortlistKeys,
  ]));
  const cities = allCities.filter((c) => TIER_A_CITIES.has(c)).sort();

  // Detect in-flight runs so we don't kick a duplicate.
  const staleCutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data: inflightRows } = await admin
    .from("mvs_pipeline_runs")
    .select("city, status, started_at")
    .in("status", ["queued", "running"])
    .gte("started_at", staleCutoff);
  const inflight = new Set((inflightRows ?? []).map((r) => r.city));

  const triggered: { city: string; run_id?: string; already_running?: boolean }[] = [];
  const skipped: { city: string; reason: string }[] = [];

  for (const city of cities) {
    if (inflight.has(city)) {
      skipped.push({ city, reason: "already in flight" });
      continue;
    }
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/mvs-run-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          apikey: anonKey,
        },
        body: JSON.stringify({ city }),
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* keep raw */ }
      if (!res.ok) {
        skipped.push({ city, reason: `pipeline HTTP ${res.status}: ${json?.error ?? text.slice(0, 200)}` });
      } else {
        triggered.push({ city, run_id: json?.run_id, already_running: json?.already_running });
      }
    } catch (e) {
      skipped.push({ city, reason: e instanceof Error ? e.message : String(e) });
    }
    // Brief pause so we don't burst Firecrawl across cities.
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CITIES_MS));
  }

  return new Response(
    JSON.stringify({
      ok: true,
      total_cities_with_providers: allCities.length,
      tier_a_cities_processed: cities.length,
      triggered,
      skipped,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
