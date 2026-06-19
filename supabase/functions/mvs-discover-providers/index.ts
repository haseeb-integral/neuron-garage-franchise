// Phase 2 / Turn 2.1 — mvs-discover-providers
// Expanded: now fans out across 4 sources per city (Sawyer, ActivityHero,
// Google Maps via Apify, Yelp). Each source is independent — a failure in
// one is logged into the run debug, the rest still run. Providers are
// unioned and deduped by normalized name. The `sources` jsonb column on
// mvs_providers records every platform that returned a hit, so downstream
// tier classification (2.2) can weight cross-source presence as a quality
// signal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SCREENSHOT_BUCKET = "mvs-screenshots";

// Per-source hard timeouts so one stalled provider can't blow the whole run.
const FIRECRAWL_TIMEOUT_MS = 25_000;
const APIFY_TIMEOUT_MS = 60_000;
const GEMINI_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Source priority for dedupe: when the same provider appears in multiple
// sources, the row is tagged with the highest-priority platform.
type Platform = "sawyer" | "activityhero" | "google_maps" | "yelp";
const PLATFORM_PRIORITY: Record<Platform, number> = {
  sawyer: 0,
  activityhero: 1,
  google_maps: 2,
  yelp: 3,
};

// Per-metro bounding boxes for Sawyer's `location_within` filter.
type Box = { top: number; left: number; bottom: number; right: number };
const TIER_A_BOXES: Record<string, Box> = {
  "Austin, TX":       { top: 31.10894716338658, left: -98.52583667890624, bottom: 29.42001128474371, right: -96.96028492109374 },
  "New York, NY":     { top: 41.20, left: -74.50, bottom: 40.40, right: -73.40 },
  "Houston, TX":      { top: 30.30, left: -95.95, bottom: 29.35, right: -94.85 },
  "Chicago, IL":      { top: 42.20, left: -88.30, bottom: 41.55, right: -87.30 },
  "Boston, MA":       { top: 42.65, left: -71.45, bottom: 42.10, right: -70.80 },
  "San Antonio, TX":  { top: 29.85, left: -98.95, bottom: 29.10, right: -98.10 },
  "Philadelphia, PA": { top: 40.30, left: -75.50, bottom: 39.75, right: -74.80 },
  "Los Angeles, CA":  { top: 34.50, left: -118.95, bottom: 33.65, right: -117.85 },
  "Indianapolis, IN": { top: 40.15, left: -86.55, bottom: 39.45, right: -85.75 },
};

type SawyerSearch = {
  booking_type: "camp" | "class";
  categories?: number[];
  month_year_in: { month: number; year: number }[];
};

function buildSawyerVariants(): SawyerSearch[] {
  return [
    { booking_type: "camp", categories: [33, 31, 19, 30], month_year_in: [{ month: 6, year: 2026 }, { month: 7, year: 2026 }] },
    { booking_type: "camp", month_year_in: [{ month: 6, year: 2026 }, { month: 7, year: 2026 }, { month: 8, year: 2026 }] },
    { booking_type: "class", month_year_in: [{ month: 6, year: 2026 }, { month: 9, year: 2026 }] },
  ];
}

function buildSawyerUrl(city: string, box: Box, search: SawyerSearch): string {
  const params = new URLSearchParams({
    search: JSON.stringify({ ...search, location_within: box }),
    from_city_name: `"${city}"`,
  });
  return `https://www.hisawyer.com/marketplace?${params.toString()}`;
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type ProviderExtract = {
  name: string;
  url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  category_raw?: string | null;
  confidence: number;
};

type SourceResult = {
  platform: Platform;
  providers: ProviderExtract[];
  firecrawlCalls: number;
  screenshotPath?: string | null;
  debug: Record<string, unknown>;
};

// ----------------- Source: Sawyer (existing 3-variant scrape) -----------------
async function runSawyer(args: {
  city: string;
  box: Box;
  firecrawlKey: string;
  lovableKey: string;
  admin: ReturnType<typeof createClient>;
  runId: string;
}): Promise<SourceResult> {
  const { city, box, firecrawlKey, lovableKey, admin, runId } = args;
  const variants = buildSawyerVariants();
  const collected: ProviderExtract[] = [];
  let screenshotPath: string | null = null;
  const variantDebug: unknown[] = [];
  let firecrawlCalls = 0;

  const sys = `You extract kids' activity providers from a Sawyer marketplace listing page for ${city}.
Return strict JSON:
{ "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }

Rules:
- A "provider" is a real business/brand offering kids' classes, camps, or activities.
- DO NOT include: search categories, location names, navigation links, ads, the marketplace platform itself ("Sawyer"), generic terms ("Kids Classes", "Music"), or individual class titles.
- Prefer in-person providers serving ${city}. Skip online-only providers.
- Prices in USD per class or per session. Use null if unknown.
- Confidence 0..1.
- Dedupe by provider name. Hard cap: 60 providers.`;

  for (let i = 0; i < variants.length; i++) {
    const url = buildSawyerUrl(city, box, variants[i]);
    const v: Record<string, unknown> = { variant: i, url };
    try {
      const res = await fetchWithTimeout(`${FIRECRAWL_V2}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formats: i === 0 ? ["markdown", "screenshot"] : ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      }, FIRECRAWL_TIMEOUT_MS);
      firecrawlCalls += 1;
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { v.error = `firecrawl ${res.status}`; variantDebug.push(v); continue; }
      const md: string = j?.data?.markdown ?? "";
      v.markdown_chars = md.length;
      if (!md) { v.error = "empty markdown"; variantDebug.push(v); continue; }

      if (i === 0 && !screenshotPath) {
        const shot: string | undefined = j?.data?.screenshot ?? j?.data?.screenshotUrl;
        if (shot) {
          try {
            let bytes: Uint8Array | null = null;
            if (shot.startsWith("data:")) {
              const b64 = shot.split(",", 2)[1] ?? "";
              const bin = atob(b64);
              bytes = new Uint8Array(bin.length);
              for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
            } else {
              const r = await fetch(shot);
              if (r.ok) bytes = new Uint8Array(await r.arrayBuffer());
            }
            if (bytes) {
              const path = `${runId}/sawyer-${citySlug(city)}.png`;
              const { error: upErr } = await admin.storage
                .from(SCREENSHOT_BUCKET)
                .upload(path, bytes, { contentType: "image/png", upsert: true });
              if (!upErr) screenshotPath = path;
            }
          } catch { /* non-fatal */ }
        }
      }

      const got = await extractWithGemini({
        lovableKey, sys, city, sourceUrl: url, markdown: md,
      });
      v.providers_extracted = got.length;
      collected.push(...got);
      variantDebug.push(v);
    } catch (e) {
      v.error = e instanceof Error ? e.message : String(e);
      variantDebug.push(v);
    }
  }

  return {
    platform: "sawyer",
    providers: collected,
    firecrawlCalls,
    screenshotPath,
    debug: { variants: variantDebug },
  };
}

// ----------------- Source: ActivityHero -----------------
async function runActivityHero(args: {
  city: string;
  state: string;
  firecrawlKey: string;
  lovableKey: string;
}): Promise<SourceResult> {
  const { city, state, firecrawlKey, lovableKey } = args;
  const slug = `${citySlug(city)}-${state.toLowerCase()}`;
  const url = `https://www.activityhero.com/s/${slug}/camps`;
  const debug: Record<string, unknown> = { url };
  let firecrawlCalls = 0;
  try {
    const res = await fetchWithTimeout(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
    }, FIRECRAWL_TIMEOUT_MS);
    firecrawlCalls += 1;
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { debug.error = `firecrawl ${res.status}`; return { platform: "activityhero", providers: [], firecrawlCalls, debug }; }
    const md: string = j?.data?.markdown ?? "";
    debug.markdown_chars = md.length;
    if (!md) { debug.error = "empty markdown"; return { platform: "activityhero", providers: [], firecrawlCalls, debug }; }

    const sys = `You extract kids' activity providers from an ActivityHero marketplace page for ${city}, ${state}.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }
Rules:
- A "provider" is a real business offering kids' classes/camps (e.g. a gymnastics studio).
- EXCLUDE: the marketplace itself ("ActivityHero"), category navigation, generic labels, individual class titles.
- Prefer in-person providers in ${city}. Skip online-only.
- Prices USD per session. Null if unknown.
- Hard cap: 60.`;
    const providers = await extractWithGemini({ lovableKey, sys, city, sourceUrl: url, markdown: md });
    debug.providers_extracted = providers.length;
    return { platform: "activityhero", providers, firecrawlCalls, debug };
  } catch (e) {
    debug.error = e instanceof Error ? e.message : String(e);
    return { platform: "activityhero", providers: [], firecrawlCalls, debug };
  }
}

// ----------------- Source: Google Maps via Apify -----------------
async function runGoogleMaps(args: {
  city: string;
  state: string;
}): Promise<SourceResult> {
  const { city, state } = args;
  const debug: Record<string, unknown> = {};
  const token = Deno.env.get("APIFY_API_TOKEN");
  const actorId = Deno.env.get("APIFY_GOOGLE_MAPS_ACTOR_ID");
  if (!token || !actorId) {
    debug.error = "missing APIFY secrets";
    return { platform: "google_maps", providers: [], firecrawlCalls: 0, debug };
  }
  try {
    const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=90&memory=1024`;
    const body = {
      searchStringsArray: [
        `kids summer camp ${city} ${state}`,
        `kids classes ${city} ${state}`,
      ],
      locationQuery: `${city}, ${state}`,
      maxCrawledPlacesPerSearch: 30,
      language: "en",
      countryCode: "us",
      skipClosedPlaces: true,
    };
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, APIFY_TIMEOUT_MS);
    if (!res.ok) {
      debug.error = `apify ${res.status}`;
      debug.body = (await res.text()).slice(0, 300);
      return { platform: "google_maps", providers: [], firecrawlCalls: 0, debug };
    }
    const items: unknown[] = await res.json().catch(() => []);
    debug.items_returned = Array.isArray(items) ? items.length : 0;
    const providers: ProviderExtract[] = (Array.isArray(items) ? items : [])
      .map((raw) => {
        const it = raw as Record<string, unknown>;
        const name = String(it.title ?? it.name ?? "").trim();
        if (!name) return null;
        const website = (it.website ?? it.url ?? null) as string | null;
        const category = (it.categoryName ?? it.category ?? null) as string | null;
        return {
          name,
          url: website,
          price_min: null,
          price_max: null,
          category_raw: category,
          confidence: 0.7,
        } as ProviderExtract;
      })
      .filter((p): p is ProviderExtract => p !== null);
    debug.providers_extracted = providers.length;
    return { platform: "google_maps", providers, firecrawlCalls: 0, debug };
  } catch (e) {
    debug.error = e instanceof Error ? e.message : String(e);
    return { platform: "google_maps", providers: [], firecrawlCalls: 0, debug };
  }
}

// ----------------- Source: Yelp -----------------
async function runYelp(args: {
  city: string;
  state: string;
  firecrawlKey: string;
  lovableKey: string;
}): Promise<SourceResult> {
  const { city, state, firecrawlKey, lovableKey } = args;
  const params = new URLSearchParams({
    find_desc: "Kids Activities",
    find_loc: `${city}, ${state}`,
  });
  const url = `https://www.yelp.com/search?${params.toString()}`;
  const debug: Record<string, unknown> = { url };
  let firecrawlCalls = 0;
  try {
    const res = await fetchWithTimeout(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
    }, FIRECRAWL_TIMEOUT_MS);
    firecrawlCalls += 1;
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { debug.error = `firecrawl ${res.status}`; return { platform: "yelp", providers: [], firecrawlCalls, debug }; }
    const md: string = j?.data?.markdown ?? "";
    debug.markdown_chars = md.length;
    if (!md) { debug.error = "empty markdown"; return { platform: "yelp", providers: [], firecrawlCalls, debug }; }

    const sys = `You extract kids' activity providers from a Yelp search results page for ${city}, ${state}.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }
Rules:
- A "provider" is a real business offering kids' classes, camps, gymnastics, art, music, sports, etc.
- EXCLUDE: Yelp itself, sponsored ads labeled "Ad", category nav, generic listings, restaurants, irrelevant businesses.
- Prices USD if shown ($ = ~15, $$ = ~30, $$$ = ~60). Null if no signal.
- category_raw = the Yelp business category.
- Hard cap: 30.`;
    const providers = await extractWithGemini({ lovableKey, sys, city, sourceUrl: url, markdown: md });
    debug.providers_extracted = providers.length;
    return { platform: "yelp", providers, firecrawlCalls, debug };
  } catch (e) {
    debug.error = e instanceof Error ? e.message : String(e);
    return { platform: "yelp", providers: [], firecrawlCalls, debug };
  }
}

// ----------------- Shared Gemini extractor -----------------
async function extractWithGemini(args: {
  lovableKey: string;
  sys: string;
  city: string;
  sourceUrl: string;
  markdown: string;
}): Promise<ProviderExtract[]> {
  const { lovableKey, sys, city, sourceUrl, markdown } = args;
  const res = await fetchWithTimeout(AI_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `City: ${city}\nSource URL: ${sourceUrl}\n\nSCRAPED PAGE MARKDOWN:\n${markdown.slice(0, 24000)}` },
      ],
      response_format: { type: "json_object" },
    }),
  }, GEMINI_TIMEOUT_MS);
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  const raw = j?.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as { providers?: ProviderExtract[] };
    return (parsed.providers ?? []).filter((p) => p?.name);
  } catch {
    return [];
  }
}

// =====================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!firecrawlKey || !lovableKey) {
    return new Response(
      JSON.stringify({ error: "missing FIRECRAWL_API_KEY or LOVABLE_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Manager or admin required.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ["manager", "admin"]);
  if (!roleRows || roleRows.length === 0) {
    return new Response(JSON.stringify({ error: "forbidden: manager required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const city: string = (body?.city ?? "Austin, TX").trim();
  const [cityName, stateAbbr] = city.split(",").map((s: string) => s.trim());
  let box: Box | undefined = TIER_A_BOXES[city];
  if (!box && cityName && stateAbbr) {
    const { data: geo } = await admin
      .from("us_cities_geo")
      .select("lat, lng")
      .ilike("city_ascii", cityName)
      .ilike("state_id", stateAbbr)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (geo && geo.lat != null && geo.lng != null) {
      const lat = Number(geo.lat); const lng = Number(geo.lng);
      box = { top: lat + 0.45, bottom: lat - 0.45, left: lng - 0.45, right: lng + 0.45 };
    }
  }
  if (!box) {
    return new Response(
      JSON.stringify({ error: `city '${city}' has no bounding box`, allowed: Object.keys(TIER_A_BOXES) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // If the orchestrator is calling us it passes parent_run_id so we don't
  // create a second mvs_pipeline_runs row. Standalone callers still get a row.
  const parentRunId: string | null = body?.parent_run_id ?? null;
  let runId: string;
  if (parentRunId) {
    runId = parentRunId;
  } else {
    const { data: run, error: runErr } = await admin
      .from("mvs_pipeline_runs")
      .insert({ city, status: "running", firecrawl_calls: 0, started_at: new Date().toISOString() })
      .select().single();
    if (runErr || !run) {
      return new Response(
        JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    runId = run.id;
  }

  const debug: Record<string, unknown> = {};
  let totalFirecrawl = 0;
  let screenshotPath: string | null = null;

  try {
    const sourceResults: SourceResult[] = [];
    sourceResults.push(await runSawyer({ city, box, firecrawlKey, lovableKey, admin, runId }));
    sourceResults.push(await runActivityHero({ city, state: stateAbbr, firecrawlKey, lovableKey }));
    sourceResults.push(await runGoogleMaps({ city, state: stateAbbr }));
    sourceResults.push(await runYelp({ city, state: stateAbbr, firecrawlKey, lovableKey }));

    for (const r of sourceResults) {
      totalFirecrawl += r.firecrawlCalls;
      if (r.screenshotPath && !screenshotPath) screenshotPath = r.screenshotPath;
      debug[r.platform] = r.debug;
    }

    type Merged = ProviderExtract & { platform: Platform; sources_seen: Platform[] };
    const byKey = new Map<string, Merged>();
    for (const r of sourceResults) {
      for (const p of r.providers) {
        const key = normalizeName(p.name);
        if (!key) continue;
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, { ...p, platform: r.platform, sources_seen: [r.platform] });
        } else {
          if (!existing.sources_seen.includes(r.platform)) existing.sources_seen.push(r.platform);
          if (PLATFORM_PRIORITY[r.platform] < PLATFORM_PRIORITY[existing.platform]) {
            existing.platform = r.platform;
          }
          existing.url = existing.url ?? p.url ?? null;
          existing.price_min = existing.price_min ?? p.price_min ?? null;
          existing.price_max = existing.price_max ?? p.price_max ?? null;
          existing.category_raw = existing.category_raw ?? p.category_raw ?? null;
          existing.confidence = Math.max(existing.confidence ?? 0, p.confidence ?? 0);
        }
      }
    }
    debug.merged_total = byKey.size;

    const rows = [...byKey.values()].map((m) => ({
      city,
      name: m.name.trim().slice(0, 300),
      platform: m.platform,
      sources: m.sources_seen,
      url: m.url ?? null,
      price_min: m.price_min ?? null,
      price_max: m.price_max ?? null,
      category_raw: m.category_raw ?? null,
      screenshot_url: screenshotPath,
      confidence: Math.max(0, Math.min(1, m.confidence ?? 0.5)),
      source_run_id: runId,
    }));

    let inserted = 0;
    if (rows.length > 0) {
      const { data: existingRows, error: existingErr } = await admin
        .from("mvs_providers")
        .select("name")
        .eq("city", city);
      if (existingErr) throw new Error(`fetch existing providers: ${existingErr.message}`);
      const existingNames = new Set((existingRows ?? []).map((r) => normalizeName(r.name)));
      const newRows = rows.filter((r) => !existingNames.has(normalizeName(r.name)));
      if (newRows.length > 0) {
        const { data: insData, error: insErr } = await admin
          .from("mvs_providers").insert(newRows).select("id");
        if (insErr) throw new Error(`insert providers: ${insErr.message}`);
        inserted = insData?.length ?? 0;
      }
    }

    // Only the standalone-caller branch owns the run row's lifecycle. When
    // the orchestrator owns the row, it finalizes status itself.
    if (!parentRunId) {
      await admin.from("mvs_pipeline_runs").update({
        status: "done",
        firecrawl_calls: totalFirecrawl,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        run_id: runId,
        city,
        firecrawl_calls: totalFirecrawl,
        providers_inserted: inserted,
        providers_merged: rows.length,
        screenshot_path: screenshotPath,
        debug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!parentRunId) {
      await admin.from("mvs_pipeline_runs").update({
        status: "failed", error: msg, firecrawl_calls: totalFirecrawl,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return new Response(
      JSON.stringify({ run_id: runId, error: msg, debug }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
