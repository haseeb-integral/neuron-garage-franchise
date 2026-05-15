// Edge function: fetch-teacher-prospects
// Calls Apify actor jungle_synthesizer/k12-school-staff-directory-scraper.
// IMPORTANT: This actor scrapes the NCES public-school directory at the STATE level
// and returns SCHOOL records (with teacher FTE counts) — not individual teachers.
// We fetch the state, then filter to the requested city before upserting.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTOR_ID = "jungle_synthesizer~k12-school-staff-directory-scraper";
const APIFY_BASE = "https://api.apify.com/v2";

// US state postal -> FIPS code (what the actor expects in `states[]`)
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

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function normalize(item: Record<string, any>, city: string, state: string, runId: string) {
  // NCES school records — map school-level fields. Teacher-specific fields will be null.
  const schoolName = pickStr(item.school_name, item.schoolName, item.name, item.SCH_NAME);
  const district = pickStr(item.district_name, item.districtName, item.district, item.LEA_NAME);
  const phone = pickStr(item.phone, item.phone_number, item.PHONE);
  const website = pickStr(item.website, item.url, item.WEBSITE);
  const teacherFte = item.teachers_fte ?? item.teacher_fte ?? item.FTE ?? item.fte ?? null;
  const ratio = item.student_teacher_ratio ?? item.studentTeacherRatio ?? null;
  return {
    name: schoolName ?? "(School record)",         // no teacher name available
    school: schoolName,
    district,
    email: null,                                    // actor doesn't return emails
    grade: pickStr(item.grade_level, item.gradeLevel, item.LEVEL),
    experience_years: null,
    city,
    state,
    fit_score: null as number | null,
    status: "new",
    apify_run_id: runId,
    raw: { ...item, _phone: phone, _website: website, _teacher_fte: teacherFte, _ratio: ratio },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!APIFY_TOKEN) return ok({ error: "Missing APIFY_API_TOKEN secret" });
    if (!SUPABASE_URL || !SERVICE_KEY) return ok({ error: "Missing Supabase server env" });

    let body: any;
    try { body = await req.json(); } catch { return ok({ error: "Invalid JSON body" }); }
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const stateInput = typeof body?.state === "string" ? body.state.trim().toUpperCase() : "";
    const limit = Number.isFinite(Number(body?.limit)) ? Math.min(Math.max(Number(body.limit), 1), 500) : 100;
    if (!city || !stateInput) return ok({ error: "city and state are required" });

    const fips = STATE_FIPS[stateInput];
    if (!fips) return ok({ error: `Unknown state code "${stateInput}" — expected 2-letter postal abbreviation` });

    console.log(`[fetch-teacher-prospects] city="${city}" state=${stateInput} fips=${fips} limit=${limit}`);

    // Actor input — required sp_* feedback fields + state FIPS filter
    const actorInput = {
      sp_intended_usage: "Internal franchise recruiting research — finding schools in target markets.",
      sp_improvement_suggestions: "n/a",
      sp_contact: "ops@neuron-garage.com",
      states: [fips],
      schoolTypes: [],
      gradeLevel: "",
      maxItems: Math.max(limit * 5, 200),       // overfetch since we filter by city
      maxListingPagesPerState: 50,
    };

    // 1. Start run
    const startRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    });
    if (!startRes.ok) {
      const txt = await startRes.text();
      return ok({ error: `Apify start failed (${startRes.status}): ${txt.slice(0, 400)}` });
    }
    const startJson = await startRes.json();
    const runId: string = startJson?.data?.id;
    const datasetId: string = startJson?.data?.defaultDatasetId;
    if (!runId || !datasetId) return ok({ error: "Apify did not return run id" });
    console.log(`[fetch-teacher-prospects] runId=${runId} datasetId=${datasetId}`);

    // 2. Poll (cap ~115s — actor can be slow)
    const deadline = Date.now() + 115_000;
    let status = "RUNNING";
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const sRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      if (!sRes.ok) continue;
      const sJson = await sRes.json();
      status = sJson?.data?.status ?? status;
      console.log(`[fetch-teacher-prospects] status=${status}`);
      if (["SUCCEEDED","FAILED","ABORTED","TIMED-OUT","TIMED_OUT"].includes(status)) break;
    }
    if (status !== "SUCCEEDED") {
      return ok({
        error: `Apify run ended with status ${status} (the K-12 actor often needs >2 min for a full state). Try a smaller state or re-run.`,
        run_id: runId,
        status,
      });
    }

    // 3. Fetch dataset
    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?clean=true&format=json&token=${APIFY_TOKEN}`
    );
    if (!itemsRes.ok) {
      const txt = await itemsRes.text();
      return ok({ error: `Apify dataset fetch failed: ${txt.slice(0, 300)}`, run_id: runId });
    }
    const allItems: any[] = await itemsRes.json();
    console.log(`[fetch-teacher-prospects] state returned ${allItems.length} schools`);

    // 4. Filter to requested city
    const cityLc = city.toLowerCase();
    const inCity = allItems.filter((it) => {
      const c = (it.city ?? it.CITY ?? it.school_city ?? it.address_city ?? "").toString().toLowerCase();
      return c === cityLc || c.includes(cityLc);
    }).slice(0, limit);
    console.log(`[fetch-teacher-prospects] ${inCity.length} match city="${city}"`);

    // 5. Insert (no email dedupe — schools have no email)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let inserted = 0;
    for (const raw of inCity) {
      const row = normalize(raw, city, stateInput, runId);
      const { error } = await supabase.from("teacher_prospects").insert(row);
      if (error) console.error("[fetch-teacher-prospects] insert err", error.message);
      else inserted++;
    }

    console.log(`[fetch-teacher-prospects] done inserted=${inserted}`);
    return ok({
      inserted,
      updated: 0,
      total: inCity.length,
      state_total: allItems.length,
      run_id: runId,
      note: inCity.length === 0
        ? `Actor returned ${allItems.length} schools for ${stateInput} but none matched city "${city}". Check spelling.`
        : "NOTE: This Apify actor returns SCHOOLS (not individual teachers). Names/emails of teachers are not available from this source.",
    });
  } catch (err) {
    console.error("[fetch-teacher-prospects] fatal", err);
    return ok({ error: (err as Error).message ?? "Unknown error" });
  }
});
