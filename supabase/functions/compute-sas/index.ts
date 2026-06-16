// Feature 1B — Site Analysis Engine entrypoint.
// Geocodes the address, pulls 10/15-min isochrones, samples ACS by tract,
// counts nearby schools, computes the SAS pillars, and writes a row to
// public.site_analyses. Demo path on the frontend is unaffected unless the
// VITE_SAS_ENGINE_LIVE flag is true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import {
  geocode,
  isochrone,
  samplePoints,
  haversineMiles,
  polygonHash,
  nearestHighwayNode,
  nearestMajorRoadNode,
  drivingDistanceMiles,
} from "../_shared/mapbox.ts";
import { aggregateAcs } from "../_shared/census.ts";
import { fetchUrbanSchools, STATE_ABBR_TO_FIPS } from "../_shared/urban-institute.ts";
import {
  accessibilityScore,
  affluenceScore,
  compositeSas,
  ecosystemScore,
  familyDensityScore,
  GradeBand,
  round2,
  schoolProfileScore,
  SchoolType,
} from "../_shared/sas-math.ts";

const ENGINE_VERSION = "sas-v0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  address: string;
  school_name?: string | null;
  school_type?: SchoolType | null;
  enrollment?: number | null;
  grade_band?: GradeBand | null;
  // Used by the calibration harness — runs as a signed-in staff user but tags
  // rows so we can sweep them out.
  engine_version_override?: string | null;
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bad(message: string, status = 400) {
  return ok({ error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Identify the user from the JWT.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userResult } = await userClient.auth.getUser();
    const user = userResult?.user;
    if (!user) return bad("Not authenticated", 401);

    const body = (await req.json()) as RequestBody;
    if (!body?.address) return bad("address required");
    // v0.2: school_type, enrollment, grade_band are required inputs. We will
    // not score with synthetic defaults — the caller must supply them.
    if (!body.school_type) return bad("school_type required");
    if (body.enrollment == null || !Number.isFinite(Number(body.enrollment))) {
      return bad("enrollment required (a real integer — engine refuses to fabricate a default)");
    }
    if (!body.grade_band) return bad("grade_band required");
    const schoolType: SchoolType = body.school_type;
    const enrollment = Number(body.enrollment);
    const gradeBand: GradeBand = body.grade_band;
    const engineVersion = body.engine_version_override ?? ENGINE_VERSION;

    // Create the pending row up front so the UI can poll.
    const { data: created, error: createErr } = await supabase
      .from("site_analyses")
      .insert({
        user_id: user.id,
        address: body.address,
        school_name: body.school_name ?? null,
        school_type: schoolType,
        enrollment,
        grade_band: gradeBand,
        status: "running",
        engine_version: engineVersion,
        inputs: { schoolType, enrollment, gradeBand },
      })
      .select("id")
      .single();
    if (createErr || !created) return bad(`insert failed: ${createErr?.message}`, 500);
    const analysisId = created.id;

    const fail = async (msg: string) => {
      await supabase
        .from("site_analyses")
        .update({ status: "failed", error: msg })
        .eq("id", analysisId);
      return ok({ analysis_id: analysisId, status: "failed", error: msg }, 200);
    };

    // 1) Geocode.
    let geo;
    try {
      geo = await geocode(body.address);
    } catch (e) {
      return await fail(`geocode: ${(e as Error).message}`);
    }

    // 2) Isochrones (10 + 15 min) in parallel.
    let iso10: GeoJSON.Polygon, iso15: GeoJSON.Polygon;
    try {
      [iso10, iso15] = await Promise.all([
        isochrone(geo.lat, geo.lng, 10),
        isochrone(geo.lat, geo.lng, 15),
      ]);
    } catch (e) {
      return await fail(`isochrone: ${(e as Error).message}`);
    }
    await supabase.from("site_analysis_isochrones").insert([
      { analysis_id: analysisId, minutes: 10, provider: "mapbox", geojson: iso10 },
      { analysis_id: analysisId, minutes: 15, provider: "mapbox", geojson: iso15 },
    ]);

    // 3) ACS for each ring (sample-point approximation, cached by polygon hash).
    //    v0.2: no silent zero-coalescing. If a cached row has NULL columns we
    //    treat it as a stale/bad cache entry and re-aggregate from Census.
    const finiteOrNull = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const cacheRowComplete = (c: Record<string, unknown>): boolean => {
      return [
        c.median_hhi,
        c.pct_hh_above_150k,
        c.pct_dual_income,
        c.children_5_12,
        c.families_with_kids_5_12,
        c.total_population,
      ].every((v) => finiteOrNull(v) != null);
    };
    const acsRing = async (poly: GeoJSON.Polygon, minutes: 10 | 15) => {
      const hash = polygonHash(poly);
      const { data: cached } = await supabase
        .from("site_analysis_acs_cache")
        .select("*")
        .eq("polygon_hash", hash)
        .maybeSingle();
      if (cached && cacheRowComplete(cached as Record<string, unknown>)) {
        return {
          medianHhi: Number(cached.median_hhi),
          pctAbove150k: Number(cached.pct_hh_above_150k),
          pctDualIncome: Number(cached.pct_dual_income),
          children5to12: Number(cached.children_5_12),
          familiesWithKids: Number(cached.families_with_kids_5_12),
          totalPop: Number(cached.total_population),
          tractsHit: 0,
        };
      }
      const agg = await aggregateAcs(samplePoints(poly, 5));
      // Guard the freshly aggregated row too — never persist a partial cache.
      const fields = [agg.medianHhi, agg.pctAbove150k, agg.pctDualIncome, agg.children5to12, agg.familiesWithKids, agg.totalPop];
      if (!fields.every((n) => Number.isFinite(n))) {
        throw new Error(`ACS aggregation incomplete for ${minutes}-min ring — refusing to fabricate zeros`);
      }
      await supabase.from("site_analysis_acs_cache").upsert(
        {
          polygon_hash: hash,
          minutes,
          median_hhi: agg.medianHhi,
          pct_hh_above_150k: agg.pctAbove150k,
          pct_dual_income: agg.pctDualIncome,
          children_5_12: agg.children5to12,
          families_with_kids_5_12: agg.familiesWithKids,
          total_population: agg.totalPop,
          raw: { tractsHit: agg.tractsHit },
        },
        { onConflict: "polygon_hash" },
      );
      return agg;
    };
    const [acs10, acs15] = await Promise.all([acsRing(iso10, 10), acsRing(iso15, 15)]);

    // 4) Ecosystem: nearby school counts.
    //    PRIMARY: Urban Institute Education Data Portal (CCD = public,
    //    PSS = private), state-scoped fetch, cached 30 days, haversine-filtered.
    //    FALLBACK: internal public_schools haversine box. Used when the Urban
    //    Institute API is unreachable (currently blocked by Cloudflare bot
    //    challenges for server-side callers — tracked for resolution).
    const RADIUS_MI = 10;
    const stateFips = geo.stateCode ? STATE_ABBR_TO_FIPS[geo.stateCode] : null;
    let elementaryCount = 0, privateCount = 0, nearbyStudentPop = 0;
    let publicTotal = 0, privateTotal = 0;
    let ecosystemProvider: "urban_institute" | "public_schools_fallback" | "none" = "none";
    let ecosystemError: string | null = null;

    if (stateFips) {
      try {
        const [publicSchools, privateSchools] = await Promise.all([
          fetchUrbanSchools(supabase, { source: "ccd", stateFips }),
          fetchUrbanSchools(supabase, { source: "pss", stateFips }),
        ]);
        publicTotal = publicSchools.length;
        privateTotal = privateSchools.length;
        for (const s of [...publicSchools, ...privateSchools]) {
          const d = haversineMiles({ lat: geo.lat, lng: geo.lng }, { lat: s.lat, lng: s.lng });
          if (d > RADIUS_MI) continue;
          if (s.level === "elementary") elementaryCount++;
          if (s.kind === "private") privateCount++;
          if (s.enrollment != null) nearbyStudentPop += s.enrollment;
        }
        if (publicTotal + privateTotal > 0) ecosystemProvider = "urban_institute";
      } catch (e) {
        ecosystemError = (e as Error).message;
        console.error("[compute-sas] Urban Institute fetch failed:", ecosystemError);
      }
    }

    if (ecosystemProvider === "none") {
      // Fallback: original public_schools box query.
      const RADIUS_DEG = RADIUS_MI / 69;
      const { data: nearby } = await supabase
        .from("public_schools")
        .select("school_name, school_level, school_type, enrollment, latitude, longitude")
        .gte("latitude", geo.lat - RADIUS_DEG)
        .lte("latitude", geo.lat + RADIUS_DEG)
        .gte("longitude", geo.lng - RADIUS_DEG)
        .lte("longitude", geo.lng + RADIUS_DEG)
        .limit(2000);
      for (const r of nearby ?? []) {
        const lat = Number(r.latitude), lng = Number(r.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const d = haversineMiles({ lat: geo.lat, lng: geo.lng }, { lat, lng });
        if (d > RADIUS_MI) continue;
        const level = String(r.school_level ?? "").toLowerCase();
        const type = String(r.school_type ?? "").toLowerCase();
        if (level.includes("elementary") || level.includes("primary")) elementaryCount++;
        if (type.includes("private")) privateCount++;
        nearbyStudentPop += Number(r.enrollment) || 0;
      }
      ecosystemProvider = "public_schools_fallback";
    }

    const ecosystemSource = {
      provider: ecosystemProvider,
      state_fips: stateFips,
      state_code: geo.stateCode,
      ccd_year: 2022,
      pss_year: 2021,
      error: ecosystemError,
    };

    // 5) Accessibility v0.2 — measure real drive distance to nearest hwy + major road.
    //    No silent fallback: if Overpass or Mapbox Directions fails, the whole
    //    analysis is marked failed with an explicit error. We never substitute
    //    a synthetic constant for a missing distance.
    const [hwyNode, roadNode] = await Promise.all([
      nearestHighwayNode(geo.lat, geo.lng),
      nearestMajorRoadNode(geo.lat, geo.lng),
    ]);
    const [highwayDistanceMi, roadDistanceMi] = await Promise.all([
      hwyNode ? drivingDistanceMiles({ lat: geo.lat, lng: geo.lng }, hwyNode) : Promise.resolve(null),
      roadNode ? drivingDistanceMiles({ lat: geo.lat, lng: geo.lng }, roadNode) : Promise.resolve(null),
    ]);

    const accessibilityFailures: string[] = [];
    if (hwyNode == null) accessibilityFailures.push("overpass_highway_node");
    else if (highwayDistanceMi == null) accessibilityFailures.push("mapbox_directions_highway");
    if (roadNode == null) accessibilityFailures.push("overpass_major_road_node");
    else if (roadDistanceMi == null) accessibilityFailures.push("mapbox_directions_road");

    if (accessibilityFailures.length > 0 || highwayDistanceMi == null || roadDistanceMi == null) {
      // Persist what we know so the failure is debuggable, then fail loudly.
      await supabase
        .from("site_analyses")
        .update({
          latitude: geo.lat,
          longitude: geo.lng,
          signals: {
            acs10,
            acs15,
            accessibility: {
              highwayDistanceMi: highwayDistanceMi == null ? null : round2(highwayDistanceMi),
              roadDistanceMi: roadDistanceMi == null ? null : round2(roadDistanceMi),
              failures: accessibilityFailures,
            },
            version: ENGINE_VERSION,
          },
        })
        .eq("id", analysisId);
      return await fail(
        `Accessibility lookup failed (${accessibilityFailures.join(", ")}). ` +
          `Live road/highway distances unavailable — refusing to compute a score with synthetic data. ` +
          `This usually clears within a minute (Overpass rate limit); please retry.`,
      );
    }

    // 6) Score.
    const pillars = {
      schoolProfile: schoolProfileScore({ schoolType, enrollment, gradeBand }),
      affluence: affluenceScore({
        medianHhi10: acs10.medianHhi,
        pctAbove150k10: acs10.pctAbove150k,
        pctDualIncome10: acs10.pctDualIncome,
        medianHhi15: acs15.medianHhi,
        pctAbove150k15: acs15.pctAbove150k,
        pctDualIncome15: acs15.pctDualIncome,
      }),
      familyDensity: familyDensityScore({
        children5to12_10: acs10.children5to12,
        children5to12_15: acs15.children5to12,
        familiesWithKids5to12_10: acs10.familiesWithKids,
      }),
      ecosystem: ecosystemScore({
        elementaryCount,
        privateCount,
        nearbyStudentPop,
      }),
      accessibility: accessibilityScore({
        roadDistanceMi,
        highwayDistanceMi,
        popReachable15: acs15.totalPop,
      }),
    };
    const sas = compositeSas(pillars);

    const signals = {
      acs10,
      acs15,
      ecosystem: {
        elementaryCount,
        privateCount,
        nearbyStudentPop,
        publicTotalInState: publicTotal,
        privateTotalInState: privateTotal,
        source: ecosystemSource,
      },
      accessibility: {
        highwayDistanceMi: round2(highwayDistanceMi),
        roadDistanceMi: round2(roadDistanceMi),
      },
      version: ENGINE_VERSION,
    };

    const { error: updateErr } = await supabase
      .from("site_analyses")
      .update({
        latitude: geo.lat,
        longitude: geo.lng,
        sas_score: round2(sas),
        school_profile_score: round2(pillars.schoolProfile),
        affluence_score: round2(pillars.affluence),
        family_density_score: round2(pillars.familyDensity),
        ecosystem_score: round2(pillars.ecosystem),
        accessibility_score: round2(pillars.accessibility),
        signals,
        status: "ready",
        error: null,
      })
      .eq("id", analysisId);
    if (updateErr) return await fail(`update: ${updateErr.message}`);

    return ok({
      analysis_id: analysisId,
      status: "ready",
      sas: round2(sas),
      pillars: {
        schoolProfile: round2(pillars.schoolProfile),
        affluence: round2(pillars.affluence),
        familyDensity: round2(pillars.familyDensity),
        ecosystem: round2(pillars.ecosystem),
        accessibility: round2(pillars.accessibility),
      },
      signals,
      place: geo.placeName,
    });
  } catch (e) {
    console.error("[compute-sas] uncaught", e);
    return bad((e as Error).message, 500);
  }
});
