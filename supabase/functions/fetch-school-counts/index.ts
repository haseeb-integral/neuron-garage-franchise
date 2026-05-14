// fetch-school-counts
// Pulls public elementary school counts + enrollment from the Urban Institute
// CCD API (free, no key) and upserts into city_market_signals.
//
// API note: the `city_location` query param is IGNORED by the upstream API.
// We fetch one full state at a time and group by city_location locally.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const YEAR = 2022; // latest CCD year currently published
const SCHOOL_LEVEL_ELEMENTARY = 1;
const BASE = `https://educationdata.urban.org/api/v1/schools/ccd/directory/${YEAR}/`;

// State name -> 2-digit FIPS
const STATE_FIPS: Record<string, string> = {
  Alabama: "01", Alaska: "02", Arizona: "04", Arkansas: "05", California: "06",
  Colorado: "08", Connecticut: "09", Delaware: "10", "District of Columbia": "11",
  Florida: "12", Georgia: "13", Hawaii: "15", Idaho: "16", Illinois: "17",
  Indiana: "18", Iowa: "19", Kansas: "20", Kentucky: "21", Louisiana: "22",
  Maine: "23", Maryland: "24", Massachusetts: "25", Michigan: "26", Minnesota: "27",
  Mississippi: "28", Missouri: "29", Montana: "30", Nebraska: "31", Nevada: "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", Ohio: "39", Oklahoma: "40",
  Oregon: "41", Pennsylvania: "42", "Rhode Island": "44", "South Carolina": "45",
  "South Dakota": "46", Tennessee: "47", Texas: "48", Utah: "49", Vermont: "50",
  Virginia: "51", Washington: "53", "West Virginia": "54", Wisconsin: "55",
  Wyoming: "56",
};

const normalizeCity = (s: string) =>
  s.toUpperCase().replace(/\./g, "").replace(/\s+/g, " ").trim();

type StateBucket = Map<string, { count: number; enrollment: number }>;

async function fetchStateBucket(fips: string): Promise<StateBucket> {
  const bucket: StateBucket = new Map();
  let url: string | null = `${BASE}?fips=${fips}&school_level=${SCHOOL_LEVEL_ELEMENTARY}`;
  let pages = 0;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`CCD ${fips} HTTP ${res.status} on ${url}`);
    }
    const data: any = await res.json();
    for (const row of data.results ?? []) {
      const city = row.city_location ? normalizeCity(String(row.city_location)) : "";
      if (!city) continue;
      const enr = typeof row.enrollment === "number" && row.enrollment > 0 ? row.enrollment : 0;
      const cur = bucket.get(city) ?? { count: 0, enrollment: 0 };
      cur.count += 1;
      cur.enrollment += enr;
      bucket.set(city, cur);
    }
    url = data.next ?? null;
    pages += 1;
    if (pages > 50) break; // safety
  }
  return bucket;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use service role for writes (RLS-safe; we already authenticated above)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty body ok */ }
  const cityIds: string[] | undefined = Array.isArray(body?.cityIds) ? body.cityIds : undefined;

  // Load target cities
  let q = admin.from("cities").select("id, city, state");
  if (cityIds?.length) q = q.in("id", cityIds);
  const { data: cities, error: citiesErr } = await q;
  if (citiesErr) {
    return new Response(JSON.stringify({ error: citiesErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!cities?.length) {
    return new Response(JSON.stringify({ processed: 0, withData: 0, zeroResults: [], errors: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by FIPS
  const byFips = new Map<string, typeof cities>();
  const unknownStates: { city: string; state: string }[] = [];
  for (const c of cities) {
    const fips = STATE_FIPS[c.state];
    if (!fips) { unknownStates.push({ city: c.city, state: c.state }); continue; }
    const list = byFips.get(fips) ?? [];
    list.push(c);
    byFips.set(fips, list);
  }

  const zeroResults: { city: string; state: string }[] = [];
  const errors: { state: string; error: string }[] = [];
  const upserts: any[] = [];
  let withData = 0;

  for (const [fips, list] of byFips) {
    const stateName = list[0].state;
    let bucket: StateBucket;
    try {
      console.log(`Fetching CCD elementary schools for ${stateName} (fips=${fips})...`);
      bucket = await fetchStateBucket(fips);
      console.log(`  -> ${bucket.size} unique cities returned for ${stateName}`);
    } catch (e: any) {
      console.error(`CCD fetch failed for ${stateName}:`, e.message);
      errors.push({ state: stateName, error: e.message });
      continue;
    }
    const sourceUrl = `${BASE}?fips=${fips}&school_level=${SCHOOL_LEVEL_ELEMENTARY}`;
    for (const c of list) {
      const key = normalizeCity(c.city);
      const hit = bucket.get(key);
      if (!hit || hit.count === 0) {
        console.warn(`No CCD elementary results for ${c.city}, ${c.state} (lookup key="${key}")`);
        zeroResults.push({ city: c.city, state: c.state });
        continue;
      }
      withData += 1;
      upserts.push({
        city_id: c.id,
        signal_key: "public_elementary_count",
        label: "Public elementary schools",
        value: String(hit.count),
        source: "nces_ccd",
        source_url: sourceUrl,
      });
      upserts.push({
        city_id: c.id,
        signal_key: "public_elementary_enrollment",
        label: "Public elementary enrollment",
        value: String(hit.enrollment),
        source: "nces_ccd",
        source_url: sourceUrl,
      });
    }
  }

  if (upserts.length) {
    const { error: upErr } = await admin
      .from("city_market_signals")
      .upsert(upserts, { onConflict: "city_id,signal_key" });
    if (upErr) {
      console.error("Upsert failed:", upErr.message);
      return new Response(JSON.stringify({ error: upErr.message, processed: cities.length, withData, zeroResults, errors }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({
    processed: cities.length,
    withData,
    zeroResults,
    unknownStates,
    errors,
    year: YEAR,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
