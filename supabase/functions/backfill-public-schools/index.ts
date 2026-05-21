// Backfill `public_schools` from NCES CCD using county + nearest-city matching.
//
// Matching rule (real, NCES-authoritative — no string fuzziness, no estimates):
//   1. For each state, pull the full CCD directory once and cache it.
//   2. Each school carries its own `county_name` (NCES field). Group schools by
//      (state_abbr, normalized county_name).
//   3. For each city in `us_cities_scored` we attribute schools whose NCES
//      county matches the city's `county_name`. If the county contains multiple
//      cities, each school is assigned to the *nearest* city by great-circle
//      distance from the school's NCES lat/long. This prevents double-counting
//      Houston-area schools to both Houston and Fulshear.
//   4. Cities lacking county_name or lat/long get a row in `city_data_gaps`
//      explaining why; nothing is fabricated.
//
// Body (all optional):
//   { "limit": 25, "offset": 0, "dry_run": false, "state": "TX" }
// `state` lets you re-run a single state cheaply.
//
// Returns: { processed, schools_upserted, cities_matched_zero, next_offset, errors }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NCES_YEAR = 2022;
const NCES_LAST_UPDATED = "2023-06-30";

const STATE_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",FL:"12",
  GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",
  MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",
  NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
  SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

const NCES_STATE_CACHE = new Map<string, any[]>();

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function gradeToText(g: unknown): string | null {
  const n = Number(g);
  if (!Number.isFinite(n)) return null;
  if (n === -1) return "PK";
  if (n === 0) return "KG";
  if (n >= 1 && n <= 12) return String(n).padStart(2, "0");
  return null;
}

function deriveLevel(low: number | null, high: number | null): string | null {
  if (low == null || high == null) return null;
  if (high <= 5) return "elementary";
  if (low >= 6 && high <= 8) return "middle";
  if (low >= 9) return "high";
  if (low <= 5 && high >= 9) return "combined";
  if (low <= 5 && high >= 6) return "elementary_middle";
  if (low >= 6 && high >= 9) return "middle_high";
  return "other";
}

function schoolTypeText(t: unknown): string | null {
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return ({ 1: "regular", 2: "special_ed", 3: "vocational", 4: "alternative" } as Record<number, string>)[n] ?? null;
}

function statusText(s: unknown): string | null {
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return ({ 1: "open", 2: "closed", 3: "new", 4: "added", 6: "inactive", 7: "reopened", 8: "future" } as Record<number, string>)[n] ?? null;
}

function normCounty(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+county$/i, "")
    .replace(/\s+parish$/i, "")
    .replace(/\s+borough$/i, "")
    .replace(/\s+census area$/i, "")
    .replace(/\s+municipality$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.7613; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fetchStateDirectory(stateAbbr: string): Promise<any[]> {
  let all = NCES_STATE_CACHE.get(stateAbbr);
  if (all) return all;
  const fips = STATE_FIPS[stateAbbr];
  if (!fips) return [];
  const url = `https://educationdata.urban.org/api/v1/schools/ccd/directory/${NCES_YEAR}/?fips=${fips}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NCES ${stateAbbr} ${r.status}`);
  const j = await r.json();
  all = (j?.results ?? []) as any[];
  NCES_STATE_CACHE.set(stateAbbr, all);
  return all;
}

// (state_abbr, normalized county name) -> 5-digit county FIPS, sourced from Census.
let COUNTY_FIPS_LOOKUP: Map<string, string> | null = null;
async function loadCountyFipsLookup(): Promise<Map<string, string>> {
  if (COUNTY_FIPS_LOOKUP) return COUNTY_FIPS_LOOKUP;
  const url = "https://www2.census.gov/geo/docs/reference/codes/files/national_county.txt";
  const r = await fetch(url);
  if (!r.ok) throw new Error(`county FIPS ${r.status}`);
  const text = await r.text();
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    const parts = line.split(",");
    if (parts.length < 4) continue;
    const [state, statefp, countyfp, countyName] = parts;
    if (!state || !statefp || !countyfp || !countyName) continue;
    const key = `${state}|${normCounty(countyName)}`;
    map.set(key, `${statefp}${countyfp}`);
  }
  COUNTY_FIPS_LOOKUP = map;
  return map;
}

function mapSchool(s: any, cityId: string): Record<string, any> | null {
  const nces_id = String(s.ncessch ?? "").trim();
  if (!nces_id) return null;
  const lowNum = num(s.lowest_grade_offered);
  const highNum = num(s.highest_grade_offered);
  return {
    nces_id,
    school_name: String(s.school_name ?? "Unknown"),
    district_name: s.lea_name ?? null,
    district_nces_id: s.leaid != null ? String(s.leaid) : null,
    street_address: s.street_mailing ?? s.street_location ?? null,
    city_name: s.city_location ?? s.city_mailing ?? null,
    state_abbr: s.state_location ?? s.state_mailing ?? null,
    zip: s.zip_location ?? s.zip_mailing ?? null,
    latitude: num(s.latitude),
    longitude: num(s.longitude),
    phone: s.phone ?? null,
    us_cities_scored_id: cityId,
    lowest_grade_offered: gradeToText(s.lowest_grade_offered),
    highest_grade_offered: gradeToText(s.highest_grade_offered),
    school_level: deriveLevel(lowNum, highNum),
    school_type: schoolTypeText(s.school_type),
    is_charter: Number(s.charter) === 1,
    is_magnet: Number(s.magnet) === 1,
    school_status: statusText(s.school_status),
    enrollment: num(s.enrollment),
    teachers_fte: num(s.teachers_fte),
    nces_year: NCES_YEAR,
    nces_last_updated: NCES_LAST_UPDATED,
    raw: s,
  };
}

interface CityRow {
  id: string;
  city_name: string;
  state_abbr: string;
  county_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

async function logGap(supabase: any, cityId: string, field: string, reason: string) {
  await supabase.from("city_data_gaps").upsert(
    { city_id: cityId, field_name: field, reason, checked_at: new Date().toISOString() },
    { onConflict: "city_id,field_name" },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const limit = Math.max(1, Math.min(200, Number(body.limit ?? 50)));
  const offset = Math.max(0, Number(body.offset ?? 0));
  const dryRun = Boolean(body.dry_run);
  const stateFilter: string | null = body.state ? String(body.state).toUpperCase() : null;

  // Pull cities. We process ALL cities now, not just ones with nces_last_updated set.
  let q = supabase
    .from("us_cities_scored")
    .select("id, city_name, state_abbr, county_name, latitude, longitude")
    .order("state_abbr", { ascending: true })
    .order("city_name", { ascending: true });
  if (stateFilter) q = q.eq("state_abbr", stateFilter);
  const { data: cities, error: citiesErr } = await q.range(offset, offset + limit - 1);

  if (citiesErr) return ok({ error: citiesErr.message }, 500);
  if (!cities || cities.length === 0) {
    return ok({ processed: 0, schools_upserted: 0, cities_matched_zero: 0, next_offset: null, errors: [] });
  }

  // Group cities by state so we fetch the NCES directory once per state.
  const byState = new Map<string, CityRow[]>();
  for (const c of cities as CityRow[]) {
    if (!byState.has(c.state_abbr)) byState.set(c.state_abbr, []);
    byState.get(c.state_abbr)!.push(c);
  }

  let processed = 0;
  let schoolsUpserted = 0;
  let citiesMatchedZero = 0;
  const errors: any[] = [];

  // Load Census county FIPS lookup once.
  let fipsLookup: Map<string, string>;
  try {
    fipsLookup = await loadCountyFipsLookup();
  } catch (e) {
    return ok({ error: `county FIPS load: ${(e as Error).message}` }, 500);
  }

  for (const [stateAbbr, stateCities] of byState) {
    let dir: any[];
    try {
      dir = await fetchStateDirectory(stateAbbr);
    } catch (e) {
      for (const c of stateCities) errors.push({ city: `${c.city_name}, ${c.state_abbr}`, error: (e as Error).message });
      continue;
    }

    // Index schools by NCES county_code (5-digit FIPS).
    const byCountyFips = new Map<string, any[]>();
    for (const s of dir) {
      if (Number(s.school_status) !== 1) continue;
      const fips = String(s.county_code ?? "").padStart(5, "0");
      if (!fips || fips === "00000") continue;
      if (!byCountyFips.has(fips)) byCountyFips.set(fips, []);
      byCountyFips.get(fips)!.push(s);
    }

    for (const c of stateCities) {
      try {
        if (!c.county_name) {
          await logGap(supabase, c.id, "public_elementary_count", "city missing county_name");
          citiesMatchedZero++;
          processed++;
          continue;
        }
        const fips = fipsLookup.get(`${stateAbbr}|${normCounty(c.county_name)}`);
        if (!fips) {
          await logGap(supabase, c.id, "public_elementary_count", `county FIPS not found for ${c.county_name}, ${stateAbbr}`);
          citiesMatchedZero++;
          processed++;
          continue;
        }
        const schoolsInCounty = byCountyFips.get(fips) ?? [];
        if (schoolsInCounty.length === 0) {
          await logGap(supabase, c.id, "public_elementary_count", `no NCES schools in ${c.county_name} County, ${stateAbbr} (FIPS ${fips})`);
          citiesMatchedZero++;
          processed++;
          continue;
        }

        // Other cities in this same county FIPS (in our scored set).
        const siblings = stateCities.filter((x) => {
          if (x.id === c.id || !x.county_name) return false;
          const f = fipsLookup.get(`${stateAbbr}|${normCounty(x.county_name)}`);
          return f === fips;
        });

        const myRows: Record<string, any>[] = [];
        const haveMyCoords = c.latitude != null && c.longitude != null;

        for (const s of schoolsInCounty) {
          const slat = num(s.latitude);
          const slon = num(s.longitude);

          // No siblings → everything in this county is ours.
          if (siblings.length === 0) {
            const row = mapSchool(s, c.id);
            if (row) myRows.push(row);
            continue;
          }

          // Siblings exist. Need school lat/long AND my lat/long to compare.
          if (slat == null || slon == null || !haveMyCoords) {
            // Can't break the tie geometrically. Skip — another city in the
            // county will pick it up, or we'll log a gap if everyone skips.
            continue;
          }

          const myDist = haversineMi(slat, slon, c.latitude!, c.longitude!);
          let isMine = true;
          for (const sib of siblings) {
            if (sib.latitude == null || sib.longitude == null) continue;
            const d = haversineMi(slat, slon, sib.latitude, sib.longitude);
            if (d < myDist) { isMine = false; break; }
          }
          if (isMine) {
            const row = mapSchool(s, c.id);
            if (row) myRows.push(row);
          }
        }

        if (myRows.length === 0) {
          await logGap(supabase, c.id, "public_elementary_count",
            !haveMyCoords && siblings.length > 0
              ? `city missing lat/long, cannot disambiguate ${siblings.length} sibling cities in county`
              : `0 schools assigned after nearest-city split (${schoolsInCounty.length} in county)`);
          citiesMatchedZero++;
        } else if (!dryRun) {
          // First, detach any existing public_schools rows currently pointing at this city
          // so we don't keep stale assignments from the old string-match logic.
          const { error: detachErr } = await supabase
            .from("public_schools")
            .update({ us_cities_scored_id: null })
            .eq("us_cities_scored_id", c.id);
          if (detachErr) throw new Error(`detach: ${detachErr.message}`);

          // Upsert by nces_id in chunks.
          for (let i = 0; i < myRows.length; i += 500) {
            const chunk = myRows.slice(i, i + 500);
            const { error: upErr } = await supabase
              .from("public_schools")
              .upsert(chunk, { onConflict: "nces_id" });
            if (upErr) throw new Error(upErr.message);
          }
        }

        schoolsUpserted += myRows.length;
        processed++;
      } catch (e) {
        errors.push({ city: `${c.city_name}, ${c.state_abbr}`, error: (e as Error).message });
      }
    }
  }

  // Compute next offset against the same filter we queried with.
  let countQ = supabase.from("us_cities_scored").select("id", { count: "exact", head: true });
  if (stateFilter) countQ = countQ.eq("state_abbr", stateFilter);
  const { count } = await countQ;
  const nextOffset = (count != null && offset + limit < count) ? offset + limit : null;

  return ok({ processed, schools_upserted: schoolsUpserted, cities_matched_zero: citiesMatchedZero, next_offset: nextOffset, errors });
});
