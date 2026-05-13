import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Backfill latitude/longitude for cities using free Nominatim (OpenStreetMap).
// Idempotent: only processes rows where latitude IS NULL.
// Rate-limited to ~1 req/sec per Nominatim usage policy.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    let limit = 50;
    try {
      const body = await req.json();
      if (body && typeof body.limit === "number") limit = Math.min(Math.max(1, body.limit), 200);
    } catch { /* no body, use default */ }

    const { data: rows, error } = await admin
      .from("cities")
      .select("id, city, state")
      .is("latitude", null)
      .limit(limit);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, updated: 0, message: "Nothing to backfill" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const failures: { city: string; state: string; reason: string }[] = [];

    for (const row of rows) {
      try {
        const params = new URLSearchParams({
          city: row.city,
          state: row.state,
          country: "USA",
          format: "json",
          limit: "1",
        });
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { "User-Agent": "NeuronGarage/1.0 (franchise-tooling)" },
        });
        if (!resp.ok) {
          failures.push({ city: row.city, state: row.state, reason: `HTTP ${resp.status}` });
        } else {
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            const lat = Number(data[0].lat);
            const lon = Number(data[0].lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              const { error: updErr } = await admin
                .from("cities")
                .update({ latitude: lat, longitude: lon })
                .eq("id", row.id);
              if (updErr) failures.push({ city: row.city, state: row.state, reason: updErr.message });
              else updated += 1;
            } else {
              failures.push({ city: row.city, state: row.state, reason: "Invalid coordinates" });
            }
          } else {
            failures.push({ city: row.city, state: row.state, reason: "No geocoding result" });
          }
        }
      } catch (e) {
        failures.push({ city: row.city, state: row.state, reason: (e as Error).message });
      }
      // Nominatim usage policy: ≤1 req/sec
      await new Promise((r) => setTimeout(r, 1100));
    }

    return new Response(
      JSON.stringify({ processed: rows.length, updated, failures }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("backfill-city-coordinates error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
