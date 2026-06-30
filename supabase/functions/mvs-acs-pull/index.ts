// mvs-acs-pull — Stage 4 ACS backfill for a single MVS city.
//
// Purpose: ensure us_cities_scored has children_5_12 and
// dual_working_families_pct populated for the requested city BEFORE the
// scoring helpers (Score 3 Scaled Operator, Score 6 Market Balance) read
// them. For cities already populated (all Tier A), this is a no-op. For
// shortlist cities added later it backfills from county-level ACS so the
// pipeline's Scores 3 and 6 don't silently run on zeros.
//
// Strategy (kept conservative on purpose):
//   1. Look up city centroid lat/lng in us_cities_geo.
//   2. Reverse-geocode to state+county FIPS via Census Geocoder.
//   3. Pull county-level ACS5: total pop, kids 5-12, dual-worker %, affluent %.
//   4. Estimate city-level children_5_12 = county_kids * (city_pop / county_pop).
//   5. Only UPDATE columns that are currently NULL on us_cities_scored —
//      never overwrite existing values.
//
// Auth: manager/admin (matches other MVS step functions). Non-fatal in the
// orchestrator — callers should tolerate a 200 with `skipped: true`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACS_YEAR = 2022;
const CENSUS_API_KEY = Deno.env.get("CENSUS_API_KEY") ?? "";

async function pointToCounty(
  lat: number,
  lng: number,
): Promise<{ state: string; county: string } | null> {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.result?.geographies?.Counties?.[0];
    if (!c) return null;
    return { state: c.STATE, county: c.COUNTY };
  } catch {
    return null;
  }
}

async function countyAcs(state: string, county: string) {
  const vars = [
    "B01003_001E", // total pop
    "B19001_001E", // total HH
    "B19001_016E", // 150-200k
    "B19001_017E", // 200k+
    "B08202_001E", // HH by workers total
    "B08202_007E", // 2-worker
    "B08202_008E", // 3+ worker
    "B09001_005E", // age 3-5
    "B09001_006E", // age 6-8
    "B09001_007E", // age 9-11
    "B09001_008E", // age 12-14
  ].join(",");
  const url = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=${vars}&for=county:${county}&in=state:${state}&key=${CENSUS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length < 2) return null;
  const row = data[1];
  const n = (i: number) => {
    const v = Number(row[i]);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };
  const totalPop = n(0);
  const totalHh = n(1);
  const above150 = n(2) + n(3);
  const totalWorkers = n(4);
  const dual = n(5) + n(6);
  const children5to12 = Math.round(n(7) / 3 + n(8) + n(9) + n(10) / 3);
  return {
    totalPop,
    children5to12,
    pctAbove150k: totalHh > 0 ? (above150 / totalHh) * 100 : 0,
    pctDualIncome: totalWorkers > 0 ? (dual / totalWorkers) * 100 : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: manager/admin (or internal service-role caller)
  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);
  const isServiceRole = authHeader.includes(serviceKey);

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
  const cityKey: string = (body?.city ?? "").trim();
  if (!cityKey || !cityKey.includes(",")) {
    return new Response(
      JSON.stringify({ error: "city is required as 'City, ST'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const [cityName, stateAbbr] = cityKey.split(",").map((s) => s.trim());

  // Look up existing scored row
  // Read existing scored row. Note: us_cities_scored has children_5_12 and
  // dual_working_families_pct but no affluence-percentage column today —
  // affluence is sourced from site_analysis_acs_cache when available.
  const { data: scored } = await admin
    .from("us_cities_scored")
    .select("id, city_name, state_abbr, population, children_5_12, dual_working_families_pct")
    .ilike("city_name", cityName)
    .eq("state_abbr", stateAbbr)
    .maybeSingle();

  if (!scored) {
    return new Response(
      JSON.stringify({ skipped: true, reason: `no us_cities_scored row for ${cityKey}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }


  const needsKids = scored.children_5_12 == null;
  const needsDual = scored.dual_working_families_pct == null;
  if (!needsKids && !needsDual) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "already populated", city: cityKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!CENSUS_API_KEY) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "CENSUS_API_KEY missing" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Get lat/lng from us_cities_geo
  const { data: geo } = await admin
    .from("us_cities_geo")
    .select("lat, lng, population")
    .or(`city_ascii.ilike.${cityName},city.ilike.${cityName}`)
    .ilike("state_id", stateAbbr)
    .maybeSingle();

  if (!geo) {
    return new Response(
      JSON.stringify({ skipped: true, reason: `no us_cities_geo row for ${cityKey}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const fips = await pointToCounty(Number(geo.lat), Number(geo.lng));
  if (!fips) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "county FIPS lookup failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const acs = await countyAcs(fips.state, fips.county);
  if (!acs) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "county ACS fetch failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const cityPop = Number(scored.population ?? geo.population ?? 0);
  const ratio = acs.totalPop > 0 && cityPop > 0
    ? Math.min(1, cityPop / acs.totalPop)
    : null;

  const patch: Record<string, number> = {};
  if (needsKids && ratio != null) {
    patch.children_5_12 = Math.round(acs.children5to12 * ratio);
  }
  if (needsDual) {
    patch.dual_working_families_pct = Number(acs.pctDualIncome.toFixed(1));
  }

  if (Object.keys(patch).length === 0) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "no fillable fields", city: cityKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: updErr } = await admin
    .from("us_cities_scored")
    .update(patch)
    .eq("id", scored.id);
  if (updErr) {
    return new Response(
      JSON.stringify({ error: "update failed", detail: updErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      city: cityKey,
      patched: patch,
      county_fips: fips,
      firecrawl_calls: 0,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
