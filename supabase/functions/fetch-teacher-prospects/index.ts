// Edge function: fetch-teacher-prospects
// Strategy (v2 — reliable city-scoped path, no full-state Apify crawl):
//   1. Hit NCES public school directory directly with City + State (FIPS) — returns
//      every school in that city in one HTML page. No rate-limit issue, no 15-row cap.
//   2. Parse the result rows (school name, address, phone, grades, NCES ID).
//   3. Use Firecrawl /v2/search to discover each school's official website.
//   4. Insert lightweight school placeholder rows into teacher_prospects so the UI
//      shows progress, and return the schools[] payload so the frontend can fan out
//      into the enrich-school-staff function for real teacher emails.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NCES_BASE = "https://nces.ed.gov/ccd/schoolsearch/school_list.asp";
const FC_SEARCH = "https://api.firecrawl.dev/v2/search";

const STATE_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",FL:"12",
  GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",
  MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",
  NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
  SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ParsedSchool = {
  ncesId: string;
  name: string;
  address: string;
  phone: string;
  county: string;
  students: number | null;
  grades: string;
};

// Parse the NCES "school_list.asp" HTML. Each school is rendered as a row of
// <td> cells: [number, link(name) + address, phone, county, students, grades].
// We pull the school NCES ID from the school_detail.asp?...&ID=<digits> link.
function parseNcesSchools(html: string): ParsedSchool[] {
  const out: ParsedSchool[] = [];
  // Match each <tr> that contains a school_detail.asp link
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1];
    const idMatch = row.match(/school_detail\.asp\?[^"']*?ID=(\d+)/i);
    if (!idMatch) continue;
    const ncesId = idMatch[1];

    // Pull all cell text
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim()
    );
    if (cells.length < 5) continue;

    // cells[1] = "school name <address>", cells[2] = phone, cells[3] = county,
    // cells[4] = students, cells[5] = grades
    const nameAndAddress = cells[1] ?? "";
    // Address typically starts with a number + comma-separated street, ends with state+ZIP
    const addrMatch = nameAndAddress.match(/(\d+\s+[A-Z0-9 .'\-]+,\s*[A-Z .'\-]+,\s*[A-Z]{2}\s*\d{5}.*)$/);
    const address = addrMatch ? addrMatch[1].trim() : "";
    const name = (addrMatch
      ? nameAndAddress.slice(0, addrMatch.index).trim()
      : nameAndAddress
    ).replace(/^\d+\.\s*/, "").trim();
    if (!name) continue;

    const phone = cells[2] ?? "";
    const county = cells[3] ?? "";
    const studentsRaw = (cells[4] ?? "").replace(/[^0-9]/g, "");
    const students = studentsRaw ? Number(studentsRaw) : null;
    const grades = cells[5] ?? "";

    out.push({ ncesId, name, address, phone, county, students, grades });
  }
  return out;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/\bIsd\b/g, "ISD")
    .replace(/\bEl\b/g, "Elementary")
    .replace(/\bMs\b/g, "Middle")
    .replace(/\bHs\b/g, "High");
}

async function discoverWebsite(
  fcKey: string,
  schoolName: string,
  city: string,
  state: string,
): Promise<string | null> {
  const query = `"${schoolName}" ${city} ${state} school official site`;
  try {
    const res = await fetch(FC_SEARCH, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fcKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 3 }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const hits: Array<{ url?: string }> = json?.data?.web ?? json?.data ?? json?.web ?? [];
    for (const h of hits) {
      const url = h?.url;
      if (!url || typeof url !== "string") continue;
      // Skip common noise domains that won't have a staff directory
      if (/(facebook|wikipedia|niche|greatschools|publicschoolreview|usnews|zillow|yelp|nces\.ed\.gov)/i.test(url)) continue;
      return url;
    }
  } catch (_) {
    return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!FC_KEY) return ok({ error: "Missing FIRECRAWL_API_KEY secret" });
    if (!SUPABASE_URL || !SERVICE_KEY) return ok({ error: "Missing Supabase server env" });

    let body: any;
    try { body = await req.json(); } catch { return ok({ error: "Invalid JSON body" }); }
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const stateInput = typeof body?.state === "string" ? body.state.trim().toUpperCase() : "";
    const limit = Number.isFinite(Number(body?.limit))
      ? Math.min(Math.max(Number(body.limit), 1), 100)
      : 25;
    if (!city || !stateInput) return ok({ error: "city and state are required" });
    const fips = STATE_FIPS[stateInput];
    if (!fips) return ok({ error: `Unknown state code "${stateInput}" — expected 2-letter postal abbreviation` });

    console.log(`[fetch-teacher-prospects] city="${city}" state=${stateInput} f