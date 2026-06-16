// Urban Institute Education Data Portal adapter for Site Analysis (1B).
// Public API, no key required. Docs: https://educationdata.urban.org/documentation/
//
// We cache the per-state directory in `urban_institute_state_cache` so we hit
// the API at most once per (source, state_fips, year) per 30 days.
//
// Sources:
//   ccd = Common Core of Data (public K-12 schools), annual
//   pss = Private School Universe Survey, biennial
//
// Latest stable years as of mid-2026: CCD 2022, PSS 2021. Override per-call.

const DEFAULT_CCD_YEAR = 2022;
const DEFAULT_PSS_YEAR = 2021;

export interface UiSchool {
  name: string;
  lat: number;
  lng: number;
  level: string; // "elementary" | "middle" | "high" | "other" | ""
  enrollment: number | null;
  kind: "public" | "private";
  state_fips: string;
  external_id: string;
}

export const STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56",
};

function normalizeLevel(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase();
  if (!s) return "";
  if (s.includes("elementary") || s.includes("primary")) return "elementary";
  if (s.includes("middle")) return "middle";
  if (s.includes("high") || s.includes("secondary")) return "high";
  return "other";
}

// CCD school_level codes: 1=primary, 2=middle, 3=high, 4=other
function levelFromCcdCode(code: unknown): string {
  const n = Number(code);
  if (n === 1) return "elementary";
  if (n === 2) return "middle";
  if (n === 3) return "high";
  return "other";
}

// PSS school_level codes: 1=elementary, 2=secondary, 3=combined
function levelFromPssCode(code: unknown): string {
  const n = Number(code);
  if (n === 1) return "elementary";
  if (n === 2) return "high";
  if (n === 3) return "elementary"; // combined includes elementary grades
  return "other";
}

interface PageResp {
  count?: number;
  next?: string | null;
  results?: Array<Record<string, unknown>>;
}

async function fetchAllPages(initialUrl: string): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let url: string | null = initialUrl;
  let pages = 0;
  // Hard ceiling to avoid runaway. State directories cap around 15-20 pages at per_page=1000.
  while (url && pages < 30) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`UrbanInstitute ${res.status} on ${url}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as PageResp;
    if (Array.isArray(json.results)) out.push(...json.results);
    url = json.next ?? null;
    pages++;
  }
  return out;
}

export async function fetchUrbanSchools(
  supabase: any,
  opts: { source: "ccd" | "pss"; stateFips: string; year?: number },
): Promise<UiSchool[]> {
  const source = opts.source;
  const stateFips = opts.stateFips;
  const year = opts.year ?? (source === "ccd" ? DEFAULT_CCD_YEAR : DEFAULT_PSS_YEAR);

  // 1) Cache lookup.
  const { data: cached } = await supabase
    .from("urban_institute_state_cache")
    .select("schools, expires_at")
    .eq("source", source)
    .eq("state_fips", stateFips)
    .eq("year", year)
    .maybeSingle();
  if (cached && new Date(cached.expires_at) > new Date()) {
    return (cached.schools as UiSchool[]) ?? [];
  }

  // 2) Fetch from Urban Institute.
  const base = `https://educationdata.urban.org/api/v1/schools/${source}/directory/${year}/`;
  const url = `${base}?fips=${stateFips}&per_page=1000`;
  const raw = await fetchAllPages(url);

  // 3) Normalize.
  const schools: UiSchool[] = [];
  for (const r of raw) {
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    const name = String(r.school_name ?? r.inst_name ?? "").trim();
    if (!name) continue;
    const enrollmentRaw = r.enrollment ?? r.enrollment_fall ?? r.enroll_pre_k_12 ?? null;
    const enrollment = enrollmentRaw == null || enrollmentRaw === "" ? null : Number(enrollmentRaw);
    let level: string;
    if (source === "ccd") {
      level = r.school_level != null
        ? levelFromCcdCode(r.school_level)
        : normalizeLevel(r.level);
    } else {
      level = r.school_level != null
        ? levelFromPssCode(r.school_level)
        : normalizeLevel(r.level);
    }
    schools.push({
      name,
      lat,
      lng,
      level,
      enrollment: enrollment != null && Number.isFinite(enrollment) ? enrollment : null,
      kind: source === "ccd" ? "public" : "private",
      state_fips: stateFips,
      external_id: String(r.ncessch ?? r.ppin ?? r.school_id ?? `${name}-${lat}-${lng}`),
    });
  }

  // 4) Cache.
  try {
    await supabase
      .from("urban_institute_state_cache")
      .upsert(
        {
          source,
          state_fips: stateFips,
          year,
          schools,
          school_count: schools.length,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "source,state_fips,year" },
      );
  } catch (e) {
    console.warn("[urban-institute] cache write failed:", (e as Error).message);
  }
  return schools;
}
