// Phase 1 — Seed `us_cities_scored` from free public APIs.
//
// Trigger: manual POST. Resumable in chunks because edge functions time out.
//
// Body (all optional):
//   {
//     "limit": 100,            // cities to process this invocation (default 100)
//     "offset": 0,             // skip this many cities (default 0)
//     "min_population": 50000, // filter on us_cities_geo (default 50000)
//     "normalize_only": false, // skip fetch, only recompute scores from stored raw values
//     "seed_run_id": "<uuid>", // continue an existing run (otherwise a new run row is inserted)
//     "dry_run": false         // if true: fetch but do not write us_cities_scored
//   }
//
// Returns: { run_id, processed, failed, next_offset | null, errors: [...] }
//
// Sources (Phase 1 free only):
//   - Census ACS 5-year (city-level demographics)        → census_last_updated
//   - BLS QCEW (state-level STEM concentration)          → bls_last_updated
//   - BEA Regional Income (state-level per-capita)       → bea_last_updated
//   - FRED Regional Price Parity (state-level COL proxy) → fred_last_updated
//   - NCES CCD via Urban Institute (city public schools) → nces_last_updated
//
// Phase 1b (Apify/Firecrawl/GreatSchools) is intentionally NOT called here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CENSUS_KEY = Deno.env.get("CENSUS_API_KEY") ?? "";
const BLS_KEY = Deno.env.get("BLS_API_KEY") ?? "";
const BEA_KEY = Deno.env.get("BEA_API_KEY") ?? "";

const STATE_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",FL:"12",
  GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",
  MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",
  NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
  SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

const REGISTRATION_STATES = new Set(["CA","HI","IL","IN","MD","MI","MN","NY","ND","RI","SD","VA","WA","WI"]);

// ---------- helpers ----------

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

function pct(n: number | null, d: number | null): number | null {
  if (n == null || d == null || d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

// ---------- Census ACS 5-year (vintage 2024 = data 2020-2024) ----------
const CENSUS_VINTAGE = "2024";
const CENSUS_VINTAGE_DATE = "2024-12-31";

async function fetchCensusForPlace(stateFips: string, placeFips: string) {
  if (!CENSUS_KEY) return { data: null, error: "CENSUS_API_KEY missing" };
  const vars = [
    "B01003_001E",
    "B01001_004E","B01001_005E","B01001_028E","B01001_029E",
    "B19013_001E",
    "B15003_022E","B15003_023E","B15003_024E","B15003_025E","B15003_001E",
    // % Dual-Income Households — ACS B23007.
    // Denominator: B23007_002E (all family types with own children <18).
    // Numerator: B23007_006E ONLY — married-couple family, husband in LF
    // employed AND wife in labor force. Excludes B23007_011E (husband NOT
    // in labor force) so this is true dual-earner married couples.
    "B23007_002E","B23007_006E",
    "B23025_002E","B23025_001E",
  ];
  const url = `https://api.census.gov/data/${CENSUS_VINTAGE}/acs/acs5?get=${vars.join(",")}&for=place:${placeFips}&in=state:${stateFips}&key=${CENSUS_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return { data: null, error: `Census ${r.status}` };
  const arr = await r.json() as string[][];
  const row = arr?.[1];
  if (!row) return { data: null, error: "Census empty row" };
  const pop = num(row[0]);
  const age5_14 = (num(row[1]) ?? 0) + (num(row[2]) ?? 0) + (num(row[3]) ?? 0) + (num(row[4]) ?? 0);
  const children_5_12 = age5_14 > 0 ? Math.round(age5_14 * 0.8) : null;
  const median_household_income = num(row[5]);
  const bachelors = (num(row[6]) ?? 0) + (num(row[7]) ?? 0) + (num(row[8]) ?? 0) + (num(row[9]) ?? 0);
  const total_25 = num(row[10]);
  const college_degree_pct = pct(bachelors, total_25);
  const families_with_kids = num(row[11]);            // B23007_002E — denominator
  const dual_kids = num(row[12]);                     // B23007_006E — numerator
  const dual_working_families_pct = families_with_kids && families_with_kids > 0 && dual_kids != null && dual_kids > 0
    ? Math.round((dual_kids / families_with_kids) * 1000) / 10
    : null;
  if (dual_working_families_pct != null && (dual_working_families_pct > 75 || dual_working_families_pct < 10)) {
    console.warn("[seed-cities-database] dual_working_families_pct out of expected 10–75 band",
      { placeFips, stateFips, dual_working_families_pct, dual_kids, families_with_kids });
  }
  const labor_force = num(row[13]);
  const pop_16 = num(row[14]);
  const labor_force_participation = pct(labor_force, pop_16);
  return {
    data: {
      population: pop,
      children_5_12,
      median_household_income,
      college_degree_pct,
      dual_working_families_pct,
      labor_force_participation,
      census_last_updated: CENSUS_VINTAGE_DATE,
    },
    error: null,
  };
}

const PLACE_CACHE = new Map<string, Array<{ name: string; fips: string }>>();
async function resolvePlaceFips(city: string, stateAbbr: string): Promise<string | null> {
  const stateFips = STATE_FIPS[stateAbbr];
  if (!stateFips || !CENSUS_KEY) return null;
  let list = PLACE_CACHE.get(stateAbbr);
  if (!list) {
    const url = `https://api.census.gov/data/${CENSUS_VINTAGE}/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}&key=${CENSUS_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const arr = await r.json() as string[][];
    list = [];
    for (let i = 1; i < arr.length; i++) {
      list.push({ name: arr[i][0].toLowerCase(), fips: arr[i][2] });
    }
    PLACE_CACHE.set(stateAbbr, list);
  }
  const target = city.toLowerCase().trim();
  for (const suffix of [" city,", " town,", " cdp,", " village,", " borough,", " municipality,"]) {
    const hit = list.find((p) => p.name.startsWith(target + suffix));
    if (hit) return hit.fips;
  }
  const loose = list.find((p) => p.name.startsWith(target + " "));
  return loose?.fips ?? null;
}

type StateSignals = {
  stem_job_concentration: number | null;
  bls_last_updated: string | null;
  regional_median_income: number | null;
  bea_last_updated: string | null;
  cost_of_living_index: number | null;
  fred_last_updated: string | null;
};
const STATE_SIGNAL_CACHE = new Map<string, StateSignals>();

async function fetchStateSignals(stateAbbr: string): Promise<StateSignals> {
  const cached = STATE_SIGNAL_CACHE.get(stateAbbr);
  // Only return cache when ALL three values are present; otherwise refetch missing pieces.
  if (cached && cached.stem_job_concentration != null
    && cached.regional_median_income != null
    && cached.cost_of_living_index != null) return cached;
  const out: StateSignals = cached ? { ...cached } : {
    stem_job_concentration: null, bls_last_updated: null,
    regional_median_income: null, bea_last_updated: null,
    cost_of_living_index: null, fred_last_updated: null,
  };

  if (BEA_KEY) {
    try {
      const url = `https://apps.bea.gov/api/data/?&UserID=${BEA_KEY}&method=GetData&datasetname=Regional&TableName=SAINC1&LineCode=3&GeoFips=STATE&Year=LAST5&ResultFormat=JSON`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        const rows: any[] = j?.BEAAPI?.Results?.Data ?? [];
        const stateRows = rows.filter((x) =>
          (x.GeoName ?? "").toLowerCase() === stateAbbrToName(stateAbbr).toLowerCase()
        );
        stateRows.sort((a, b) => Number(b.TimePeriod) - Number(a.TimePeriod));
        const latest = stateRows[0];
        if (latest) {
          out.regional_median_income = num(String(latest.DataValue).replace(/,/g, ""));
          out.bea_last_updated = `${latest.TimePeriod}-12-31`;
        }
      }
    } catch { /* ignore */ }
  }

  if (BLS_KEY) {
    try {
      const fips = STATE_FIPS[stateAbbr];
      if (fips) {
        // Supersector 60 = Professional & Business Services (free BLS proxy for STEM/knowledge-worker concentration)
        const stemId = `SMS${fips}000006000000001`;
        const totalId = `SMS${fips}000000000000001`;
        const r = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seriesid: [stemId, totalId],
            registrationkey: BLS_KEY,
            latest: true,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const series: any[] = j?.Results?.series ?? [];
          const stem = series.find((s) => s.seriesID === stemId)?.data?.[0];
          const tot = series.find((s) => s.seriesID === totalId)?.data?.[0];
          if (stem && tot) {
            const sN = num(stem.value), tN = num(tot.value);
            if (sN != null && tN != null && tN > 0) {
              out.stem_job_concentration = Math.round((sN / tN) * 10000) / 100;
              // BLS period field is "M01".."M12" for months, "M13" for annual.
              // Parse from period directly; fall back to periodName (full month names like "September").
              let monthNum: number | null = null;
              const period = String(stem.period ?? "");
              const pm = period.match(/^M(\d{2})$/);
              if (pm) {
                const n = Number(pm[1]);
                if (n >= 1 && n <= 12) monthNum = n;
                else if (n === 13) monthNum = 12; // annual → Dec
              }
              if (monthNum == null) {
                const full = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const idx = full.indexOf(String(stem.periodName ?? ""));
                if (idx >= 0) monthNum = idx + 1;
              }
              if (monthNum == null) monthNum = 12;
              out.bls_last_updated = `${stem.year}-${String(monthNum).padStart(2,"0")}-01`;
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (BEA_KEY) {
    try {
      const url = `https://apps.bea.gov/api/data/?&UserID=${BEA_KEY}&method=GetData&datasetname=Regional&TableName=SARPP&LineCode=1&GeoFips=STATE&Year=LAST5&ResultFormat=JSON`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        const rows: any[] = j?.BEAAPI?.Results?.Data ?? [];
        const stateRows = rows.filter((x) =>
          (x.GeoName ?? "").toLowerCase() === stateAbbrToName(stateAbbr).toLowerCase()
        );
        stateRows.sort((a, b) => Number(b.TimePeriod) - Number(a.TimePeriod));
        const latest = stateRows[0];
        if (latest) {
          out.cost_of_living_index = num(String(latest.DataValue).replace(/,/g, ""));
          out.fred_last_updated = `${latest.TimePeriod}-12-31`;
        }
      }
    } catch { /* ignore */ }
  }

  // Only cache if we got at least one non-null value — prevents a single failed BEA/BLS call
  // from poisoning every city in that state for the rest of the invocation.
  // (Was the root cause of 489/960 cities missing cost_of_living_index in earlier runs.)
  const hasAnyValue = out.stem_job_concentration != null
    || out.regional_median_income != null
    || out.cost_of_living_index != null;
  if (hasAnyValue) STATE_SIGNAL_CACHE.set(stateAbbr, out);
  return out;
}

function stateAbbrToName(abbr: string): string {
  const m: Record<string,string> = {
    AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
    CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",
    HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",
    LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
    MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",
    NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",
    OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",
    SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
    VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  };
  return m[abbr] ?? abbr;
}

const NCES_YEAR = 2022;
const NCES_LAST_UPDATED = "2023-06-30";

// Cache full state directory (one request returns all schools, no pagination needed).
const NCES_STATE_CACHE = new Map<string, any[]>();

// Consolidated cities — NCES codes schools under neighborhood/borough names rather than the
// city's official name. Key = "CITY|STATE" uppercase. Value = list of NCES city_location values
// (uppercase) that should roll up into that city's row.
const NCES_CITY_ALIASES: Record<string, string[]> = {
  // NYC — 5 boroughs (NCES uses borough names, not "NEW YORK")
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
  // Boston — many schools are listed under neighborhood names
  "BOSTON|MA": ["BOSTON", "DORCHESTER", "ROXBURY", "JAMAICA PLAIN", "HYDE PARK", "MATTAPAN",
    "ROSLINDALE", "WEST ROXBURY", "BRIGHTON", "ALLSTON", "CHARLESTOWN", "EAST BOSTON",
    "SOUTH BOSTON", "DORCHESTER CENTER", "ROXBURY CROSSING"],
  // Nashville-Davidson consolidated
  "NASHVILLE|TN": ["NASHVILLE", "ANTIOCH", "HERMITAGE", "MADISON", "OLD HICKORY",
    "WHITES CREEK", "JOELTON", "GOODLETTSVILLE"],
  // Louisville-Jefferson consolidated
  "LOUISVILLE|KY": ["LOUISVILLE", "FAIRDALE", "VALLEY STATION", "PLEASURE RIDGE PARK",
    "OKOLONA", "JEFFERSONTOWN", "FERN CREEK", "PROSPECT", "ANCHORAGE"],
  // Indianapolis-Marion consolidated
  "INDIANAPOLIS|IN": ["INDIANAPOLIS", "BEECH GROVE", "LAWRENCE", "SPEEDWAY"],
  // Jacksonville-Duval consolidated
  "JACKSONVILLE|FL": ["JACKSONVILLE", "JACKSONVILLE BEACH", "ATLANTIC BEACH", "NEPTUNE BEACH"],
  // Honolulu county (CDP)
  "HONOLULU|HI": ["HONOLULU", "EWA BEACH", "KAILUA", "KANEOHE", "WAIPAHU", "PEARL CITY", "AIEA"],
  // Anchorage municipality
  "ANCHORAGE|AK": ["ANCHORAGE", "EAGLE RIVER", "CHUGIAK", "GIRDWOOD"],
  // Augusta-Richmond consolidated
  "AUGUSTA|GA": ["AUGUSTA", "HEPHZIBAH", "BLYTHE"],
  // Lexington-Fayette consolidated
  "LEXINGTON|KY": ["LEXINGTON"],
  // Athens-Clarke consolidated
  "ATHENS|GA": ["ATHENS", "BOGART", "WINTERVILLE"],
  // DC has no neighborhoods in NCES but include alias for safety
  "WASHINGTON|DC": ["WASHINGTON"],
};

async function fetchNcesForCity(cityName: string, stateAbbr: string) {
  try {
    const fips = STATE_FIPS[stateAbbr];
    if (!fips) return { data: null, schools: [], error: "no state fips" };
    let all = NCES_STATE_CACHE.get(stateAbbr);
    if (!all) {
      const url = `https://educationdata.urban.org/api/v1/schools/ccd/directory/${NCES_YEAR}/?fips=${fips}`;
      const r = await fetch(url);
      if (!r.ok) return { data: null, schools: [], error: `NCES ${r.status}` };
      const j = await r.json();
      all = (j?.results ?? []) as any[];
      NCES_STATE_CACHE.set(stateAbbr, all);
    }
    const key = `${cityName.trim().toUpperCase()}|${stateAbbr}`;
    const aliases = NCES_CITY_ALIASES[key];
    const targets = new Set(aliases ?? [cityName.trim().toUpperCase()]);
    const inCity = all.filter((s) => {
      const loc = String(s.city_location ?? "").toUpperCase();
      const mail = String(s.city_mailing ?? "").toUpperCase();
      return targets.has(loc) || targets.has(mail);
    });
    const openSchools = inCity.filter((s) => Number(s.school_status) === 1);
    const schoolCount = openSchools.length;
    const schoolEnrollment = openSchools.reduce((sum, s) => sum + (num(s.enrollment) ?? 0), 0);

    const elem = openSchools.filter((s) => {
      const lg = Number(s.lowest_grade_offered);
      return Number.isFinite(lg) && lg <= 5;
    });
    const elemCount = elem.length;
    const elemEnrollment = elem.reduce((sum, s) => sum + (num(s.enrollment) ?? 0), 0);

    return {
      data: {
        public_school_count: schoolCount || null,
        public_school_enrollment: schoolEnrollment || null,
        public_elementary_count: elemCount || null,
        public_elementary_enrollment: elemEnrollment || null,
        nces_last_updated: NCES_LAST_UPDATED,
      },
      schools: openSchools,
      error: null,
    };
  } catch (e) {
    return { data: null, schools: [], error: (e as Error).message };
  }
}

// Map an NCES grade code ("-1"=PK, "0"=KG, "1".."12") to the text our public_schools table uses.
function ncesGradeToText(g: unknown): string | null {
  const n = Number(g);
  if (!Number.isFinite(n)) return null;
  if (n === -1) return "PK";
  if (n === 0) return "KG";
  if (n >= 1 && n <= 12) return String(n).padStart(2, "0");
  return null;
}

// Derive school_level from lowest/highest grade per NCES convention.
function deriveSchoolLevel(lowG: unknown, highG: unknown): string | null {
  const lo = Number(lowG), hi = Number(highG);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (hi <= 5) return "elementary";
  if (lo >= 6 && hi <= 8) return "middle";
  if (lo >= 9) return "high";
  if (lo <= 5 && hi >= 9) return "other"; // combined
  if (lo >= 6 && hi >= 9) return "high";
  return "other";
}

function mapNcesSchoolRow(s: any, cityScoredId: string | null) {
  return {
    nces_id: String(s.ncessch ?? s.nces_school_id ?? ""),
    school_name: String(s.school_name ?? "(unknown)"),
    district_name: s.lea_name ?? null,
    district_nces_id: s.leaid != null ? String(s.leaid) : null,
    street_address: s.street_location ?? s.street_mailing ?? null,
    city_name: s.city_location ?? s.city_mailing ?? null,
    state_abbr: s.state_location ?? s.state_mailing ?? null,
    zip: s.zip_location ?? s.zip_mailing ?? null,
    latitude: num(s.latitude),
    longitude: num(s.longitude),
    phone: s.phone ?? null,
    us_cities_scored_id: cityScoredId,
    lowest_grade_offered: ncesGradeToText(s.lowest_grade_offered),
    highest_grade_offered: ncesGradeToText(s.highest_grade_offered),
    school_level: deriveSchoolLevel(s.lowest_grade_offered, s.highest_grade_offered),
    school_type: s.school_type != null ? String(s.school_type) : null,
    is_charter: s.charter === 1 || s.charter === "1" || s.charter === true,
    is_magnet: s.magnet === 1 || s.magnet === "1" || s.magnet === true,
    school_status: s.school_status != null ? String(s.school_status) : null,
    enrollment: num(s.enrollment),
    teachers_fte: num(s.teachers_fte),
    nces_year: NCES_YEAR,
    nces_last_updated: NCES_LAST_UPDATED,
    raw: s,
    updated_at: new Date().toISOString(),
  };
}

function percentileRank(sortedAsc: number[], v: number): number {
  let lo = 0, hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedAsc[mid] < v) lo = mid + 1; else hi = mid;
  }
  return Math.round((lo / Math.max(1, sortedAsc.length - 1)) * 100);
}

function invertPercentile(p: number): number {
  return 100 - p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const limit = Math.max(1, Math.min(500, Number(body.limit ?? 100)));
  const offset = Math.max(0, Number(body.offset ?? 0));
  const minPop = Math.max(0, Number(body.min_population ?? 50000));
  const normalizeOnly = Boolean(body.normalize_only);
  const stateSignalsBackfill = Boolean(body.state_signals_backfill);
  const dryRun = Boolean(body.dry_run);

  let runId: string = body.seed_run_id;
  if (!runId) {
    const { data: runRow, error: runErr } = await supabase
      .from("city_seed_runs")
      .insert({ phase: "phase_1_free", notes: normalizeOnly ? "normalize_only" : null })
      .select("id")
      .single();
    if (runErr) return ok({ error: `Failed to create run row: ${runErr.message}` }, 500);
    runId = runRow!.id;
  }

  if (normalizeOnly) {
    const { data: all, error: readErr } = await supabase
      .from("us_cities_scored")
      .select("id, children_5_12, median_household_income, college_degree_pct, population_density, stem_job_concentration, labor_force_participation, regional_median_income, cost_of_living_index, public_elementary_count, public_elementary_enrollment, dual_working_families_pct")
      .limit(2000);
    if (readErr) return ok({ error: readErr.message }, 500);
    const rows = all ?? [];
    if (rows.length === 0) return ok({ run_id: runId, message: "No rows to normalize" });

    const col = (k: string) => rows.map((r: any) => num(r[k])).filter((v): v is number => v != null).sort((a, b) => a - b);
    const sorted = {
      children_5_12: col("children_5_12"),
      median_household_income: col("median_household_income"),
      college_degree_pct: col("college_degree_pct"),
      population_density: col("population_density"),
      stem_job_concentration: col("stem_job_concentration"),
      labor_force_participation: col("labor_force_participation"),
      regional_median_income: col("regional_median_income"),
      cost_of_living_index: col("cost_of_living_index"),
      public_elementary_count: col("public_elementary_count"),
      public_elementary_enrollment: col("public_elementary_enrollment"),
      dual_working_families_pct: col("dual_working_families_pct"),
    };

    let updated = 0;
    for (const r of rows as any[]) {
      const p = (k: keyof typeof sorted) => r[k] != null ? percentileRank(sorted[k], Number(r[k])) : null;
      const demandParts = [p("children_5_12"), p("median_household_income"), p("dual_working_families_pct")].filter((x): x is number => x != null);
      const pricingParts = [p("median_household_income"), p("regional_median_income")].filter((x): x is number => x != null);
      const colInv = r.cost_of_living_index != null ? invertPercentile(percentileRank(sorted.cost_of_living_index, Number(r.cost_of_living_index))) : null;
      const competitiveParts = [colInv].filter((x): x is number => x != null);
      const supplyParts = [p("public_elementary_count"), p("public_elementary_enrollment")].filter((x): x is number => x != null);
      const easeParts = [p("labor_force_participation"), colInv].filter((x): x is number => x != null);
      const mindsetParts = [p("college_degree_pct"), p("stem_job_concentration")].filter((x): x is number => x != null);

      // BUG A guard (2026-05-21): when ALL inputs to a category are NULL, the
      // category score MUST be NULL — never default to 50, 100, or any other
      // value. Per demographicsMethodology.md §4.4 nulls fall out of the
      // weighted denominator. 8 cities had score_demand=100 inherited from the
      // Manus seed with all 3 demand inputs NULL (Athens GA, Augusta GA, Macon
      // GA, Nashville TN, Louisville KY, Lexington KY, Carson City NV, Ventura
      // CA); those rows are NULL'd in the same change.
      const avg = (xs: number[]): number | null =>
        xs.length === 0 ? null : Math.round(xs.reduce((s, n) => s + n, 0) / xs.length);
      const sd = avg(demandParts);
      const sp = avg(pricingParts);
      const sc = avg(competitiveParts);
      const sf = avg(supplyParts);
      const se = avg(easeParts);
      const sm = avg(mindsetParts);
      const compParts: Array<[number | null, number]> = [
        [sd, 0.17], [sp, 0.17], [sc, 0.17], [sf, 0.17], [se, 0.16], [sm, 0.16],
      ];
      let totalW = 0, totalS = 0;
      for (const [s, w] of compParts) if (s != null) { totalS += s * w; totalW += w; }
      const composite = totalW > 0 ? Math.round(totalS / totalW * 100) / 100 : null;

      const { error: updErr } = await supabase.from("us_cities_scored").update({
        score_demand: sd, score_pricing_power: sp, score_competitive: sc,
        score_franchise_supply: sf, score_ease_of_operation: se, score_parent_mindset: sm,
        composite_score_default: composite ? Math.round(composite) : null,
        scored_at: new Date().toISOString(),
        refresh_count: ((r.refresh_count as number) ?? 0) + 1,
      }).eq("id", r.id);
      if (!updErr) updated++;
    }
    await supabase.from("city_seed_runs").update({
      completed_at: new Date().toISOString(),
      cities_processed: updated,
      notes: `normalize_only: scored ${updated} rows`,
    }).eq("id", runId);
    return ok({ run_id: runId, normalized: updated });
  }

  // ---- state_signals_backfill: refetch BEA RPP / regional income / BLS STEM for states
  // that have any cities with NULL values, then propagate to all cities in that state.
  // No new APIs — just retries the existing BEA/BLS calls. Used to fix earlier null-cache bugs.
  if (stateSignalsBackfill) {
    const { data: gaps, error: gapErr } = await supabase
      .from("us_cities_scored")
      .select("state_abbr, cost_of_living_index, regional_median_income, stem_job_concentration");
    if (gapErr) return ok({ error: gapErr.message }, 500);
    const states = new Set<string>();
    for (const r of (gaps ?? []) as any[]) {
      if (r.cost_of_living_index == null || r.regional_median_income == null || r.stem_job_concentration == null) {
        states.add(r.state_abbr);
      }
    }
    let statesFixed = 0, citiesUpdated = 0;
    for (const st of states) {
      const sig = await fetchStateSignals(st);
      const patch: Record<string, unknown> = {};
      if (sig.cost_of_living_index != null) { patch.cost_of_living_index = sig.cost_of_living_index; patch.fred_last_updated = sig.fred_last_updated; }
      if (sig.regional_median_income != null) { patch.regional_median_income = sig.regional_median_income; patch.bea_last_updated = sig.bea_last_updated; }
      if (sig.stem_job_concentration != null) { patch.stem_job_concentration = sig.stem_job_concentration; patch.bls_last_updated = sig.bls_last_updated; }
      if (Object.keys(patch).length === 0) continue;
      patch.updated_at = new Date().toISOString();
      // Only update cities where the field is currently null (avoid stomping fresh values)
      const { data: updRows, error: updErr } = await supabase
        .from("us_cities_scored")
        .update(patch)
        .eq("state_abbr", st)
        .or("cost_of_living_index.is.null,regional_median_income.is.null,stem_job_concentration.is.null")
        .select("id");
      if (!updErr) { statesFixed++; citiesUpdated += (updRows?.length ?? 0); }
    }
    await supabase.from("city_seed_runs").update({
      completed_at: new Date().toISOString(),
      cities_processed: citiesUpdated,
      notes: `state_signals_backfill: ${statesFixed} states, ${citiesUpdated} cities`,
    }).eq("id", runId);
    return ok({ run_id: runId, states_fixed: statesFixed, cities_updated: citiesUpdated });
  }


  const { data: cities, error: geoErr } = await supabase
    .from("us_cities_geo")
    .select("city, state_id, state_name, population, lat, lng, density")
    .gte("population", minPop)
    .order("population", { ascending: false })
    .range(offset, offset + limit - 1);
  if (geoErr) return ok({ error: geoErr.message }, 500);

  const errors: Array<{ city: string; state: string; error: string }> = [];
  let processed = 0, failed = 0;

  const BATCH = 10;
  for (let i = 0; i < (cities ?? []).length; i += BATCH) {
    const slice = cities!.slice(i, i + BATCH);
    await Promise.all(slice.map(async (c: any) => {
      const cityName = c.city as string;
      const stateAbbr = c.state_id as string;
      try {
        const placeFips = await resolvePlaceFips(cityName, stateAbbr);
        const stateFips = STATE_FIPS[stateAbbr];
        const [censusRes, stateSig, ncesRes] = await Promise.all([
          placeFips && stateFips ? fetchCensusForPlace(stateFips, placeFips) : Promise.resolve({ data: null, error: "no place fips" }),
          fetchStateSignals(stateAbbr),
          fetchNcesForCity(cityName, stateAbbr),
        ]);
        const census = censusRes.data ?? {};
        const nces = ncesRes.data ?? {};
        const pop = (census as any).population ?? c.population ?? null;
        const popDensity = c.density != null ? Number(c.density) : null;
        const row = {
          city_name: cityName,
          state_abbr: stateAbbr,
          state_name: c.state_name ?? stateAbbrToName(stateAbbr),
          population: pop,
          latitude: c.lat,
          longitude: c.lng,
          population_density: popDensity,
          is_registration_state: REGISTRATION_STATES.has(stateAbbr),
          children_5_12: (census as any).children_5_12 ?? null,
          median_household_income: (census as any).median_household_income ?? null,
          college_degree_pct: (census as any).college_degree_pct ?? null,
          dual_working_families_pct: (census as any).dual_working_families_pct ?? null,
          labor_force_participation: (census as any).labor_force_participation ?? null,
          census_last_updated: (census as any).census_last_updated ?? null,
          stem_job_concentration: stateSig.stem_job_concentration,
          bls_last_updated: stateSig.bls_last_updated,
          regional_median_income: stateSig.regional_median_income,
          bea_last_updated: stateSig.bea_last_updated,
          cost_of_living_index: stateSig.cost_of_living_index,
          fred_last_updated: stateSig.fred_last_updated,
          public_school_count: (nces as any).public_school_count ?? null,
          public_school_enrollment: (nces as any).public_school_enrollment ?? null,
          public_elementary_count: (nces as any).public_elementary_count ?? null,
          public_elementary_enrollment: (nces as any).public_elementary_enrollment ?? null,
          nces_last_updated: (nces as any).nces_last_updated ?? null,
          seed_run_id: runId,
          updated_at: new Date().toISOString(),
        };
        if (!dryRun) {
          const { data: upserted, error: upErr } = await supabase
            .from("us_cities_scored")
            .upsert(row, { onConflict: "city_name,state_abbr" })
            .select("id")
            .single();
          if (upErr) throw new Error(`upsert: ${upErr.message}`);

          // Also upsert per-school rows into public_schools (source of truth for school data).
          // Same NCES response we already have in memory — no extra API call.
          const ncesSchools = ncesRes.schools ?? [];
          if (ncesSchools.length > 0 && upserted?.id) {
            const schoolRows = ncesSchools
              .map((s: any) => mapNcesSchoolRow(s, upserted.id))
              .filter((r) => r.nces_id);
            // Chunk to keep payload small (Supabase max row size)
            const CHUNK = 200;
            for (let k = 0; k < schoolRows.length; k += CHUNK) {
              const { error: schErr } = await supabase
                .from("public_schools")
                .upsert(schoolRows.slice(k, k + CHUNK), { onConflict: "nces_id" });
              if (schErr) throw new Error(`public_schools upsert: ${schErr.message}`);
            }
          }
        }
        processed++;
      } catch (e) {
        failed++;
        errors.push({ city: cityName, state: stateAbbr, error: (e as Error).message });
      }
    }));
  }

  const { data: runNow } = await supabase.from("city_seed_runs").select("cities_processed,cities_failed,error_summary").eq("id", runId).single();
  await supabase.from("city_seed_runs").update({
    cities_processed: ((runNow?.cities_processed as number) ?? 0) + processed,
    cities_failed: ((runNow?.cities_failed as number) ?? 0) + failed,
    error_summary: errors.length ? [...(runNow?.error_summary as any[] ?? []), ...errors].slice(-200) : runNow?.error_summary,
  }).eq("id", runId);

  const returned = cities?.length ?? 0;
  const nextOffset = returned === limit ? offset + limit : null;
  return ok({ run_id: runId, processed, failed, next_offset: nextOffset, errors: errors.slice(0, 20) });
});
