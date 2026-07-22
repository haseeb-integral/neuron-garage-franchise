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
  polygonAreaSqMi,
  nearestHighwayNode,
  nearestMajorRoadNode,
  drivingDistanceMiles,
  parkingSignal,
} from "../_shared/mapbox.ts";
import { aggregateAcs, censusApiUrl, dataCensusUrl } from "../_shared/census.ts";
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

const ENGINE_VERSION = "sas-v0.4";

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
    // Service-role client: MUST NOT forward the caller's Authorization header,
    // otherwise PostgREST treats writes as the end user and RLS applies.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
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
        c.pct_hh_above_200k,
        c.hh_above_200k,
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
      const cacheStillValid =
        cached &&
        cacheRowComplete(cached as Record<string, unknown>) &&
        (!cached.expires_at || new Date(cached.expires_at as string) > new Date());
      if (cacheStillValid) {
        const cachedRaw = (cached as Record<string, unknown>).raw as
          | { tractsHit?: number; tracts?: Array<{ state: string; county: string; tract: string }> }
          | null;
        const createdAt = (cached as Record<string, unknown>).created_at as string | undefined;
        return {
          medianHhi: Number(cached.median_hhi),
          pctAbove150k: Number(cached.pct_hh_above_150k),
          pctAbove200k: Number((cached as Record<string, unknown>).pct_hh_above_200k),
          hhAbove200k: Number((cached as Record<string, unknown>).hh_above_200k),
          pctDualIncome: Number(cached.pct_dual_income),
          children5to12: Number(cached.children_5_12),
          familiesWithKids: Number(cached.families_with_kids_5_12),
          totalPop: Number(cached.total_population),
          tractsHit: Number(cachedRaw?.tractsHit ?? 0),
          tracts: cachedRaw?.tracts ?? [],
          fromCache: true as const,
          cacheCreatedAt: createdAt ?? null,
        };
      }
      const agg = await aggregateAcs(samplePoints(poly, 5));
      const fields = [agg.medianHhi, agg.pctAbove150k, agg.pctAbove200k, agg.hhAbove200k, agg.pctDualIncome, agg.children5to12, agg.familiesWithKids, agg.totalPop];
      if (!fields.every((n) => Number.isFinite(n))) {
        throw new Error(`ACS aggregation incomplete for ${minutes}-min ring — refusing to fabricate zeros`);
      }
      await supabase.from("site_analysis_acs_cache").upsert(
        {
          polygon_hash: hash,
          minutes,
          median_hhi: agg.medianHhi,
          pct_hh_above_150k: agg.pctAbove150k,
          pct_hh_above_200k: agg.pctAbove200k,
          hh_above_200k: agg.hhAbove200k,
          pct_dual_income: agg.pctDualIncome,
          children_5_12: agg.children5to12,
          families_with_kids_5_12: agg.familiesWithKids,
          total_population: agg.totalPop,
          raw: { tractsHit: agg.tractsHit, tracts: agg.tracts },
        },
        { onConflict: "polygon_hash" },
      );
      return { ...agg, fromCache: false as const, cacheCreatedAt: null };
    };
    const [acs10, acs15] = await Promise.all([acsRing(iso10, 10), acsRing(iso15, 15)]);

    // Bug-2 fix (Manus 1B calibration analysis): `acs15.totalPop` is the sum
    // of population over the unique Census tracts touched by our sample
    // points. Even after the dense-sampling fix in mapbox.samplePoints, that
    // sum systematically under-counts because (a) we dedupe per tract and (b)
    // not every tract inside the isochrone is hit by a sample point.
    //
    // Extrapolate by area: avg tract density × isochrone area. Urban Census
    // tracts target ~4k residents and average ~2 sq mi; we use the observed
    // avg-pop-per-tract from the sample and 2.0 sq mi as the urban tract
    // area assumption. This restores the accessibility pop term to the
    // 200k–500k magnitude the methodology's 50k–500k normalization expects.
    const AVG_URBAN_TRACT_SQMI = 2.0;
    const iso15AreaSqMi = polygonAreaSqMi(iso15);
    const avgTractPop15 = acs15.tractsHit > 0
      ? acs15.totalPop / acs15.tractsHit
      : 0;
    const popReachable15Extrapolated = avgTractPop15 > 0 && iso15AreaSqMi > 0
      ? avgTractPop15 * (iso15AreaSqMi / AVG_URBAN_TRACT_SQMI)
      : acs15.totalPop; // fall back to raw sum if we can't extrapolate


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
        const e = Number(r.enrollment);
        if (Number.isFinite(e)) nearbyStudentPop += e; // skip if enrollment unknown — never substitute 0
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
          `All OSM Overpass mirrors are temporarily unreachable; please retry in a minute.`,
      );
    }

    // 6) Score. Any sas-math throw means a required input was missing — we
    //    refuse to substitute a synthetic default and mark the row failed.
    let pillars;
    try {
      pillars = {
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
          popReachable15: popReachable15Extrapolated,
        }),
      };
    } catch (e) {
      return await fail(`scoring: ${(e as Error).message}`);
    }
    const sas = compositeSas(pillars);

    // Parking (v0.2 informational) — runs in parallel with scoring above is
    // harder to read; sequential here is fine since tilequery is one fast call.
    const parking = await parkingSignal(geo.lat, geo.lng);

    // ---------------------------------------------------------------------
    // Provenance — every pillar carries plain-English source meta so the UI
    // can render "Fresh / From cache / Backup source" chips and verify-with-
    // link buttons. We build URLs the user can paste in a browser to confirm.
    // ---------------------------------------------------------------------
    const nowIso = new Date().toISOString();
    const ageDays = (iso?: string | null): number | null => {
      if (!iso) return null;
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return null;
      return Math.max(0, Math.round((Date.now() - t) / (24 * 3600 * 1000)));
    };
    // Group tracts by state+county so we can build one Census API URL per group.
    const groupTracts = (
      tracts: Array<{ state: string; county: string; tract: string }>,
    ) => {
      const groups = new Map<string, { state: string; county: string; tracts: string[] }>();
      for (const t of tracts) {
        const key = `${t.state}-${t.county}`;
        const g = groups.get(key) ?? { state: t.state, county: t.county, tracts: [] };
        g.tracts.push(t.tract);
        groups.set(key, g);
      }
      return [...groups.values()];
    };
    const tractGroups = groupTracts([
      ...(acs10.tracts ?? []),
      ...(acs15.tracts ?? []),
    ]);
    const censusLinks = tractGroups.flatMap((g) => [
      {
        label: `Census API · state ${g.state} county ${g.county} (${g.tracts.length} tracts)`,
        url: censusApiUrl(g.state, g.county, g.tracts, [
          "B19013_001E",
          "B01003_001E",
          "B11003_002E",
        ]),
      },
      ...(g.tracts.slice(0, 1).map((tr) => ({
        label: `data.census.gov · tract ${tr} profile`,
        url: dataCensusUrl(g.state, g.county, tr),
      }))),
    ]);
    const censusAge10 = acs10.fromCache ? ageDays(acs10.cacheCreatedAt) : 0;
    const censusAge15 = acs15.fromCache ? ageDays(acs15.cacheCreatedAt) : 0;
    const censusStatus: "fresh" | "cached" =
      acs10.fromCache && acs15.fromCache ? "cached" : "fresh";

    const ecosystemStatus =
      ecosystemProvider === "urban_institute"
        ? "fresh"
        : ecosystemProvider === "public_schools_fallback"
        ? "backup_source"
        : "missing";
    const ecosystemLinks =
      ecosystemProvider === "urban_institute" && stateFips
        ? [
            {
              label: `Urban Institute CCD ${2022} (public, state ${stateFips})`,
              url: `https://educationdata.urban.org/api/v1/schools/ccd/directory/2022/?fips=${stateFips}&per_page=1000`,
            },
            {
              label: `Urban Institute PSS ${2021} (private, state ${stateFips})`,
              url: `https://educationdata.urban.org/api/v1/schools/pss/directory/2021/?fips=${stateFips}&per_page=1000`,
            },
            {
              label: "Education Data Portal · documentation",
              url: "https://educationdata.urban.org/documentation/schools.html",
            },
          ]
        : [
            {
              label: "Internal public_schools table (Education Data Portal fallback)",
              url: "https://educationdata.urban.org/documentation/schools.html",
            },
          ];

    const gmapsDir = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
      `https://www.google.com/maps/dir/${a.lat},${a.lng}/${b.lat},${b.lng}`;

    const accessibilityLinks = [
      ...(hwyNode
        ? [
            {
              label: "Verify drive to highway · Google Maps",
              url: gmapsDir({ lat: geo.lat, lng: geo.lng }, hwyNode),
            },
          ]
        : []),
      ...(roadNode
        ? [
            {
              label: "Verify drive to major road · Google Maps",
              url: gmapsDir({ lat: geo.lat, lng: geo.lng }, roadNode),
            },
          ]
        : []),
      {
        label: "OpenStreetMap viewer at this point",
        url: `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lng}#map=14/${geo.lat}/${geo.lng}`,
      },
    ];

    const provenance = {
      schoolProfile: {
        label: "User input (school name, type, grade band, enrollment)",
        status: "user_input" as const,
        fetchedAt: nowIso,
        note: `You entered: type=${schoolType}, grade=${gradeBand}, enrollment=${enrollment}.`,
        verifyLinks: [],
      },
      affluence: {
        label: "US Census ACS 5-Year Survey",
        status: censusStatus,
        provider: "us_census_acs",
        year: 2022,
        fetchedAt: acs10.fromCache ? acs10.cacheCreatedAt : nowIso,
        cacheAgeDays: censusAge10,
        note:
          "Median household income (B19013_001E) and households >$150k (B19001_016E + B19001_017E) " +
          "averaged across census tracts inside the 10- and 15-min drive isochrones.",
        verifyLinks: censusLinks,
      },
      familyDensity: {
        label: "US Census ACS 5-Year Survey",
        status: censusStatus,
        provider: "us_census_acs",
        year: 2022,
        fetchedAt: acs15.fromCache ? acs15.cacheCreatedAt : nowIso,
        cacheAgeDays: censusAge15,
        heuristic: true,
        note:
          "Kids 5–12 estimated by blending Census age bands B09001_005E/006E/007E/008E " +
          "(1/3 of 3–5 + full 6–11 + 1/3 of 12–14). 'Families with kids' = B11003_002E × 0.5 " +
          "— a rough proxy, not a direct measurement.",
        verifyLinks: censusLinks,
      },
      ecosystem: {
        label:
          ecosystemProvider === "urban_institute"
            ? "Urban Institute Education Data Portal (CCD + PSS)"
            : ecosystemProvider === "public_schools_fallback"
            ? "Internal public_schools table (Urban Institute unavailable)"
            : "No source",
        status: ecosystemStatus as "fresh" | "backup_source" | "missing",
        provider: ecosystemProvider,
        year: ecosystemProvider === "urban_institute" ? "CCD 2022 + PSS 2021" : null,
        fetchedAt: nowIso,
        error: ecosystemError,
        note:
          ecosystemProvider === "urban_institute"
            ? `Public schools = CCD 2022 directory, private schools = PSS 2021 directory, filtered to within ${RADIUS_MI} mi of the pin.`
            : "Urban Institute API was unreachable on this run — fell back to our internal public_schools snapshot.",
        verifyLinks: ecosystemLinks,
      },
      accessibility: {
        label: "OpenStreetMap (Overpass) + Mapbox Directions",
        status: "fresh" as const,
        provider: "osm_mapbox",
        fetchedAt: nowIso,
        note:
          "Nearest motorway / trunk and major road found via Overpass query; drive distance " +
          "measured by Mapbox Directions API.",
        verifyLinks: accessibilityLinks,
      },
      accessibilityHwy: {
        label: "OpenStreetMap (Overpass) + Mapbox Directions · highway leg",
        status: "fresh" as const,
        provider: "osm_mapbox",
        fetchedAt: nowIso,
        note: hwyNode
          ? `Nearest motorway/trunk node at (${hwyNode.lat.toFixed(4)}, ${hwyNode.lng.toFixed(4)}).`
          : null,
        verifyLinks: hwyNode
          ? [
              {
                label: "Verify on Google Maps",
                url: gmapsDir({ lat: geo.lat, lng: geo.lng }, hwyNode),
              },
            ]
          : [],
      },
      accessibilityRoad: {
        label: "OpenStreetMap (Overpass) + Mapbox Directions · major road leg",
        status: "fresh" as const,
        provider: "osm_mapbox",
        fetchedAt: nowIso,
        note: roadNode
          ? `Nearest major road node at (${roadNode.lat.toFixed(4)}, ${roadNode.lng.toFixed(4)}).`
          : null,
        verifyLinks: roadNode
          ? [
              {
                label: "Verify on Google Maps",
                url: gmapsDir({ lat: geo.lat, lng: geo.lng }, roadNode),
              },
            ]
          : [],
      },
      popReachable: {
        label: "US Census ACS 5-Year Survey · extrapolated by area",
        status: "heuristic" as const,
        provider: "us_census_acs",
        year: 2022,
        fetchedAt: nowIso,
        heuristic: true,
        note:
          `Raw tract-sum ${Math.round(acs15.totalPop).toLocaleString()} people scaled to ` +
          `${Math.round(popReachable15Extrapolated).toLocaleString()} using avg tract density ` +
          `(${(acs15.tractsHit > 0 ? acs15.totalPop / acs15.tractsHit : 0).toFixed(0)} pop/tract) ` +
          `× isochrone area (${round2(iso15AreaSqMi)} sq mi ÷ ${AVG_URBAN_TRACT_SQMI} sq mi/tract).`,
        verifyLinks: censusLinks,
      },
    };

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
        popReachable15Raw: acs15.totalPop,
        popReachable15Extrapolated: Math.round(popReachable15Extrapolated),
        iso15AreaSqMi: round2(iso15AreaSqMi),
      },
      parking,
      provenance,
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
      geo: { lat: geo.lat, lng: geo.lng },
      iso10,
      iso15,
    });
  } catch (e) {
    console.error("[compute-sas] uncaught", e);
    return bad((e as Error).message, 500);
  }
});
