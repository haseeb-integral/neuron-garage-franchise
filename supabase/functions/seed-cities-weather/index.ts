// Seed summer-weather metrics for every city in us_cities_scored.
// Source: Open-Meteo Historical Weather API — free, no API key, no signup.
// https://open-meteo.com/en/docs/historical-weather-api
//
// Body (all optional):
//   { "limit": 200, "offset": 0, "dry_run": false }
//
// Pulls 2020-01-01..2024-12-31 daily max temp + precipitation for each city's lat/lng,
// derives:
//   - avg_peak_summer_temperature   (mean of Jun/Jul/Aug daily highs, °F)
//   - days_above_90f                (avg annual count of days >= 90°F)
//   - summer_precip_days            (avg Jun/Jul/Aug days with precip > 0.1 inch)
//   - summer_weather_index          (0-100: higher = better summer camp weather)
//
// All metrics land in city_market_signals (one row per signal_key per city).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface WeatherMetrics {
  avg_peak_summer_temperature: number;
  days_above_90f: number;
  summer_precip_days: number;
  summer_weather_index: number;
}

async function fetchWeather(lat: number, lng: number): Promise<{ metrics: WeatherMetrics | null; err: string | null }> {
  // 3 years of daily data (smaller payload = far fewer rate-limit hits on Open-Meteo free tier)
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=2022-01-01&end_date=2024-12-31` +
    `&daily=temperature_2m_max,precipitation_sum` +
    `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return { metrics: null, err: `HTTP ${r.status}: ${txt.slice(0, 120)}` };
  }
  const j = await r.json();
  const dates: string[] = j?.daily?.time ?? [];
  const tmax: (number | null)[] = j?.daily?.temperature_2m_max ?? [];
  const precip: (number | null)[] = j?.daily?.precipitation_sum ?? [];
  if (dates.length === 0) return { metrics: null, err: "empty daily array" };

  let summerTempSum = 0, summerTempN = 0;
  let summerPrecipDays = 0;
  let daysAbove90 = 0;
  const yearsSeen = new Set<string>();

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const year = d.slice(0, 4);
    const month = Number(d.slice(5, 7));
    yearsSeen.add(year);
    const t = tmax[i];
    const p = precip[i];
    if (t != null && Number.isFinite(t)) {
      if (t >= 90) daysAbove90++;
      if (month >= 6 && month <= 8) { summerTempSum += t; summerTempN++; }
    }
    if (p != null && p > 0.1 && month >= 6 && month <= 8) summerPrecipDays++;
  }

  const years = Math.max(1, yearsSeen.size);
  const avg_peak_summer_temperature = summerTempN > 0 ? Math.round((summerTempSum / summerTempN) * 10) / 10 : 0;
  const days_above_90f = Math.round(daysAbove90 / years);
  const summer_precip_days = Math.round(summerPrecipDays / years);

  // Composite index: comfortable summer = high temp but not extreme, low rainy days
  // Penalize <70F (cold) and >95F (extreme); reward 75-85F sweet spot; subtract precip days.
  let tempScore = 0;
  const t = avg_peak_summer_temperature;
  if (t >= 75 && t <= 85) tempScore = 100;
  else if (t < 75) tempScore = Math.max(0, 100 - (75 - t) * 4);
  else tempScore = Math.max(0, 100 - (t - 85) * 4);
  const precipPenalty = Math.min(40, summer_precip_days * 2);
  const summer_weather_index = Math.max(0, Math.min(100, Math.round(tempScore - precipPenalty)));

  return { avg_peak_summer_temperature, days_above_90f, summer_precip_days, summer_weather_index };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: any = {};
  try { body = await req.json(); } catch (_) {}
  const limit = Math.max(1, Math.min(500, Number(body.limit ?? 200)));
  const offset = Math.max(0, Number(body.offset ?? 0));
  const dryRun = Boolean(body.dry_run);

  const { data: cities, error: cErr } = await supabase
    .from("us_cities_scored")
    .select("id, city_name, state_abbr, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("city_name")
    .range(offset, offset + limit - 1);
  if (cErr) return ok({ error: cErr.message }, 500);

  let processed = 0, failed = 0;
  const errors: any[] = [];
  // Open-Meteo free tier: ~600/min but in practice 10-parallel triggers 429s. Use 3-parallel.
  const BATCH = 3;
  for (let i = 0; i < (cities ?? []).length; i += BATCH) {
    const slice = cities!.slice(i, i + BATCH);
    await Promise.all(slice.map(async (c: any) => {
      try {
        const { metrics: w, err } = await fetchWeather(Number(c.latitude), Number(c.longitude));
        if (!w) { failed++; errors.push({ city: c.city_name, state: c.state_abbr, error: err ?? "no data" }); return; }
        if (dryRun) { processed++; return; }
        const now = new Date().toISOString();
        const rows = [
          { city_id: c.id, signal_key: "avg_peak_summer_temperature", label: "Avg peak summer temp (°F)", value: String(w.avg_peak_summer_temperature), source: "Open-Meteo (2022-2024)", confidence: 0.95, updated_at: now },
          { city_id: c.id, signal_key: "days_above_90f", label: "Days/yr ≥ 90°F", value: String(w.days_above_90f), source: "Open-Meteo (2022-2024)", confidence: 0.95, updated_at: now },
          { city_id: c.id, signal_key: "summer_precip_days", label: "Summer precip days/yr", value: String(w.summer_precip_days), source: "Open-Meteo (2022-2024)", confidence: 0.95, updated_at: now },
          { city_id: c.id, signal_key: "summer_weather_index", label: "Summer weather index", value: String(w.summer_weather_index), source: "Open-Meteo composite", confidence: 0.9, updated_at: now },
        ];
        for (const row of rows) {
          const { error } = await supabase
            .from("city_market_signals")
            .upsert(row, { onConflict: "city_id,signal_key" });
          if (error) throw new Error(error.message);
        }
        processed++;
      } catch (e) {
        failed++;
        errors.push({ city: c.city_name, state: c.state_abbr, error: (e as Error).message });
      }
    }));
    // Small pause between batches to stay friendly with Open-Meteo
    await new Promise((res) => setTimeout(res, 250));
  }
  }

  const returned = cities?.length ?? 0;
  const nextOffset = returned === limit ? offset + limit : null;
  return ok({ processed, failed, next_offset: nextOffset, errors: errors.slice(0, 10) });
});
