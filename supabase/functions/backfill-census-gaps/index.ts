// Phase A1: Backfill Census ACS demographic gaps for cities where
// children_5_12 / median_household_income / dual_working_families_pct /
// college_degree_pct / labor_force_participation / population are NULL.
//
// Uses the same Census ACS 5-year vintage 2023 endpoints and variable list
// as seed-cities-database/index.ts. Reads real Census data only — never
// invents values. Cities whose place name cannot be resolved are skipped
// and reported in the response.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CENSUS_KEY = Deno.env.get("CENSUS_API_KEY") ?? "";

const STATE_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",FL:"12",
  GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",
  MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",
  NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
  SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

const CENSUS_VINTAGE = "2023";
const CENSUS_VINTAGE_DATE = "2023-12-31";

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

async function fetchCensusForPlace(stateFips: string, placeFips: string) {
  const vars = [
    "B01003_001E",
    "B01001_004E","B01001_005E","B01001_028E","B01001_029E",
    "B19013_001E",
    "B15003_022E","B15003_023E","B15003_024E","B15003_025E","B15003_001E",
    // % Dual-Income Households — ACS B23007. Denominator is the top-level
    // "with own children under 18" (ALL family types, including single-parent).
    // Numerator is "married-couple family, husband in labor force, wife in
    // labor force" = B23007_006E (husband employed/AF + wife LF) + B23007_011E
    // (husband unemployed + wife LF). See _shared/metricFetchers.ts for the
    // full label paths and rationale.
    "B23007_002E","B23007_006E","B23007_011E",
    "B23025_002E","B23025_001E",
  ];
  const url = `https://api.census.gov/data/${CENSUS_VINTAGE}/acs/acs5?get=${vars.join(",")}&for=place:${placeFips}&in=state:${stateFips}&key=${CENSUS_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return { data: null, error: `Census ${r.status}` };
  const text = await r.text();
  if (!text || !text.trim().startsWith("[")) return { data: null, error: "Census empty body" };
  let arr: string[][];
  try { arr = JSON.parse(text); } catch { return { data: null, error: "Census bad JSON" }; }
  const row = arr?.[1];
  if (!row) return { data: null, error: "Census empty row" };

  const pop = num(row[0]);
  const age5_14 = (num(row[1]) ?? 0) + (num(row[2]) ?? 0) + (num(row[3]) ?? 0) + (num(row[4]) ?? 0);
  const children_5_12 = age5_14 > 0 ? Math.round(age5_14 * 0.8) : null;
  const median_household_income = num(row[5]);
  const bachelors = (num(row[6]) ?? 0) + (num(row[7]) ?? 0) + (num(row[8]) ?? 0) + (num(row[9]) ?? 0);
  const total_25 = num(row[10]);
  const college_degree_pct = pct(bachelors, total_25);
  const families_with_kids = num(row[11]);                       // B23007_002E — all family types w/ own children <18
  const dual_kids = (num(row[12]) ?? 0) + (num(row[13]) ?? 0);   // B23007_006E + _011E — married, husband LF, wife LF
  const dual_working_families_pct = families_with_kids && families_with_kids > 0 && dual_kids > 0
    ? Math.round((dual_kids / families_with_kids) * 1000) / 10
    : null;
  if (dual_working_families_pct != null && (dual_working_families_pct > 85 || dual_working_families_pct < 15)) {
    console.warn("[backfill-census-gaps] dual_working_families_pct out of expected 15–85 band",
      { placeFips, stateFips, dual_working_families_pct, dual_kids, families_with_kids });
  }
  const labor_force = num(row[14]);
  const pop_16 = num(row[15]);
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
    error: null as string | null,
  };
}

// Manual overrides for consolidated city-counties and renamed places whose
// official Census place names don't start with the common city name.
const PLACE_FIPS_OVERRIDES: Record<string, string> = {
  "athens|GA": "03440",       // Athens-Clarke County unified government (balance)
  "augusta|GA": "04204",      // Augusta-Richmond County consolidated government (balance)
  "carson city|NV": "09700",  // Carson City
  "lexington|KY": "46027",    // Lexington-Fayette urban county
  "louisville|KY": "48006",   // Louisville/Jefferson County metro government (balance)
  "macon|GA": "49008",        // Macon-Bibb County
  "nashville|TN": "52006",    // Nashville-Davidson metropolitan government (balance)
  "ventura|CA": "65042",      // San Buenaventura (Ventura)
};


const PLACE_CACHE = new Map<string, Array<{ name: string; fips: string }>>();
async function resolvePlaceFips(city: string, stateAbbr: string): Promise<string | null> {
  const stateFips = STATE_FIPS[stateAbbr];
  if (!stateFips) return null;
  const override = PLACE_FIPS_OVERRIDES[`${city.toLowerCase().trim()}|${stateAbbr}`];
  if (override) return override;
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


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);
  if (!CENSUS_KEY) return ok({ error: "CENSUS_API_KEY missing" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Find rows with at least one census gap.
  const { data: gaps, error: gapErr } = await supabase
    .from("us_cities_scored")
    .select("id, city_name, state_abbr, children_5_12, median_household_income, dual_working_families_pct, college_degree_pct, population, labor_force_participation")
    .or("children_5_12.is.null,dual_working_families_pct.is.null,college_degree_pct.is.null,median_household_income.is.null");
  if (gapErr) return ok({ error: gapErr.message }, 500);

  const rows = gaps ?? [];
  const skipped: Array<{ city: string; state: string; reason: string }> = [];
  let updated = 0;

  for (const r of rows as any[]) {
    const stateFips = STATE_FIPS[r.state_abbr];
    if (!stateFips) { skipped.push({ city: r.city_name, state: r.state_abbr, reason: "no state fips" }); continue; }
    const placeFips = await resolvePlaceFips(r.city_name, r.state_abbr);
    if (!placeFips) { skipped.push({ city: r.city_name, state: r.state_abbr, reason: "place not resolved" }); continue; }
    const { data: c, error } = await fetchCensusForPlace(stateFips, placeFips);
    if (error || !c) { skipped.push({ city: r.city_name, state: r.state_abbr, reason: error ?? "no data" }); continue; }

    // Only fill nulls — never overwrite existing real values.
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (r.children_5_12 == null && c.children_5_12 != null) patch.children_5_12 = c.children_5_12;
    if (r.median_household_income == null && c.median_household_income != null) patch.median_household_income = c.median_household_income;
    if (r.dual_working_families_pct == null && c.dual_working_families_pct != null) patch.dual_working_families_pct = c.dual_working_families_pct;
    if (r.college_degree_pct == null && c.college_degree_pct != null) patch.college_degree_pct = c.college_degree_pct;
    if (r.population == null && c.population != null) patch.population = c.population;
    if (r.labor_force_participation == null && c.labor_force_participation != null) patch.labor_force_participation = c.labor_force_participation;
    patch.census_last_updated = c.census_last_updated;

    if (Object.keys(patch).length > 1) {
      const { error: upErr } = await supabase.from("us_cities_scored").update(patch).eq("id", r.id);
      if (upErr) skipped.push({ city: r.city_name, state: r.state_abbr, reason: upErr.message });
      else updated++;
    }
  }

  return ok({ candidates: rows.length, updated, skipped });
});
