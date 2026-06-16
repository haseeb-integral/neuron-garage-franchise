// One-shot loader: downloads NCES EDGE (public, 2022-23) + PSS (private, 2021-22),
// filters to a given state (default Texas, FIPS 48), normalizes to the UiSchool
// shape used by compute-sas, and upserts into urban_institute_state_cache.
//
// Why NCES and not Urban Institute? The Urban Institute Education Data Portal
// is behind a Cloudflare JS challenge that blocks server-side fetches. NCES.gov
// hosts the same underlying CCD + PSS datasets as direct ZIPs with no bot wall,
// and Urban Institute is itself just a wrapper over NCES, so the data is
// equivalent for the School Ecosystem pillar.

import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore deno-style npm specifier
import JSZip from "npm:jszip@3.10.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",FL:"12",
  GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",
  MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",
  NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
  SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};
const FIPS_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_FIPS).map(([k, v]) => [v, k]),
);

const EDGE_URL = "https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2223.zip";
const PSS_URL = "https://nces.ed.gov/surveys/pss/zip/pss2122_pu_csv.zip";

interface UiSchool {
  name: string;
  lat: number;
  lng: number;
  level: string;
  enrollment: number | null;
  kind: "public" | "private";
  state_fips: string;
  external_id: string;
}

async function downloadZip(url: string): Promise<JSZip> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return await JSZip.loadAsync(buf);
}

async function parseEdge(stateFips: string): Promise<UiSchool[]> {
  const zip = await downloadZip(EDGE_URL);
  const fileName = Object.keys(zip.files).find((n) => n.toUpperCase().endsWith(".TXT"));
  if (!fileName) throw new Error("EDGE: TXT not found in zip");
  const text = await zip.files[fileName].async("string");
  const out: UiSchool[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const p = line.split("|");
    if (p.length < 15) continue;
    if (p[8] !== stateFips) continue;
    const lat = Number(p[12]);
    const lng = Number(p[13]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if ((lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    out.push({
      name: p[2].trim(),
      lat,
      lng,
      level: "other",
      enrollment: null,
      kind: "public",
      state_fips: stateFips,
      external_id: p[0].trim(),
    });
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser handling quoted fields with embedded commas.
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function parsePss(stateFips: string): Promise<UiSchool[]> {
  const zip = await downloadZip(PSS_URL);
  const fileName = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith(".csv"));
  if (!fileName) throw new Error("PSS: csv not found in zip");
  const text = await zip.files[fileName].async("string");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const idx = (name: string) => headers.indexOf(name);
  const iState = idx("PSTABB");
  const iLat = idx("LATITUDE22");
  const iLng = idx("LONGITUDE22");
  const iName = idx("PINST");
  const iLevel = idx("LEVEL");
  const iEnroll = idx("P305");
  const iPpin = idx("PPIN");
  const targetAbbr = FIPS_TO_ABBR[stateFips];
  if (!targetAbbr) throw new Error(`Unknown state_fips ${stateFips}`);
  const out: UiSchool[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const f = parseCsvLine(line);
    if (iState >= 0 && (f[iState] || "").trim().toUpperCase() !== targetAbbr) continue;
    const lat = Number(f[iLat]);
    const lng = Number(f[iLng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if ((lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const name = (f[iName] || "").trim();
    if (!name) continue;
    const lvCode = (f[iLevel] || "").trim();
    const level =
      lvCode === "1" ? "elementary" : lvCode === "2" ? "high" : lvCode === "3" ? "elementary" : "other";
    let enrollment: number | null = null;
    if (iEnroll >= 0) {
      const v = (f[iEnroll] || "").trim();
      const n = Number(v);
      if (v && Number.isFinite(n) && n >= 0) enrollment = Math.round(n);
    }
    out.push({
      name,
      lat,
      lng,
      level,
      enrollment,
      kind: "private",
      state_fips: stateFips,
      external_id: (f[iPpin] || `${name}-${lat}-${lng}`).trim(),
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const stateAbbr = (url.searchParams.get("state") || "TX").toUpperCase();
    const stateFips = STATE_ABBR_TO_FIPS[stateAbbr];
    if (!stateFips) {
      return new Response(JSON.stringify({ error: `Unknown state ${stateAbbr}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const t0 = Date.now();
    const [ccd, pss] = await Promise.all([parseEdge(stateFips), parsePss(stateFips)]);
    const tParse = Date.now() - t0;

    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const { error: e1 } = await supabase
      .from("urban_institute_state_cache")
      .upsert(
        {
          source: "ccd",
          state_fips: stateFips,
          year: 2022,
          schools: ccd,
          school_count: ccd.length,
          fetched_at: now,
          expires_at: expires,
        },
        { onConflict: "source,state_fips,year" },
      );
    if (e1) throw new Error(`ccd upsert: ${e1.message}`);

    const { error: e2 } = await supabase
      .from("urban_institute_state_cache")
      .upsert(
        {
          source: "pss",
          state_fips: stateFips,
          year: 2021,
          schools: pss,
          school_count: pss.length,
          fetched_at: now,
          expires_at: expires,
        },
        { onConflict: "source,state_fips,year" },
      );
    if (e2) throw new Error(`pss upsert: ${e2.message}`);

    return new Response(
      JSON.stringify({
        ok: true,
        state: stateAbbr,
        state_fips: stateFips,
        ccd_count: ccd.length,
        pss_count: pss.length,
        parse_ms: tParse,
        total_ms: Date.now() - t0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
