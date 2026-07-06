// backfill-affluent-families — Phase 2 (3 test cities) & Phase 3 (full 817)
//
// For each requested city:
//   1. Fetch BEA RPP for its state (already used by TAM pillar).
//   2. Call fetchB19131AffluentFamilies(city, state, rpp) to get count + share
//      + snapped bracket + effective threshold.
//   3. Write the 4 new columns to us_cities_scored (idempotent — safe to re-run).
//   4. Return raw numbers per city so we can eyeball them in chat.
//
// Body:
//   { cities: [{ city: "Plano", state: "TX" }, ...] }   // explicit list
//   OR
//   { all: true }                                       // every scored city
//
// Auth: manager/admin. Service-role callers bypass the role check.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  fetchB19131AffluentFamilies,
  fetchBeaRpp,
} from "../_shared/metricFetchers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CityInput = { city: string; state: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);
  const isServiceRole = authHeader.includes(serviceKey);

  if (!isServiceRole) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["manager", "admin"]);
    if (!roleRows || roleRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "forbidden: manager required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  let cities: CityInput[] = [];

  if (Array.isArray(body?.cities) && body.cities.length > 0) {
    cities = body.cities
      .map((c: any) => ({
        city: String(c?.city ?? "").trim(),
        state: String(c?.state ?? "").trim(),
      }))
      .filter((c: CityInput) => c.city && c.state);
  } else if (body?.all === true) {
    const offset = Number.isFinite(body?.offset) ? Number(body.offset) : 0;
    const limit = Number.isFinite(body?.limit) ? Number(body.limit) : 1000;
    const { data, error } = await admin
      .from("us_cities_scored")
      .select("city_name, state_abbr")
      .order("state_abbr")
      .order("city_name")
      .range(offset, offset + limit - 1);
    if (error) {
      return new Response(
        JSON.stringify({ error: "failed to list cities", detail: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    cities = (data ?? []).map((r) => ({
      city: r.city_name as string,
      state: r.state_abbr as string,
    }));
  }

  if (cities.length === 0) {
    return new Response(
      JSON.stringify({
        error: "body must include { cities: [...] } or { all: true }",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Cache RPP per state so we don't hit BEA once per city.
  const rppByState = new Map<string, number | null>();
  async function getRpp(state: string): Promise<number | null> {
    if (rppByState.has(state)) return rppByState.get(state) ?? null;
    const { data } = await fetchBeaRpp(state);
    const v = data?.rpp_all_items ?? null;
    rppByState.set(state, v);
    return v;
  }

  const async_mode = body?.async === true;

  async function processAll() {
    for (const { city, state } of cities) {
      const rpp = await getRpp(state);
      const m = await fetchB19131AffluentFamilies(city, state, rpp);

      const { data: scored } = await admin
        .from("us_cities_scored")
        .select("id")
        .ilike("city_name", city)
        .eq("state_abbr", state)
        .maybeSingle();

      if (scored && m.error === null) {
        await admin
          .from("us_cities_scored")
          .update({
            affluent_families_count: m.affluent_families_count,
            affluent_families_share: m.affluent_families_share,
            affluent_families_snapped_bracket: m.affluent_families_snapped_bracket,
            affluent_families_effective_threshold:
              m.affluent_families_effective_threshold,
          })
          .eq("id", scored.id);
      }
      if (!async_mode) {
        results.push({
          city: `${city}, ${state}`,
          rpp_used: rpp,
          effective_threshold: m.affluent_families_effective_threshold,
          snapped_bracket: m.affluent_families_snapped_bracket,
          affluent_count: m.affluent_families_count,
          affluent_share: m.affluent_families_share,
          families_with_own_children_total: m.families_with_own_children_total,
          patched: !!scored && m.error === null,
          row_found: !!scored,
          error: m.error,
        });
      }
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  const results: any[] = [];

  if (async_mode) {
    // Fire-and-forget background task. Response returns immediately.
    // deno-lint-ignore no-explicit-any
    const runtime: any = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) {
      runtime.waitUntil(processAll());
    } else {
      processAll();
    }
    return new Response(
      JSON.stringify({ ok: true, started: true, count: cities.length }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await processAll();

  return new Response(
    JSON.stringify({ ok: true, count: results.length, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
