// Edge function: fetch-teacher-prospects
// Calls the Apify K-12 staff directory scraper and upserts results into teacher_prospects.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTOR_ID = "jungle_synthesizer~k12-school-staff-directory-scrape";
const APIFY_BASE = "https://api.apify.com/v2";

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normalize(item: Record<string, any>, city: string, state: string, runId: string) {
  const name =
    pickStr(item.name, item.full_name, item.fullName) ??
    pickStr([item.first_name, item.last_name].filter(Boolean).join(" "),
             [item.firstName, item.lastName].filter(Boolean).join(" "));
  const email = pickStr(item.email, item.work_email, item.email_address)?.toLowerCase() ?? null;
  const expRaw = item.years_experience ?? item.experience_years ?? item.experience;
  const experience_years = Number.isFinite(Number(expRaw)) ? Number(expRaw) : null;
  return {
    name,
    school: pickStr(item.school, item.school_name, item.workplace, item.organization),
    district: pickStr(item.district, item.school_district, item.districtName),
    email,
    grade: pickStr(item.grade, item.grade_level, item.gradeLevel),
    experience_years,
    city,
    state,
    fit_score: null as number | null,
    status: "new",
    apify_run_id: runId,
    raw: item,
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
    const state = typeof body?.state === "string" ? body.state.trim() : "";
    const limit = Number.isFinite(Number(body?.limit)) ? Math.min(Math.max(Number(body.limit), 1), 500) : 100;
    if (!city || !state) return ok({ error: "city and state are required" });

    const location = `${city} ${state}`;
    console.log(`[fetch-teacher-prospects] Starting Apify run for "${location}", limit=${limit}`);

    // 1. Start the run (async)
    const startRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, maxResults: limit }),
    });
    if (!startRes.ok) {
      const txt = await startRes.text();
      return ok({ error: `Apify start failed (${startRes.status}): ${txt.slice(0, 300)}` });
    }
    const startJson = await startRes.json();
    const runId: string = startJson?.data?.id;
    const datasetId: string = startJson?.data?.defaultDatasetId;
    if (!runId || !datasetId) return ok({ error: "Apify did not return run id" });
    console.log(`[fetch-teacher-prospects] runId=${runId} datasetId=${datasetId}`);

    // 2. Poll for completion (cap ~110s)
    const deadline = Date.now() + 110_000;
    let status = "RUNNING";
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const sRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      if (!sRes.ok) continue;
      const sJson = await sRes.json();
      status = sJson?.data?.status ?? status;
      console.log(`[fetch-teacher-prospects] poll status=${status}`);
      if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"].includes(status)) break;
    }
    if (status !== "SUCCEEDED") {
      return ok({ error: `Apify run ended with status ${status}`, run_id: runId });
    }

    // 3. Fetch dataset items
    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?clean=true&format=json&limit=${limit}&token=${APIFY_TOKEN}`
    );
    if (!itemsRes.ok) {
      const txt = await itemsRes.text();
      return ok({ error: `Apify dataset fetch failed: ${txt.slice(0, 300)}`, run_id: runId });
    }
    const items: any[] = await itemsRes.json();
    console.log(`[fetch-teacher-prospects] received ${items.length} items`);

    // 4. Upsert
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let inserted = 0, updated = 0;

    for (const raw of items) {
      const row = normalize(raw, city, state, runId);
      try {
        if (row.email) {
          const { data: existing } = await supabase
            .from("teacher_prospects")
            .select("id")
            .eq("email", row.email)
            .limit(1)
            .maybeSingle();
          if (existing?.id) {
            await supabase.from("teacher_prospects").update(row).eq("id", existing.id);
            updated++;
          } else {
            const { error } = await supabase.from("teacher_prospects").insert(row);
            if (!error) inserted++;
          }
        } else {
          const { error } = await supabase.from("teacher_prospects").insert(row);
          if (!error) inserted++;
        }
      } catch (e) {
        console.error("[fetch-teacher-prospects] row upsert failed", (e as Error).message);
      }
    }

    console.log(`[fetch-teacher-prospects] done inserted=${inserted} updated=${updated}`);
    return ok({ inserted, updated, total: items.length, run_id: runId });
  } catch (err) {
    console.error("[fetch-teacher-prospects] fatal", err);
    return ok({ error: (err as Error).message ?? "Unknown error" });
  }
});
