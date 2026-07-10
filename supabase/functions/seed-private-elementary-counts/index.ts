// Downloads the NCES PSS 2021-22 zip once, groups private elementary schools
// by city, and writes counts into us_cities_scored.private_elementary_count
// AND per-school rows into city_private_elementary_schools.
//
// Elementary = LEVEL 1 (elementary) or 3 (combined, includes K-5).
//
// Matching order per city:
//   1. Exact match on normalized (state, city) using PSS PCITY field.
//   2. Fallback: schools within ~5 miles of the city centroid (from us_cities_scored.latitude/longitude).
//
// Runs in background via EdgeRuntime.waitUntil. Progress in
// public.private_elementary_seed_runs. Manager-only trigger.

import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore npm specifier
import JSZip from "npm:jszip@3.10.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PSS_URL = "https://nces.ed.gov/surveys/pss/zip/pss2122_pu_csv.zip";

interface PssSchool {
  ppin: string;
  name: string;
  city_norm: string;
  state_abbr: string;
  lat: number;
  lng: number;
  enrollment: number | null;
  level: "elementary" | "high" | "other";
}

function normCity(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bsaint\b/g, "st")
    .replace(/\bst\./g, "st")
    .replace(/\bft\./g, "ft")
    .replace(/\bfort\b/g, "ft")
    .replace(/\bmount\b/g, "mt")
    .replace(/\bmt\./g, "mt")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function downloadPss(): Promise<PssSchool[]> {
  const res = await fetch(PSS_URL);
  if (!res.ok) throw new Error(`PSS download HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const csvName = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith(".csv"));
  if (!csvName) throw new Error("PSS: csv not found in zip");
  const text = await zip.files[csvName].async("string");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const iState = headers.indexOf("PSTABB");
  const iCity = headers.indexOf("PCITY");
  const iLat = headers.indexOf("LATITUDE22");
  const iLng = headers.indexOf("LONGITUDE22");
  const iName = headers.indexOf("PINST");
  const iLevel = headers.indexOf("LEVEL");
  const iEnroll = headers.indexOf("P305");
  const iPpin = headers.indexOf("PPIN");

  const out: PssSchool[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const f = parseCsvLine(line);
    const state = (f[iState] || "").trim().toUpperCase();
    const cityRaw = (f[iCity] || "").trim();
    if (!state || !cityRaw) continue;
    const lvCode = (f[iLevel] || "").trim();
    const level: PssSchool["level"] =
      lvCode === "1" ? "elementary"
      : lvCode === "3" ? "elementary"
      : lvCode === "2" ? "high"
      : "other";
    if (level !== "elementary") continue; // only keep elementary/combined
    const lat = Number(f[iLat]);
    const lng = Number(f[iLng]);
    const name = (f[iName] || "").trim();
    if (!name) continue;
    let enrollment: number | null = null;
    const eRaw = (f[iEnroll] || "").trim();
    const eNum = Number(eRaw);
    if (eRaw && Number.isFinite(eNum) && eNum >= 0) enrollment = Math.round(eNum);
    out.push({
      ppin: (f[iPpin] || `${name}-${cityRaw}-${state}`).trim(),
      name,
      city_norm: normCity(cityRaw),
      state_abbr: state,
      lat: Number.isFinite(lat) ? lat : NaN,
      lng: Number.isFinite(lng) ? lng : NaN,
      enrollment,
      level,
    });
  }
  return out;
}

// Great-circle miles.
function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function runBatch(batchId: string, dryRun: boolean, resume: boolean) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  console.log(`[pss-seed ${batchId}] downloading PSS zip...`);
  const t0 = Date.now();
  const schools = await downloadPss();
  console.log(`[pss-seed ${batchId}] parsed ${schools.length} elementary schools in ${Date.now() - t0}ms`);

  // Bucket by (state, city_norm) for fast name matching.
  const byKey = new Map<string, PssSchool[]>();
  for (const s of schools) {
    const k = `${s.state_abbr}|${s.city_norm}`;
    let arr = byKey.get(k);
    if (!arr) { arr = []; byKey.set(k, arr); }
    arr.push(s);
  }

  // Bucket by state for centroid fallback (only well-geocoded rows).
  const byState = new Map<string, PssSchool[]>();
  for (const s of schools) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    if (s.lat === 0 && s.lng === 0) continue;
    let arr = byState.get(s.state_abbr);
    if (!arr) { arr = []; byState.set(s.state_abbr, arr); }
    arr.push(s);
  }

  const { data: cities, error: cityErr } = await supabase
    .from("us_cities_scored")
    .select("id, city_name, state_abbr, latitude, longitude");
  if (cityErr) throw new Error(`load cities: ${cityErr.message}`);

  // Resume mode: skip cities that already have a 'done' row from any prior live batch.
  let skipIds = new Set<string>();
  if (resume && !dryRun) {
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("private_elementary_seed_runs")
        .select("city_id")
        .eq("status", "done")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`load resume state: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const r of data) if (r.city_id) skipIds.add(r.city_id as string);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    console.log(`[pss-seed ${batchId}] resume: ${skipIds.size} cities already done, will skip`);
  }

  console.log(`[pss-seed ${batchId}] processing ${cities?.length ?? 0} cities (dry_run=${dryRun}, resume=${resume})`);

  const RADIUS_MI = 5;

  for (const c of cities ?? []) {
    if (skipIds.has(c.id as string)) continue;
    const state = String(c.state_abbr || "").toUpperCase();
    const cityNorm = normCity(String(c.city_name || ""));
    if (!state || !cityNorm) continue;

    // 1) Name match.
    let matched: PssSchool[] = byKey.get(`${state}|${cityNorm}`) ?? [];
    let matchedBy: "name" | "centroid" | "none" = matched.length > 0 ? "name" : "none";

    // 2) Centroid fallback when name match is empty.
    if (matched.length === 0 && c.latitude != null && c.longitude != null) {
      const pool = byState.get(state) ?? [];
      const near: PssSchool[] = [];
      for (const s of pool) {
        if (milesBetween(Number(c.latitude), Number(c.longitude), s.lat, s.lng) <= RADIUS_MI) {
          near.push(s);
        }
      }
      if (near.length > 0) {
        matched = near;
        matchedBy = "centroid";
      }
    }

    // Dedupe by PPIN (a city can legitimately have same school listed twice via alt name).
    const seen = new Set<string>();
    matched = matched.filter((s) => {
      if (seen.has(s.ppin)) return false;
      seen.add(s.ppin);
      return true;
    });

    const count = matched.length;

    if (!dryRun) {
      const { error: updErr } = await supabase
        .from("us_cities_scored")
        .update({ private_elementary_count: count })
        .eq("id", c.id);
      if (updErr) {
        await supabase.from("private_elementary_seed_runs").insert({
          batch_id: batchId, city_id: c.id, city_name: c.city_name, state_abbr: state,
          count, matched_by: matchedBy, status: "error", error: `update: ${updErr.message}`,
        });
        continue;
      }

      // Replace list rows for this city.
      await supabase.from("city_private_elementary_schools").delete().eq("city_id", c.id);
      if (matched.length > 0) {
        const rows = matched.map((s) => ({
          city_id: c.id,
          ppin: s.ppin,
          name: s.name,
          lat: Number.isFinite(s.lat) ? s.lat : null,
          lng: Number.isFinite(s.lng) ? s.lng : null,
          enrollment: s.enrollment,
          level: s.level,
          matched_by: matchedBy,
          source: "pss_2021_22",
        }));
        // Chunk insert to be safe.
        for (let i = 0; i < rows.length; i += 500) {
          const { error: insErr } = await supabase
            .from("city_private_elementary_schools")
            .insert(rows.slice(i, i + 500));
          if (insErr) {
            await supabase.from("private_elementary_seed_runs").insert({
              batch_id: batchId, city_id: c.id, city_name: c.city_name, state_abbr: state,
              count, matched_by: matchedBy, status: "error", error: `insert list: ${insErr.message}`,
            });
          }
        }
      }
    }

    await supabase.from("private_elementary_seed_runs").insert({
      batch_id: batchId, city_id: c.id, city_name: c.city_name, state_abbr: state,
      count, matched_by: matchedBy, status: dryRun ? "dry_run" : "done",
    });
  }

  console.log(`[pss-seed ${batchId}] done in ${Date.now() - t0}ms`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role check via service client (RLS on user_roles blocks direct read).
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isStaff, error: rErr } = await svc.rpc("is_staff", { _user_id: claims.claims.sub });
    if (rErr || !isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: staff role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "1";
    const batchId = crypto.randomUUID();

    // @ts-ignore EdgeRuntime is provided by Supabase runtime.
    EdgeRuntime.waitUntil(runBatch(batchId, dryRun).catch(async (e) => {
      console.error(`[pss-seed ${batchId}] fatal:`, e);
      try {
        await svc.from("private_elementary_seed_runs").insert({
          batch_id: batchId, status: "error", error: `fatal: ${(e as Error).message}`,
        });
      } catch (_) { /* swallow */ }
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        batch_id: batchId,
        dry_run: dryRun,
        message: "PSS seed started in background. Poll private_elementary_seed_runs for progress.",
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[pss-seed] top-level error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
