// Recompute derived city fields from authoritative data only.
//
// For each city (filterable):
//   - public_elementary_count        = COUNT(public_schools where elementary-serving, not charter, regular)
//   - charter_elementary_count       = COUNT(public_schools where elementary-serving, is_charter)
//   - public_elementary_teacher_count = SUM(teachers_fte) over the public-elementary set (rounded)
//   - public_school_count            = COUNT(all public_schools)
//   - public_school_enrollment       = SUM(enrollment)
//   - col_salary_index               = round(avg_elementary_teacher_salary_usd * 100 / cost_of_living_index, 1)
//     (only when BOTH inputs exist; otherwise NULL + gap log)
//
// Private school counts are NOT touched here — they need the NCES PSS backfill
// (separate function, deferred). If they're NULL and PSS hasn't run, we log a gap.
//
// Body: { "limit": 200, "offset": 0, "state": "TX" } (all optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ELEMENTARY_LEVELS = new Set(["elementary", "elementary_middle", "combined"]);

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logGap(supabase: any, cityId: string, field: string, reason: string) {
  await supabase.from("city_data_gaps").upsert(
    { city_id: cityId, field_name: field, reason, checked_at: new Date().toISOString() },
    { onConflict: "city_id,field_name" },
  );
}

async function clearGap(supabase: any, cityId: string, field: string) {
  await supabase.from("city_data_gaps")
    .delete()
    .eq("city_id", cityId)
    .eq("field_name", field);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const limit = Math.max(1, Math.min(500, Number(body.limit ?? 200)));
  const offset = Math.max(0, Number(body.offset ?? 0));
  const stateFilter: string | null = body.state ? String(body.state).toUpperCase() : null;

  let q = supabase
    .from("us_cities_scored")
    .select("id, city_name, state_abbr, avg_elementary_teacher_salary_usd, cost_of_living_index")
    .order("state_abbr").order("city_name");
  if (stateFilter) q = q.eq("state_abbr", stateFilter);
  const { data: cities, error } = await q.range(offset, offset + limit - 1);
  if (error) return ok({ error: error.message }, 500);
  if (!cities || cities.length === 0) return ok({ processed: 0, next_offset: null });

  let processed = 0;
  let salaryComputed = 0;
  const errors: any[] = [];

  for (const c of cities) {
    try {
      // Pull this city's schools.
      const { data: schools, error: sErr } = await supabase
        .from("public_schools")
        .select("school_level, is_charter, school_type, school_status, teachers_fte, enrollment")
        .eq("us_cities_scored_id", c.id);
      if (sErr) throw new Error(`schools: ${sErr.message}`);

      const open = (schools ?? []).filter((s: any) => s.school_status === "open" || s.school_status == null);

      const elemPublic = open.filter((s: any) =>
        ELEMENTARY_LEVELS.has(s.school_level) && !s.is_charter && (s.school_type === "regular" || s.school_type == null)
      );
      const elemCharter = open.filter((s: any) =>
        ELEMENTARY_LEVELS.has(s.school_level) && s.is_charter
      );

      const publicCount = elemPublic.length;
      const charterCount = elemCharter.length;
      const teacherSum = elemPublic.reduce((acc: number, s: any) =>
        acc + (Number.isFinite(Number(s.teachers_fte)) ? Number(s.teachers_fte) : 0), 0);
      const allCount = open.length;
      const enrollSum = open.reduce((acc: number, s: any) =>
        acc + (Number.isFinite(Number(s.enrollment)) ? Number(s.enrollment) : 0), 0);

      // Deterministic col_salary_index
      let colSalary: number | null = null;
      const sal = Number(c.avg_elementary_teacher_salary_usd);
      const col = Number(c.cost_of_living_index);
      if (Number.isFinite(sal) && sal > 0 && Number.isFinite(col) && col > 0) {
        colSalary = Math.round(sal * 100 / col * 10) / 10;
        salaryComputed++;
        await clearGap(supabase, c.id, "col_salary_index");
      } else {
        const missing = [];
        if (!Number.isFinite(sal) || sal <= 0) missing.push("avg_elementary_teacher_salary_usd");
        if (!Number.isFinite(col) || col <= 0) missing.push("cost_of_living_index");
        await logGap(supabase, c.id, "col_salary_index", `missing input(s): ${missing.join(", ")}`);
      }

      const update: Record<string, any> = {
        public_elementary_count: publicCount,
        charter_elementary_count: charterCount,
        public_elementary_teacher_count: Math.round(teacherSum) || (publicCount > 0 ? null : 0),
        public_school_count: allCount,
        public_school_enrollment: enrollSum || (allCount > 0 ? null : 0),
      };
      if (colSalary != null) update.col_salary_index = colSalary;

      // If we have public schools, clear the gap; if not, log it (only if not already there from backfill).
      if (publicCount > 0) {
        await clearGap(supabase, c.id, "public_elementary_count");
      } else if (allCount === 0) {
        await logGap(supabase, c.id, "public_elementary_count", "no public_schools rows linked to this city");
      }

      const { error: uErr } = await supabase.from("us_cities_scored").update(update).eq("id", c.id);
      if (uErr) throw new Error(`update: ${uErr.message}`);

      processed++;
    } catch (e) {
      errors.push({ city: `${c.city_name}, ${c.state_abbr}`, error: (e as Error).message });
    }
  }

  let countQ = supabase.from("us_cities_scored").select("id", { count: "exact", head: true });
  if (stateFilter) countQ = countQ.eq("state_abbr", stateFilter);
  const { count } = await countQ;
  const nextOffset = (count != null && offset + limit < count) ? offset + limit : null;

  return ok({ processed, salary_computed: salaryComputed, next_offset: nextOffset, errors });
});
