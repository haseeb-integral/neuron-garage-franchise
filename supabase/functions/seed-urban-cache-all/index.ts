// Background loader: downloads NCES EDGE (public, 2022-23) + PSS (private, 2021-22)
// ONCE, then groups schools by state and upserts urban_institute_state_cache for
// every US state in a single pass. Returns immediately via EdgeRuntime.waitUntil
// so the caller doesn't have to wait ~15-25 minutes.
//
// Progress is tracked in public.urban_institute_seed_runs (one row per state per
// batch). Idempotent: existing cache rows are overwritten with fresher data.

import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore deno npm specifier
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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function parseEdgeAll(): Promise<Map<string, UiSchool[]>> {
  const zip = await downloadZip(EDGE_URL);
  const fileName = Object.keys(zip.files).find((n) => n.toUpperCase().endsWith(".TXT"));
  if (!fileName) throw new Error("EDGE: TXT not found in zip");
  const text = await zip.files[fileName].async("string");
  const byState = new Map<string, UiSchool[]>();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const p = line.split("|");
    if (p.length < 15) continue;
    const stateFips = p[8];
    if (!FIPS_TO_ABBR[stateFips]) continue;
    const lat = Number(p[12]);
    const lng = Number(p[13]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if ((lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const s: UiSchool = {
      name: p[2].trim(),
      lat, lng,
      level: "other",
      enrollment: null,
      kind: "public",
      state_fips: stateFips,
      external_id: p[0].trim(),
    };
    let arr = byState.get(stateFips);
    if (!arr) { arr = []; byState.set(stateFips, arr); }
    arr.push(s);
  }
  return byState;
}

async function parsePssAll(): Promise<Map<string, UiSchool[]>> {
  const zip = await downloadZip(PSS_URL);
  const fileName = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith(".csv"));
  if (!fileName) throw new Error("PSS: csv not found in zip");
  const text = await zip.files[fileName].async("string");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return new Map();
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const idx = (n: string) => headers.indexOf(n);
  const iState = idx("PSTABB");
  const iLat = idx("LATITUDE22");
  const iLng = idx("LONGITUDE22");
  const iName = idx("PINST");
  const iLevel = idx("LEVEL");
  const iEnroll = idx("P305");
  const iPpin = idx("PPIN");
  const byState = new Map<string, UiSchool[]>();
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const f = parseCsvLine(line);
    const abbr = iState >= 0 ? (f[iState] || "").trim().toUpperCase() : "";
    const stateFips = STATE_ABBR_TO_FIPS[abbr];
    if (!stateFips) continue;
    const lat = Number(f[iLat]);
    const lng = Number(f[iLng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if ((lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const name = (f[iName] || "").trim();
    if (!name) continue;
    const lvCode = (f[iLevel] || "").trim();
    const level = lvCode === "1" ? "elementary"
      : lvCode === "2" ? "high"
      : lvCode === "3" ? "elementary"
      : "other";
    let enrollment: number | null = null;
    if (iEnroll >= 0) {
      const v = (f[iEnroll] || "").trim();
      const n = Number(v);
      if (v && Number.isFinite(n) && n >= 0) enrollment = Math.round(n);
    }
    const s: UiSchool = {
      name, lat, lng, level, enrollment,
      kind: "private",
      state_fips: stateFips,
      external_id: (f[iPpin] || `${name}-${lat}-${lng}`).trim(),
    };
    let arr = byState.get(stateFips);
    if (!arr) { arr = []; byState.set(stateFips, arr); }
    arr.push(s);
  }
  return byState;
}

async function runBatch(batchId: string, onlyStates: string[] | null) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const allFips = Object.values(STATE_ABBR_TO_FIPS);
  const targetFips = onlyStates && onlyStates.length
    ? onlyStates.map((s) => STATE_ABBR_TO_FIPS[s.toUpperCase()]).filter(Boolean)
    : allFips;

  // Queue rows
  await supabase.from("urban_institute_seed_runs").insert(
    targetFips.map((fips) => ({
      batch_id: batchId,
      state_abbr: FIPS_TO_ABBR[fips],
      state_fips: fips,
      status: "queued",
    })),
  );

  try {
    const t0 = Date.now();
    console.log(`[batch ${batchId}] downloading EDGE + PSS zips…`);
    const [ccdByState, pssByState] = await Promise.all([parseEdgeAll(), parsePssAll()]);
    console.log(`[batch ${batchId}] parsed in ${Date.now() - t0}ms`);

    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    for (const fips of targetFips) {
      const abbr = FIPS_TO_ABBR[fips];
      await supabase
        .from("urban_institute_seed_runs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("batch_id", batchId)
        .eq("state_fips", fips);

      try {
        const ccd = ccdByState.get(fips) ?? [];
        const pss = pssByState.get(fips) ?? [];

        const { error: e1 } = await supabase
          .from("urban_institute_state_cache")
          .upsert({
            source: "ccd",
            state_fips: fips,
            year: 2022,
            schools: ccd,
            school_count: ccd.length,
            fetched_at: now,
            expires_at: expires,
          }, { onConflict: "source,state_fips,year" });
        if (e1) throw new Error(`ccd: ${e1.message}`);

        const { error: e2 } = await supabase
          .from("urban_institute_state_cache")
          .upsert({
            source: "pss",
            state_fips: fips,
            year: 2021,
            schools: pss,
            school_count: pss.length,
            fetched_at: now,
            expires_at: expires,
          }, { onConflict: "source,state_fips,year" });
        if (e2) throw new Error(`pss: ${e2.message}`);

        await supabase
          .from("urban_institute_seed_runs")
          .update({
            status: "done",
            ccd_count: ccd.length,
            pss_count: pss.length,
            finished_at: new Date().toISOString(),
          })
          .eq("batch_id", batchId)
          .eq("state_fips", fips);
        console.log(`[batch ${batchId}] ${abbr}: ccd=${ccd.length} pss=${pss.length}`);
      } catch (err) {
        const msg = (err as Error).message;
        console.error(`[batch ${batchId}] ${abbr} failed: ${msg}`);
        await supabase
          .from("urban_institute_seed_runs")
          .update({
            status: "error",
            error: msg,
            finished_at: new Date().toISOString(),
          })
          .eq("batch_id", batchId)
          .eq("state_fips", fips);
      }
    }
    console.log(`[batch ${batchId}] complete in ${Date.now() - t0}ms`);
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[batch ${batchId}] fatal: ${msg}`);
    await supabase
      .from("urban_institute_seed_runs")
      .update({ status: "error", error: `fatal: ${msg}`, finished_at: new Date().toISOString() })
      .eq("batch_id", batchId)
      .in("status", ["queued", "running"]);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const onlyParam = url.searchParams.get("states"); // e.g. "TX,CO" or omitted = all
  const onlyStates = onlyParam ? onlyParam.split(",").map((s) => s.trim()).filter(Boolean) : null;

  const batchId = crypto.randomUUID();

  // Fire-and-forget the long-running work.
  // @ts-ignore EdgeRuntime is provided by Supabase Deno runtime.
  EdgeRuntime.waitUntil(runBatch(batchId, onlyStates));

  return new Response(
    JSON.stringify({
      ok: true,
      batch_id: batchId,
      states: onlyStates ?? "ALL_50",
      message: "Seed started in background. Poll urban_institute_seed_runs for progress.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 },
  );
});
