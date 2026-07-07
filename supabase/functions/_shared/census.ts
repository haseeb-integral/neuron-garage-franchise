// Census ACS lookups for Site Analysis (1B). v0.1: sample-points approximation
// — we reverse-geocode each sample point to a tract via the Census Geocoder,
// then average ACS variables across the unique tracts in the isochrone.
const CENSUS_API_KEY = Deno.env.get("CENSUS_API_KEY");

if (!CENSUS_API_KEY) {
  console.warn("[sas] CENSUS_API_KEY missing — ACS calls will fail");
}

const ACS_YEAR = 2022;

// Resolve a (lat,lng) to {state, county, tract} FIPS codes.
export async function pointToTract(
  lat: number,
  lng: number,
): Promise<{ state: string; county: string; tract: string } | null> {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Census+Tracts&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.result?.geographies?.["Census Tracts"]?.[0];
    if (!t) return null;
    return { state: t.STATE, county: t.COUNTY, tract: t.TRACT };
  } catch {
    return null;
  }
}

interface TractAcs {
  totalPop: number;
  medianHhi: number;
  pctAbove150k: number;
  /** Percent of households with income >= $200k (B19001_017E / B19001_001E). */
  pctAbove200k: number;
  /** Raw households >= $200k in this tract (B19001_017E). */
  hhAbove200k: number;
  pctDualIncome: number;
  children5to12: number;
  familiesWithKids: number;
}

// Pulls the variables we need for ONE tract.
// B01003_001E total pop
// B19013_001E median HHI
// B19001_001E total HH, _014E 100-125k, _015E 125-150k, _016E 150-200k, _017E 200k+
// B08202_001E HH by workers total, _007E 2-worker, _008E 3+ worker
// B09001_006E age 6-8, _007E age 9-11, _008E age 12-14, _005E age 3-5
// B11003_001E total families, _002E w/ own children under 18
export async function tractAcs(
  state: string,
  county: string,
  tract: string,
): Promise<TractAcs | null> {
  const vars = [
    "B01003_001E",
    "B19013_001E",
    "B19001_001E",
    "B19001_014E",
    "B19001_015E",
    "B19001_016E",
    "B19001_017E",
    "B08202_001E",
    "B08202_007E",
    "B08202_008E",
    "B09001_005E",
    "B09001_006E",
    "B09001_007E",
    "B09001_008E",
    "B11003_001E",
    "B11003_002E",
  ].join(",");
  const url = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=${vars}&for=tract:${tract}&in=state:${state}+county:${county}&key=${CENSUS_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return null;
    const [, row] = data;
    const n = (i: number) => {
      const v = Number(row[i]);
      return Number.isFinite(v) && v >= 0 ? v : 0;
    };
    const totalPop = n(0);
    const medianHhi = n(1);
    const totalHh = n(2);
    const above150 = n(5) + n(6); // 150-200k + 200k+
    const above200 = n(6); // 200k+
    const above100 = n(3) + n(4) + n(5) + n(6); // not used directly but kept for raw
    const totalWorkers = n(7);
    const dual = n(8) + n(9);
    const pctAbove150k = totalHh > 0 ? (above150 / totalHh) * 100 : 0;
    const pctAbove200k = totalHh > 0 ? (above200 / totalHh) * 100 : 0;
    const pctDualIncome = totalWorkers > 0 ? (dual / totalWorkers) * 100 : 0;
    // children 5-12 = (age 3-5 * 1/3) + age 6-8 + age 9-11 + (age 12-14 * 1/3)
    const children5to12 = Math.round(n(10) / 3 + n(11) + n(12) + n(13) / 3);
    // families with kids 5-12 ≈ families with own children * (children 5-12 / total under-18 pop) — rough
    // simpler proxy: families with own children under 18 * 0.5
    const familiesWithKids = Math.round(n(15) * 0.5);
    return {
      totalPop,
      medianHhi,
      pctAbove150k,
      pctAbove200k,
      hhAbove200k: above200,
      pctDualIncome,
      children5to12,
      familiesWithKids,
    };
  } catch {
    return null;
  }
}

// Aggregate ACS across the sampled points by averaging unique tracts.
export async function aggregateAcs(
  samples: Array<{ lat: number; lng: number }>,
): Promise<{
  medianHhi: number;
  pctAbove150k: number;
  pctAbove200k: number;
  hhAbove200k: number;
  pctDualIncome: number;
  children5to12: number; // SCALED by tract count (proxy for sum)
  familiesWithKids: number; // SCALED by tract count
  totalPop: number; // sum across unique tracts
  tractsHit: number;
  /** Resolved tract identifiers — used by the UI to build verify-at-source links. */
  tracts: Array<{ state: string; county: string; tract: string }>;
}> {
  const seen = new Set<string>();
  const tracts: TractAcs[] = [];
  const tractIds: Array<{ state: string; county: string; tract: string }> = [];
  for (const s of samples) {
    const t = await pointToTract(s.lat, s.lng);
    if (!t) continue;
    const key = `${t.state}-${t.county}-${t.tract}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const a = await tractAcs(t.state, t.county, t.tract);
    if (a) {
      tracts.push(a);
      tractIds.push(t);
    }
  }
  if (tracts.length === 0) {
    return {
      medianHhi: 0,
      pctAbove150k: 0,
      pctAbove200k: 0,
      hhAbove200k: 0,
      pctDualIncome: 0,
      children5to12: 0,
      familiesWithKids: 0,
      totalPop: 0,
      tractsHit: 0,
      tracts: [],
    };
  }
  const avg = (sel: (a: TractAcs) => number) =>
    tracts.reduce((s, a) => s + sel(a), 0) / tracts.length;
  const sum = (sel: (a: TractAcs) => number) => tracts.reduce((s, a) => s + sel(a), 0);
  return {
    medianHhi: avg((a) => a.medianHhi),
    pctAbove150k: avg((a) => a.pctAbove150k),
    pctAbove200k: avg((a) => a.pctAbove200k),
    hhAbove200k: sum((a) => a.hhAbove200k),
    pctDualIncome: avg((a) => a.pctDualIncome),
    children5to12: sum((a) => a.children5to12),
    familiesWithKids: sum((a) => a.familiesWithKids),
    totalPop: sum((a) => a.totalPop),
    tractsHit: tracts.length,
    tracts: tractIds,
  };
}

// ---------------------------------------------------------------------------
// Verify-link helpers — build click-through URLs a human can paste in a
// browser to confirm the same number lives in the upstream Census source.
// ---------------------------------------------------------------------------

/** Build a Census ACS API URL for one (state, county) group of tracts. */
export function censusApiUrl(
  state: string,
  county: string,
  tracts: string[],
  varList = ["B19013_001E", "B01003_001E"],
): string {
  const get = varList.join(",");
  const tractStr = tracts.join(",");
  return `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=${get}&for=tract:${tractStr}&in=state:${state}+county:${county}`;
}

/** Human-readable data.census.gov URL for one tract. */
export function dataCensusUrl(state: string, county: string, tract: string): string {
  // GEO_ID for a tract is 1400000US<state><county><tract>
  const geoId = `1400000US${state}${county}${tract}`;
  return `https://data.census.gov/profile?g=${geoId}`;
}

