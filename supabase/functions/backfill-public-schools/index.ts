// Backfill `public_schools` from NCES CCD for every already-seeded city.
//
// Trigger: manual POST. Resumable.
//
// Body (all optional):
//   {
//     "limit": 25,      // cities to process this invocation (default 25)
//     "offset": 0,      // skip this many cities (default 0)
//     "dry_run": false
//   }
//
// Returns: { processed, schools_upserted, failed, next_offset | null, errors }

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

// Mirror of seed-cities-database aliases — keep in sync.
const NCES_CITY_ALIASES: Record<string, string[]> = {
  "NEW YORK|NY": ["NEW YORK", "MANHATTAN", "BROOKLYN", "BRONX", "QUEENS", "STATEN ISLAND",
    "ASTORIA", "LONG ISLAND CITY", "FLUSHING", "JAMAICA", "FAR ROCKAWAY", "ELMHURST",
    "CORONA", "JACKSON HEIGHTS", "REGO PARK", "FOREST HILLS", "RIDGEWOOD",
    "ROSEDALE", "SAINT ALBANS", "SOUTH RICHMOND HILL", "OZONE PARK", "WOODSIDE",
    "MASPETH", "MIDDLE VILLAGE", "BAYSIDE", "WHITESTONE", "FRESH MEADOWS", "HOLLIS",
    "SPRINGFIELD GARDENS", "CAMBRIA HEIGHTS", "QUEENS VILLAGE", "LAURELTON",
    "ARVERNE", "BREEZY POINT", "BELLE HARBOR", "ROCKAWAY PARK", "ROCKAWAY BEACH",
    "COLLEGE POINT", "DOUGLASTON", "LITTLE NECK", "GLEN OAKS", "NEW HYDE PARK", "FLORAL PARK",
    "RICHMOND HILL", "KEW GARDENS", "BRIARWOOD", "SUNNYSIDE", "EAST ELMHURST",
    "HOWARD BEACH", "BROAD CHANNEL"],
  "BOSTON|MA": ["BOSTON", "DORCHESTER", "ROXBURY", "JAMAICA PLAIN", "HYDE PARK", "MATTAPAN",
    "ROSLINDALE", "WEST ROXBURY", "BRIGHTON", "ALLSTON", "CHARLESTOWN", "EAST BOSTON",
    "SOUTH BOSTON", "DORCHESTER CENTER", "ROXBURY CROSSING"],
  "NASHVILLE|TN": ["NASHVILLE", "ANTIOCH", "HERMITAGE", "MADISON", "OLD HICKORY",
    "WHITES CREEK", "JOELTON", "GOODLETTSVILLE"],
  "LOUISVILLE|KY": ["LOUISVILLE", "FAIRDALE", "VALLEY STATION", "PLEASURE RIDGE PARK",
    "OKOLONA", "JEFFERSONTOWN", "FERN CREEK", "PROSPECT", "ANCHORAGE"],
  "INDIANAPOLIS|IN": ["INDIANAPOLIS", "BEECH GROVE", "LAWRENCE", "SPEEDWAY"],
  "JACKSONVILLE|FL": ["JACKSONVILLE", "JACKSONVILLE BEACH", "ATLANTIC BEACH", "NEPTUNE BEACH"],
  "HONOLULU|HI": ["HONOLULU", "EWA BEACH", "KAILUA", "KANEOHE", "WAIPAHU", "PEARL CITY", "AIEA"],
  "ANCHORAGE|AK": ["ANCHORAGE", "EAGLE RIVER", "CHUGIAK", "GIRDWOOD"],
  "AUGUSTA|GA": ["AUGUSTA", "HEPHZIBAH", "BLYTHE"],
  "LEXINGTON|KY": ["LEXINGTON"],
  "ATHENS|GA": ["ATHENS", "BOGART", "WINTERVILLE"],
  "WASHINGTON|DC": ["WASHINGTON"],
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
  // low/high are numeric (-1=PK, 0=KG, 1..12)
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
  // CCD school_type: 1=Regular, 2=Special Ed, 3=Vocational, 4=Alternative/Other
  return ({ 1: "regular", 2: "special_ed", 3: "vocational", 4: "alternative" } as Record<number, string>)[n] ?? null;
}

function statusText(s: unknown): string | null {
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  // 1=Open, 2=Closed, 3=New, 4=Added, 5=Changed agency, 6=Inactive, 7=Reopened, 8=Future
  return ({ 1: "open", 2: "closed", 3: "new", 4: "added", 6: "inactive", 7: "reopened", 8: "future" } as Record<number, string>)[n] ?? null;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const limit = Math.max(1, Math.min(100, Number(body.limit ?? 25)));
  const offset = Math.max(0, Number(body.offset ?? 0));
  const dryRun = Boolean(body.dry_run);

  // Pull cities that have NCES data (so we only re-fetch where seeding succeeded).
  const { data: cities, error: citiesErr } = await supabase
    .from("us_cities_scored")
    .select("id, city_name, state_abbr")
    .not("nces_last_updated", "is", null)
    .order("state_abbr", { ascending: true })
    .order("city_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (citiesErr) return ok({ error: citiesErr.message }, 500);
  if (!cities || cities.length === 0) {
    return ok({ processed: 0, schools_upserted: 0, failed: 0, next_offset: null, errors: [] });
  }

  let processed = 0;
  let schoolsUpserted = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const c of cities) {
    try {
      const dir = await fetchStateDirectory(c.state_abbr);
      const key = `${(c.city_name ?? "").toUpperCase()}|${c.state_abbr}`;
      const targets = new Set(NCES_CITY_ALIASES[key] ?? [(c.city_name ?? "").toUpperCase()]);
      const inCity = dir.filter((s) => {
        const loc = String(s.city_location ?? "").toUpperCase();
        const mail = String(s.city_mailing ?? "").toUpperCase();
        return targets.has(loc) || targets.has(mail);
      });
      // Open schools only
      const openSchools = inCity.filter((s) => Number(s.school_status) === 1);

      const rows = openSchools
        .map((s) => mapSchool(s, c.id))
        .filter((x): x is Record<string, any> => x !== null);

      if (!dryRun && rows.length > 0) {
        // Upsert in chunks of 500 to keep payloads small.
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error: upErr } = await supabase
            .from("public_schools")
            .upsert(chunk, { onConflict: "nces_id" });
          if (upErr) throw new Error(upErr.message);
        }
      }
      schoolsUpserted += rows.length;
      processed++;
    } catch (e) {
      failed++;
      errors.push({ city: `${c.city_name}, ${c.state_abbr}`, error: (e as Error).message });
    }
  }

  // Determine if more remain.
  const { count } = await supabase
    .from("us_cities_scored")
    .select("id", { count: "exact", head: true })
    .not("nces_last_updated", "is", null);

  const nextOffset = (count != null && offset + limit < count) ? offset + limit : null;

  return ok({ processed, schools_upserted: schoolsUpserted, failed, next_offset: nextOffset, errors });
});
