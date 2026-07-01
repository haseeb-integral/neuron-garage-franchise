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

// ---------------------------------------------------------------------------
// B1: Brand price propagation (same-city siblings)
// ---------------------------------------------------------------------------
// When a well-known brand has ≥2 same-city locations with prices that agree
// within ±15%, we copy the median price into any UNPRICED same-city sibling
// of that brand. The copied row is flagged `price_derived_from_brand=true`
// and `price_needs_review=true`; the useLiveMvs mapper nulls those prices
// out before feeding computeMvs, so scoring math is unaffected until a
// human confirms. One-line revert (per city):
//   UPDATE public.mvs_providers
//      SET price_min=NULL, price_max=NULL, price_derived_from_brand=false,
//          price_needs_review=false, price_derivation_meta=NULL
//    WHERE city = '<City, ST>' AND price_derived_from_brand = true;
function brandTokenOf(name: string | null | undefined): string {
  if (!name) return "";
  // Strip common location-suffix patterns then normalize.
  let s = String(name).toLowerCase();
  s = s.split(/\s+[-–—@|]\s+/)[0]; // "Steve & Kate's Camp - Central Austin"
  s = s.split(/\s+\bat\b\s+/)[0];   // "The Little Gym at Bee Cave"
  s = s.split(/\s*\(/)[0];            // "School of Rock (Gahanna)"
  s = s.split(/\s*,\s*/)[0];          // "Camp Foo, North Campus"
  s = s.replace(/['’`]/g, "");
  s = s.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

function medianNum(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function propagateBrandPricesForCity(
  admin: any,
  city: string,
): Promise<Record<string, unknown>> {
  const summary: Record<string, unknown> = { brands_checked: 0, brands_applied: 0, rows_updated: 0, skipped: [] as any[] };
  try {
    const { data: rows, error } = await admin
      .from("mvs_providers")
      .select("id, name, price_min, price_max, price_needs_review, price_derived_from_brand")
      .eq("city", city);
    if (error) throw error;

    // Group by brand token.
    const byBrand = new Map<string, Array<any>>();
    for (const r of rows ?? []) {
      const tok = brandTokenOf(r.name);
      // Require multi-word brand token to avoid accidental collisions on generic single words.
      if (!tok || tok.split(" ").length < 2) continue;
      if (!byBrand.has(tok)) byBrand.set(tok, []);
      byBrand.get(tok)!.push(r);
    }

    const skipped: any[] = [];
    let rowsUpdated = 0;
    let brandsApplied = 0;

    for (const [brand, group] of byBrand.entries()) {
      if (group.length < 2) continue; // need siblings to compare
      summary.brands_checked = (summary.brands_checked as number) + 1;

      // Priced, human-trusted siblings only.
      const priced = group.filter(
        (r) =>
          !r.price_needs_review &&
          !r.price_derived_from_brand &&
          (r.price_min != null || r.price_max != null),
      );
      // Unpriced siblings that we might fill.
      const unpriced = group.filter(
        (r) => r.price_min == null && r.price_max == null,
      );

      if (priced.length < 2 || unpriced.length === 0) continue;

      // Use price_min when present else price_max (matches scoring proxy).
      const proxy = (r: any): number | null => {
        const v = r.price_min != null ? r.price_min : r.price_max;
        return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
      };
      const priceVals = priced.map(proxy).filter((v): v is number => v != null);
      if (priceVals.length < 2) continue;

      // Agreement guard: max/min ratio within 1.15.
      const lo = Math.min(...priceVals);
      const hi = Math.max(...priceVals);
      if (lo <= 0) continue;
      const ratio = hi / lo;
      if (ratio > 1.15) {
        skipped.push({ brand, reason: "disagreement", ratio: Number(ratio.toFixed(3)), n: priceVals.length });
        continue;
      }

      const med = medianNum(priceVals);
      const medMax = medianNum(
        priced
          .map((r) => (r.price_max != null && Number.isFinite(Number(r.price_max)) ? Number(r.price_max) : null))
          .filter((v): v is number => v != null),
      );
      const agreementPct = Number(((1 - (hi - lo) / hi) * 100).toFixed(1));
      const sourceIds = priced.map((r) => r.id);

      for (const u of unpriced) {
        // Never overwrite: only touch rows where both prices are null.
        const { error: upErr } = await admin
          .from("mvs_providers")
          .update({
            price_min: med,
            price_max: Number.isFinite(medMax) && medMax >= med ? medMax : null,
            price_derived_from_brand: true,
            price_needs_review: true,
            confidence: 0.5,
            price_derivation_meta: {
              brand_token: brand,
              source_ids: sourceIds,
              siblings_count: priceVals.length,
              agreement_pct: agreementPct,
              ratio: Number(ratio.toFixed(3)),
              median_price_min: med,
              median_price_max: Number.isFinite(medMax) ? medMax : null,
              city,
              derived_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", u.id)
          .is("price_min", null)
          .is("price_max", null);
        if (!upErr) rowsUpdated += 1;
      }
      brandsApplied += 1;
    }

    summary.brands_applied = brandsApplied;
    summary.rows_updated = rowsUpdated;
    summary.skipped = skipped;
  } catch (e) {
    summary.error = e instanceof Error ? e.message : String(e);
  }
  return summary;
}

// Source priority for dedupe: when the same provider appears in multiple
// sources, the row is tagged with the highest-priority platform.
type Platform = "sawyer" | "activityhero" | "google_search" | "google_maps" | "yelp";
const PLATFORM_PRIORITY: Record<Platform, number> = {
  sawyer: 0,
  activityhero: 1,
  google_search: 2,
  google_maps: 3,
  yelp: 4,
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
  "Denver, CO":       { top: 40.10, left: -105.30, bottom: 39.50, right: -104.60 },
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

// Canonical name for cross-source matching. Drops common business suffixes
// and filler words so "ABC Music Studio LLC" and "ABC Music" collide.
const NAME_STOPWORDS = new Set([
  "the","a","an","and","of","for","at","in","on",
  "llc","inc","co","corp","ltd","plc","pllc",
  "studio","studios","academy","academies","school","schools",
  "kids","kid","children","childrens","child",
  "center","centre","centers",
]);
function canonicalName(n: string): string {
  const base = normalizeName(n);
  const toks = base.split(" ").filter((t) => t && !NAME_STOPWORDS.has(t) && t.length > 1);
  return toks.join(" ");
}
function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  const t = s.replace(/\s+/g, "");
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Marketplace activity-detail links (e.g. hisawyer.com/marketplace/activity-set/123,
// activityhero.com/a/...) often render as blank SPA shells when the activity
// is expired or unlisted. Rewrite them to a Google search for the provider so
// the user always lands on the real provider site in one click.
function safeProviderUrl(url: string | null | undefined, name: string, city: string): string | null {
  if (!url) return null;
  const bad =
    /hisawyer\.com\/marketplace\/(activity-set|class|camp)\//i.test(url) ||
    /activityhero\.com\/(a|activity|activities)\//i.test(url);
  if (!bad) return url;
  const q = encodeURIComponent(`${name} ${city}`);
  return `https://www.google.com/search?q=${q}`;
}

type ProviderExtract = {
  name: string;
  url?: string | null;
  listing_url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  category_raw?: string | null;
  confidence: number;
};

// Shared pricing extraction rules — appended to every source's system prompt.
// Phase 2: enforce literal-source-only pricing (no inference, no Yelp "$$").
const PRICE_RULES = `PRICING RULES:
- price_min / price_max are in USD per WEEK for camps, or per CLASS / SESSION for ongoing programs. Choose the weekly figure when both are shown.
- Extract prices found in website text, tables, camp packages, registration flyers, or Google Search result snippets.
- DO NOT convert price-tier symbols ("$", "$$", "$$$") into dollar amounts. Those are not prices.
- Priority 4: If multiple weekly tuition amounts, session fees, or tiered options appear, ALWAYS select the HIGHEST recurring weekly tuition amount.
- If the page or search snippet shows a single weekly number, set both price_min and price_max to that number.
- If the page shows a range like "$300–$650" or "$300 to $650", set price_min=300 and price_max=650.
- If no dollar amount is visible anywhere in the text or search snippets for that provider, set price_min=null and price_max=null. Never invent a value.`;

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
{ "providers": [ { "name": string, "url": string|null, "listing_url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }

Rules:
- A "provider" is a real business/brand offering kids' classes, camps, or activities.
- DO NOT include: search categories, location names, navigation links, ads, the marketplace platform itself ("Sawyer"), generic terms ("Kids Classes", "Music"), or individual class titles.
- "url" MUST be the provider's OWN website (their own domain). If you cannot see the provider's own website on the page, return null for url.
- "listing_url" MUST be the marketplace listing or activity-detail link on Sawyer (e.g. "https://www.hisawyer.com/marketplace/activity-set/..." or "/class/" or "/camp/"). If not visible, return null.
- Prefer in-person providers serving ${city}. Skip online-only providers.
- Confidence 0..1.
- Dedupe by provider name. Hard cap: 60 providers.
${PRICE_RULES}`;

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

// ----------------- Source: ActivityHero (3-variant) -----------------
async function runActivityHero(args: {
  city: string;
  state: string;
  firecrawlKey: string;
  lovableKey: string;
}): Promise<SourceResult> {
  const { city, state, firecrawlKey, lovableKey } = args;
  const slug = citySlug(city);
  const st = state.toLowerCase();
  const variants = [
    `https://www.activityhero.com/camps/${slug}-${st}`,
    `https://www.activityhero.com/classes/${slug}-${st}`,
    `https://www.activityhero.com/search?q=kids&location=${encodeURIComponent(city + " " + state)}`,
  ];
  const debug: Record<string, unknown> = {};
  const variantDebug: unknown[] = [];
  const collected: ProviderExtract[] = [];
  let firecrawlCalls = 0;

  for (let i = 0; i < variants.length; i++) {
    const url = variants[i];
    const v: Record<string, unknown> = { variant: i, url };
    try {
      const res = await fetchWithTimeout(`${FIRECRAWL_V2}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 5000 }),
      }, FIRECRAWL_TIMEOUT_MS);
      firecrawlCalls += 1;
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { v.error = `firecrawl ${res.status}`; variantDebug.push(v); continue; }
      const md: string = j?.data?.markdown ?? "";
      const links: string[] = Array.isArray(j?.data?.links) ? j.data.links : [];
      v.markdown_chars = md.length;
      v.links_count = links.length;
      if (!md && links.length === 0) { v.error = "empty page"; variantDebug.push(v); continue; }

      const linksBlob = links.slice(0, 200).join("\n");
      const sys = `You extract kids' activity providers from an ActivityHero marketplace page for ${city}, ${state}.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "listing_url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }
Rules:
- A "provider" is a real business offering kids' classes/camps (e.g. a gymnastics studio, music school, art camp).
- EXCLUDE: the marketplace itself ("ActivityHero"), category navigation, generic labels, individual class titles, blog posts.
- "url" MUST be the provider's OWN website (their own domain). If you cannot see the provider's own website on the page, return null for url.
- "listing_url" MUST be the marketplace listing link on ActivityHero (e.g. "https://www.activityhero.com/a/..." or "/activity/..."). If not visible, return null.
- Prefer in-person providers in ${city}. Skip online-only.
- Hard cap: 60.
${PRICE_RULES}`;
      const providers = await extractWithGemini({
        lovableKey, sys, city, sourceUrl: url,
        markdown: md + (linksBlob ? `\n\nDISCOVERED LINKS:\n${linksBlob}` : ""),
      });
      v.providers_extracted = providers.length;
      collected.push(...providers);
      variantDebug.push(v);
    } catch (e) {
      v.error = e instanceof Error ? e.message : String(e);
      variantDebug.push(v);
    }
  }

  debug.variants = variantDebug;
  debug.total_extracted = collected.length;
  return { platform: "activityhero", providers: collected, firecrawlCalls, debug };
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

// ----------------- Source: Google Search (via Firecrawl /v2/search) -----------------
// Surfaces providers named in listicles, local-news roundups, and niche
// kids-activity directories that Maps/Yelp miss. Each query returns top
// results pre-scraped to markdown; Gemini extracts provider names.
async function runGoogleSearch(args: {
  city: string;
  state: string;
  firecrawlKey: string;
  lovableKey: string;
}): Promise<SourceResult> {
  const { city, state, firecrawlKey, lovableKey } = args;
  // Guard against rows where city already contains ", OH" — avoids "Columbus, OH OH".
  const cleanCity = city.replace(/,\s*[A-Za-z]{2}\s*$/i, "").trim();
  const queries = [
    `best summer camps for kids in ${cleanCity} ${state} 2026`,
    `best kids activities classes ${cleanCity} ${state}`,
    `${cleanCity} ${state} after school programs enrichment kids`,
    `kids music art gymnastics studios ${cleanCity} ${state}`,
    `things to do with kids in ${cleanCity} ${state} indoor`,
    `${cleanCity} ${state} kids summer camp prices per week tuition`,
  ];

  // Strip social/marketplace noise so listicle pages dominate results.
  const excludeDomains = [
    "facebook.com", "instagram.com", "tiktok.com", "pinterest.com", "reddit.com", "x.com", "twitter.com",
    "hisawyer.com", "activityhero.com", "yelp.com", "google.com",
  ];
  const debug: Record<string, unknown> = {};
  const queryDebug: unknown[] = [];
  const collected: ProviderExtract[] = [];
  let firecrawlCalls = 0;

  const sys = `You extract real local kids-activity provider businesses mentioned in listicle, blog, and local-news pages for ${city}, ${state}.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }
Rules:
- A "provider" is a real local business offering kids' classes, camps, gymnastics, art, music, sports, STEM, dance, etc. that physically operates in ${city}.
- EXCLUDE: the publication itself (e.g. "Mommy Poppins", "Red Tricycle", "Boston Globe"), generic categories ("Summer Camps"), national chains' national websites (use the local branch name if mentioned), individual class titles, navigation links, restaurants, museums, parks, public libraries, public schools.
- "url" = the provider's OWN website if visible in the page text, else null. Never use the listicle's own URL.
- category_raw = the activity type (e.g. "gymnastics", "music school", "art camp", "stem").
- Prefer providers mentioned in MULTIPLE supplied pages — those are highest confidence.
- Hard cap: 40 providers.
${PRICE_RULES}`;

  // Run all 5 listicle queries in parallel — sequential was ~60s, parallel ~15s.
  const perQuery = await Promise.all(queries.map(async (q) => {
    // Pricing-specific query gets richer payload: more results, larger blob.
    // B-revert: onlyMainContent stays true on pricing query — Phase 3.1 showed
    // that turning it off flooded Gemini with chrome and dropped prices kept.
    const isPricingQuery = q.includes("prices per week tuition");
    const searchLimit = isPricingQuery ? 10 : 6;
    const onlyMain = true;
    const perResultChars = isPricingQuery ? 12000 : 6000;
    const qd: Record<string, unknown> = {
      query: q,
      source_type: "google_search",
      firecrawl_endpoint: `${FIRECRAWL_V2}/search`,
      search_limit: searchLimit,
      only_main_content: onlyMain,
      per_result_chars: perResultChars,
    };
    const out: { providers: ProviderExtract[]; calls: number; debug: Record<string, unknown> } =
      { providers: [], calls: 0, debug: qd };
    try {
      const res = await fetchWithTimeout(`${FIRECRAWL_V2}/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          limit: searchLimit,
          excludeDomains,
          scrapeOptions: { formats: ["markdown"], onlyMainContent: onlyMain },
        }),
      }, FIRECRAWL_TIMEOUT_MS);
      out.calls = 1;
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { qd.error = `firecrawl ${res.status}`; return out; }

      const items: Array<Record<string, unknown>> =
        (Array.isArray(j?.data?.web) ? j.data.web : Array.isArray(j?.data) ? j.data : []) as Array<Record<string, unknown>>;
      qd.raw_results_returned = items.length;
      qd.top_urls = items.slice(0, 5).map((it) => String(it.url ?? it.link ?? ""));
      qd.all_urls = items.map((it) => String(it.url ?? it.link ?? "")).filter(Boolean);
      if (items.length === 0) return out;

      const blob = items.map((it, idx) => {
        const url = String(it.url ?? it.link ?? "");
        const title = String(it.title ?? "");
        const md = String(it.markdown ?? it.content ?? it.description ?? "");
        return `=== RESULT ${idx + 1} ===\nURL: ${url}\nTITLE: ${title}\n\n${md.slice(0, perResultChars)}`;
      }).join("\n\n");


      const gemDebug: Record<string, unknown> = {};
      const providers = await extractWithGemini({
        lovableKey, sys, city, sourceUrl: `google_search:${q}`, markdown: blob,
      }, gemDebug);
      qd.providers_extracted = providers.length;
      qd.provider_names = providers.map((p) => p.name);
      qd.providers = providers.map((p) => ({
        name: p.name,
        url: p.url ?? null,
        price_min: p.price_min ?? null,
        price_max: p.price_max ?? null,
      }));
      qd.prices_kept = providers.filter((p) => p.price_min != null || p.price_max != null).length;
      qd.prices_dropped_by_guard = gemDebug.dropped_prices ?? [];
      qd.raw_dollar_amounts_in_source = gemDebug.dollar_matches_count ?? 0;
      out.providers = providers;
    } catch (e) {
      qd.error = e instanceof Error ? e.message : String(e);
    }
    return out;
  }));

  for (const r of perQuery) {
    firecrawlCalls += r.calls;
    collected.push(...r.providers);
    queryDebug.push(r.debug);
  }

  debug.queries = queryDebug;
  debug.total_extracted = collected.length;
  return { platform: "google_search", providers: collected, firecrawlCalls, debug };
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
- category_raw = the Yelp business category.
- Hard cap: 30.
${PRICE_RULES}
- IMPORTANT: Yelp's "$", "$$", "$$$" symbols are NOT dollar amounts. Return price_min=null and price_max=null unless an actual numeric dollar amount appears in the markdown for that provider.`;
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
}, debugOut?: Record<string, unknown>): Promise<ProviderExtract[]> {
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
    const providers = (parsed.providers ?? []).filter((p) => p?.name);
    const dollarMatches = new Set<number>();
    const isValidCandidate = (val?: number | null): boolean =>
      typeof val === "number" && Number.isFinite(val) && val >= 15 && val <= 5000;

    for (const p of providers) {
      if (!isValidCandidate(p.price_min)) p.price_min = null;
      if (!isValidCandidate(p.price_max)) p.price_max = null;
    }
    if (debugOut) {
      debugOut.raw_provider_count = providers.length;
    }
    return providers;
  } catch {
    return [];
  }
}

// ----------------- Phase 3.3: Targeted price scrape -----------------
// After /v2/search runs, take URLs we already discovered, keep the ones that
// look price-relevant, and re-scrape with onlyMainContent:false + screenshot
// so price tables in sidebars/accordions show up. Strict literal-price guard.
// Capped at 5 extra Firecrawl calls per city.
const TARGETED_PRICE_KEYWORDS =
  /(camp|summer|tuition|fees?|rates?|pricing|registration|register|program|enroll|cost)/i;
const TARGETED_BLOCKED_HOSTS =
  /(facebook|instagram|tiktok|pinterest|reddit|twitter|x\.com|yelp\.com|hisawyer\.com|activityhero\.com|google\.)/i;

type TargetedScrapeResult = {
  providers: ProviderExtract[];
  firecrawlCalls: number;
  debug: Record<string, unknown>;
};

async function runTargetedPriceScrapes(args: {
  city: string;
  firecrawlKey: string;
  lovableKey: string;
  admin: ReturnType<typeof createClient>;
  runId: string;
  candidateUrls: string[];
  needNames: Set<string>;
}): Promise<TargetedScrapeResult> {
  const { city, firecrawlKey, lovableKey, admin, runId, candidateUrls, needNames } = args;
  const debug: Record<string, unknown> = { cap: 5 };
  const scrapes: Array<Record<string, unknown>> = [];
  const providersOut: ProviderExtract[] = [];
  let firecrawlCalls = 0;

  // Score, filter, dedupe. Price-keyword paths first, then non-homepage URLs.
  const seen = new Set<string>();
  const scored: Array<{ url: string; score: number }> = [];
  for (const raw of candidateUrls) {
    if (!raw) continue;
    let u: URL;
    try { u = new URL(raw); } catch { continue; }
    if (TARGETED_BLOCKED_HOSTS.test(u.hostname)) continue;
    const path = u.pathname || "/";
    const key = (u.origin + path).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const pathHit = TARGETED_PRICE_KEYWORDS.test(path);
    const isHome = path === "/" || path === "";
    if (!pathHit && isHome) continue; // skip plain homepages with no signal
    const score = (pathHit ? 10 : 0) + (isHome ? 0 : 2);
    scored.push({ url: raw, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 5).map((s) => s.url);
  debug.candidates_seen = candidateUrls.length;
  debug.candidates_after_filter = scored.length;
  debug.urls_selected = selected;
  debug.need_provider_names = Array.from(needNames);

  if (selected.length === 0) {
    debug.skipped_reason = "no candidate URLs after filter";
    return { providers: providersOut, firecrawlCalls, debug };
  }

  const sys = `You extract per-week or per-session pricing for kids' camp/class providers from a single source page in ${city}.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }
${PRICE_RULES}
- Only extract providers whose own listed price appears literally as a dollar amount on THIS page.
- If the page is a forum, social post, news article without prices, or unrelated, return providers: [].
- Hard cap: 20 providers.`;

  // Parallelize the 5 scrapes — sequential pushed Austin over the 150s edge timeout.
  const perScrape = await Promise.all(selected.map(async (url, idx) => {
    const a: Record<string, unknown> = {
      extraction_method: "targeted_scrape",
      scraped_source_url: url,
    };
    const out: { providers: ProviderExtract[]; calls: number; audit: Record<string, unknown> } =
      { providers: [], calls: 0, audit: a };
    try {
      const res = await fetchWithTimeout(`${FIRECRAWL_V2}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formats: ["markdown", "screenshot"],
          onlyMainContent: false,
          waitFor: 2000,
        }),
      }, FIRECRAWL_TIMEOUT_MS);
      out.calls = 1;
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { a.error = `firecrawl ${res.status}`; return out; }
      const md: string = j?.data?.markdown ?? "";
      a.markdown_chars = md.length;
      if (!md) { a.error = "empty markdown"; return out; }

      // Save screenshot
      let shotPath: string | null = null;
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
            const path = `${runId}/targeted-${citySlug(city)}-${idx}.png`;
            const { error: upErr } = await admin.storage
              .from(SCREENSHOT_BUCKET)
              .upload(path, bytes, { contentType: "image/png", upsert: true });
            if (!upErr) shotPath = path;
          }
        } catch { /* non-fatal */ }
      }
      a.screenshot_url = shotPath;

      const gemDebug: Record<string, unknown> = {};
      const found = await extractWithGemini(
        { lovableKey, sys, city, sourceUrl: url, markdown: md },
        gemDebug,
      );

      const kept: Array<Record<string, unknown>> = [];
      const needsReview: Array<Record<string, unknown>> = [];
      for (const p of found) {
        const canon = canonicalName(p.name);
        const val = (p.price_min ?? p.price_max);
        if (val == null) continue;
        const rx = new RegExp(`\\$\\s?${val}\\b`);
        const m = md.match(rx);
        let snippet = "";
        if (m && m.index != null) {
          const s = Math.max(0, m.index - 150);
          snippet = md.slice(s, Math.min(md.length, m.index + 200)).replace(/\s+/g, " ").trim();
        }
        const contextOk =
          /camp|tuition|week|session|class|program|fee|registration|enroll/i.test(snippet);
        const matchesNeed = canon ? needNames.has(canon) : false;
        const entry = {
          name: p.name,
          canonical: canon,
          price_min: p.price_min ?? null,
          price_max: p.price_max ?? null,
          snippet,
          matched_existing_provider: matchesNeed,
        };
        if (contextOk) {
          kept.push({ ...entry, guard: "kept" });
          out.providers.push({
            name: p.name,
            url: p.url ?? url,
            price_min: p.price_min ?? null,
            price_max: p.price_max ?? null,
            category_raw: p.category_raw ?? null,
            confidence: Math.max(0.5, p.confidence ?? 0.6),
          });
        } else {
          needsReview.push({
            ...entry,
            guard: "needs_review",
            drop_reason: "snippet did not mention camp/tuition/week/session context",
          });
        }
      }
      a.providers_found = found.length;
      a.prices_kept = kept;
      a.prices_needs_review = needsReview;
      a.prices_dropped_by_guard = gemDebug.dropped_prices ?? [];
    } catch (e) {
      a.error = e instanceof Error ? e.message : String(e);
    }
    return out;
  }));

  for (const r of perScrape) {
    firecrawlCalls += r.calls;
    providersOut.push(...r.providers);
    scrapes.push(r.audit);
  }

  debug.scrapes = scrapes;
  debug.firecrawl_calls = firecrawlCalls;
  debug.providers_added = providersOut.length;
  return { providers: providersOut, firecrawlCalls, debug };
}



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


  // Allow background service-role caller or authenticated manager/admin
  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);
  const isServiceRole = authHeader.includes(serviceKey);

  if (!isServiceRole) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
  }
  const body = await req.json().catch(() => ({}));
  const city: string = (body?.city ?? "Austin, TX").trim();
  const catchupBatch: string[] | null = body?.catchupBatch ?? null;
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
    let sourceCounts: Record<string, number> = {};
    let inserted = 0;
    let updated = 0;
    let rows: any[] = [];

    // If catchupBatch is passed, skip main discovery and jump straight to missing price catchup
    if (catchupBatch && Array.isArray(catchupBatch) && catchupBatch.length > 0) {
      // jump straight to catchup block
    } else {
      // Run all 5 sources in parallel — sequential calls exceeded the 150s edge function idle timeout.
      const sourceResults: SourceResult[] = await Promise.all([
      runSawyer({ city, box, firecrawlKey, lovableKey, admin, runId }),
      runActivityHero({ city, state: stateAbbr, firecrawlKey, lovableKey }),
      runGoogleMaps({ city, state: stateAbbr }),
      runYelp({ city, state: stateAbbr, firecrawlKey, lovableKey }),
      runGoogleSearch({ city, state: stateAbbr, firecrawlKey, lovableKey }),
    ]);

    // Phase 3.3: targeted price scrape — re-scrape up to 5 already-discovered
    // URLs that look price-relevant, with onlyMainContent:false + screenshot.
    // Pulls candidate URLs from the google_search debug (top URLs + provider
    // URLs). Mutates the google_search SourceResult in place so the existing
    // merge picks up the new prices.
    let targetedDebug: Record<string, unknown> = { skipped_reason: "not_run" };
    try {
      const gsResult = sourceResults[4]; // runGoogleSearch
      const gsDebug = gsResult.debug as {
        queries?: Array<{
          all_urls?: string[];
          top_urls?: string[];
          providers?: Array<{ url?: string | null; price_min?: number | null; price_max?: number | null }>;
        }>;
      };
      const candidateUrls: string[] = [];
      for (const q of gsDebug.queries ?? []) {
        for (const u of q.all_urls ?? q.top_urls ?? []) if (u) candidateUrls.push(u);
        for (const p of q.providers ?? []) if (p?.url) candidateUrls.push(String(p.url));
      }
      const needNames = new Set<string>();
      for (const p of gsResult.providers) {
        if (p.price_min == null && p.price_max == null) {
          const c = canonicalName(p.name);
          if (c) needNames.add(c);
        }
      }
      const targeted = await runTargetedPriceScrapes({
        city, firecrawlKey, lovableKey, admin, runId,
        candidateUrls, needNames,
      });
      gsResult.providers.push(...targeted.providers);
      gsResult.firecrawlCalls += targeted.firecrawlCalls;
      targetedDebug = targeted.debug;
    } catch (e) {
      targetedDebug = { error: e instanceof Error ? e.message : String(e) };
    }
    debug.targeted_scrape = targetedDebug;

    // Per-source provider counts — surfaced to the orchestrator so the UI can
    // show "X/5 sources" instead of just pass/fail.
    for (const r of sourceResults) {
      totalFirecrawl += r.firecrawlCalls;
      if (r.screenshotPath && !screenshotPath) screenshotPath = r.screenshotPath;
      debug[r.platform] = r.debug;
      sourceCounts[r.platform] = r.providers.length;
    }


    type Merged = ProviderExtract & { platform: Platform; sources_seen: Platform[]; canonical: string };
    const byKey = new Map<string, Merged>();
    for (const r of sourceResults) {
      for (const p of r.providers) {
        const canon = canonicalName(p.name);
        if (!canon) continue;
        const existing = byKey.get(canon);
        if (!existing) {
          byKey.set(canon, { ...p, platform: r.platform, sources_seen: [r.platform], canonical: canon });
        } else {
          if (!existing.sources_seen.includes(r.platform)) existing.sources_seen.push(r.platform);
          if (PLATFORM_PRIORITY[r.platform] < PLATFORM_PRIORITY[existing.platform]) {
            existing.platform = r.platform;
            existing.name = p.name; // prefer name from higher-priority source
          }
          existing.url = existing.url ?? p.url ?? null;
          existing.listing_url = existing.listing_url ?? p.listing_url ?? null;
          existing.price_min = existing.price_min ?? p.price_min ?? null;
          existing.price_max = existing.price_max ?? p.price_max ?? null;
          existing.category_raw = existing.category_raw ?? p.category_raw ?? null;
          existing.confidence = Math.max(existing.confidence ?? 0, p.confidence ?? 0);
        }
      }
    }

    // Second-pass fuzzy merge: collapse entries whose canonicals are bigram-similar
    // (Jaccard >= 0.75) or one is a >=6-char prefix of the other.
    const mergedList: Merged[] = [...byKey.values()];
    const mergedBigrams = mergedList.map((m) => bigrams(m.canonical));
    const removed = new Set<number>();
    for (let i = 0; i < mergedList.length; i++) {
      if (removed.has(i)) continue;
      for (let j = i + 1; j < mergedList.length; j++) {
        if (removed.has(j)) continue;
        const a = mergedList[i], b = mergedList[j];
        const sim = jaccard(mergedBigrams[i], mergedBigrams[j]);
        const prefix = a.canonical.length >= 6 && b.canonical.length >= 6 &&
          (a.canonical.startsWith(b.canonical) || b.canonical.startsWith(a.canonical));
        if (sim >= 0.75 || prefix) {
          for (const s of b.sources_seen) if (!a.sources_seen.includes(s)) a.sources_seen.push(s);
          if (PLATFORM_PRIORITY[b.platform] < PLATFORM_PRIORITY[a.platform]) {
            a.platform = b.platform; a.name = b.name;
          }
          a.url = a.url ?? b.url ?? null;
          a.listing_url = a.listing_url ?? b.listing_url ?? null;
          a.price_min = a.price_min ?? b.price_min ?? null;
          a.price_max = a.price_max ?? b.price_max ?? null;
          a.category_raw = a.category_raw ?? b.category_raw ?? null;
          a.confidence = Math.max(a.confidence ?? 0, b.confidence ?? 0);
          removed.add(j);
        }
      }
    }
    const finalMerged = mergedList.filter((_, idx) => !removed.has(idx));
    debug.merged_total = finalMerged.length;
    debug.fuzzy_collapsed = removed.size;

    const isMarketplaceHost = (u: string) =>
      /(hisawyer\.com|activityhero\.com|yelp\.com)/i.test(u);

    rows = finalMerged.map((m) => {
      const rawUrl = m.url ?? null;
      const marketplace = rawUrl ? isMarketplaceHost(rawUrl) : false;
      const website_url = rawUrl && !marketplace ? rawUrl : null;
      const source_listing_url = m.listing_url ?? (rawUrl && marketplace ? rawUrl : null);
      return {
        city,
        name: m.name.trim().slice(0, 300),
        canonical: m.canonical,
        platform: m.platform,
        sources_seen: m.sources_seen,
        url: website_url ?? source_listing_url,
        website_url,
        source_listing_url,
        // B-fix: guard against extraction assigning min>max (e.g. "$45–$415" parsed backwards).
        price_min: (m.price_min != null && m.price_max != null && m.price_min > m.price_max) ? m.price_max : (m.price_min ?? null),
        price_max: (m.price_min != null && m.price_max != null && m.price_min > m.price_max) ? m.price_min : (m.price_max ?? null),
        category_raw: m.category_raw ?? null,
        screenshot_url: screenshotPath,
        confidence: Math.max(0, Math.min(1, m.confidence ?? 0.5)),
        source_run_id: runId,
      };
    });

    if (rows.length > 0) {
      // Fetch existing rows for this city to fuzzy-match against.
      const { data: existingRows, error: existingErr } = await admin
        .from("mvs_providers")
        .select("id, name, sources, confidence, website_url, source_listing_url, price_min, price_max, category_raw, platform")
        .eq("city", city);
      if (existingErr) throw new Error(`fetch existing providers: ${existingErr.message}`);
      const existing = (existingRows ?? []).map((r) => ({
        ...r,
        canonical: canonicalName(r.name as string),
        bg: bigrams(canonicalName(r.name as string)),
      }));

      const toInsert: Record<string, unknown>[] = [];
      const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

      for (const row of rows) {
        const rowBg = bigrams(row.canonical);
        let match: typeof existing[number] | null = null;
        for (const e of existing) {
          if (!e.canonical) continue;
          if (e.canonical === row.canonical) { match = e; break; }
          const sim = jaccard(rowBg, e.bg);
          const prefix = row.canonical.length >= 6 && e.canonical.length >= 6 &&
            (row.canonical.startsWith(e.canonical) || e.canonical.startsWith(row.canonical));
          if (sim >= 0.75 || prefix) { match = e; break; }
        }

        if (match) {
          const existingSrcs: string[] = Array.isArray(match.sources) ? match.sources as string[] : [];
          const union = Array.from(new Set([...existingSrcs, ...row.sources_seen]));
          toUpdate.push({
            id: match.id as string,
            patch: {
              sources: union,
              platform: PLATFORM_PRIORITY[row.platform] < PLATFORM_PRIORITY[(match.platform as Platform) ?? "yelp"]
                ? row.platform : match.platform,
              website_url: match.website_url ?? row.website_url,
              source_listing_url: match.source_listing_url ?? row.source_listing_url,
              price_min: match.price_min ?? row.price_min,
              price_max: match.price_max ?? row.price_max,
              category_raw: match.category_raw ?? row.category_raw,
              confidence: Math.max(Number(match.confidence ?? 0), Number(row.confidence ?? 0)),
              source_run_id: runId,
              updated_at: new Date().toISOString(),
            },
          });
        } else {
          toInsert.push({
            city: row.city,
            name: row.name,
            platform: row.platform,
            sources: row.sources_seen,
            url: row.url,
            website_url: row.website_url,
            source_listing_url: row.source_listing_url,
            price_min: row.price_min,
            price_max: row.price_max,
            category_raw: row.category_raw,
            screenshot_url: row.screenshot_url,
            confidence: row.confidence,
            source_run_id: row.source_run_id,
          });
        }
      }

      if (toInsert.length > 0) {
        const { data: insData, error: insErr } = await admin
          .from("mvs_providers").insert(toInsert).select("id");
        if (insErr) throw new Error(`insert providers: ${insErr.message}`);
        inserted = insData?.length ?? 0;
      }
      for (const u of toUpdate) {
        const { error: upErr } = await admin
          .from("mvs_providers").update(u.patch).eq("id", u.id);
        if (!upErr) updated += 1;
      }
      debug.updated = updated;
    }
    } // end of main discovery branch

    // Missing Price Catch-up: automatically search Google directly for camps in this city still missing prices.
    // Priority 1 Timeout Fix: Decoupled into async 5-camp micro-batches self-invoked in background.
    let catchupDebug: Record<string, unknown> = { skipped: true };
    if (catchupBatch && Array.isArray(catchupBatch) && catchupBatch.length > 0) {
      // Background worker mode: process only the specific 5 camp IDs passed in catchupBatch
      const catchupResults: Record<string, unknown>[] = [];
      const catchupSys = `You extract per-week or per-session tuition pricing for a kids' camp/class provider from official website markdown and natural Google search snippets.
Return strict JSON: { "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number }
${PRICE_RULES}
- Look for pricing on official website subpages, Sawyer, Enrollsy, ActivityHero, Facebook, or city camp guide snippets.
- Priority 4: When multiple dollar amounts or tier options appear, always select the HIGHEST recurring weekly tuition.
- If a clear dollar tuition amount is found in the search snippets or page text, extract it. Otherwise return nulls.`;

      const cleanCity = city.replace(/,\s*[A-Za-z]{2}\s*$/i, "").trim();
      const stateAbbr = city.split(",")[1]?.trim() || "";
      const { data: batchRows } = await admin.from("mvs_providers").select("id, name, website_url, url, source_listing_url").in("id", catchupBatch);

      if (batchRows && batchRows.length > 0) {
        await Promise.all(batchRows.map(async (p) => {
          const generalQuery = `${p.name} ${cleanCity} ${stateAbbr} summer camp price tuition per week 2026`;
          const bookingQuery = `${p.name} ${cleanCity} ${stateAbbr} summer camp register schedule tuition rates`;
          // B2: directory-first query — marketplaces almost always publish real dollar prices,
          // so we hit them explicitly before the generic Google fallback.
          const directoryQuery = `${p.name} ${cleanCity} price (site:activityhero.com OR site:hisawyer.com OR site:sawyer.com OR site:campspot.com OR site:peerspace.com OR site:winnetka.com OR site:yelp.com OR site:facebook.com)`;

          // B2.2: hybrid brand+directory query. When this provider matches a
          // known brand token with priced siblings elsewhere, add a brand-level
          // marketplace search AND feed sibling price context to the extractor.
          // Marketplaces often list the parent brand's typical price even when
          // this specific location is missing.
          const brandTok = brandTokenOf(p.name);
          let brandQuery: string | null = null;
          let siblingPriceHint = "";
          if (brandTok && brandTok.split(/\s+/).length >= 2) {
            const { data: siblings } = await admin
              .from("mvs_providers")
              .select("name, price_min, price_max")
              .neq("id", p.id)
              .not("price_min", "is", null)
              .not("price_max", "is", null)
              .eq("price_derived_from_brand", false)
              .ilike("name", `%${brandTok}%`)
              .limit(6);
            const priced = (siblings ?? []).filter((s: any) => s.price_min > 0 && s.price_max > 0);
            if (priced.length >= 1) {
              brandQuery = `"${brandTok}" summer camp weekly tuition price (site:activityhero.com OR site:hisawyer.com OR site:sawyer.com OR site:yelp.com OR site:facebook.com OR site:campspot.com)`;
              const mins = priced.map((s: any) => s.price_min).sort((a: number, b: number) => a - b);
              const maxs = priced.map((s: any) => s.price_max).sort((a: number, b: number) => a - b);
              const medMin = mins[Math.floor(mins.length / 2)];
              const medMax = maxs[Math.floor(maxs.length / 2)];
              siblingPriceHint = `\nBRAND CONTEXT: "${brandTok}" locations elsewhere charge roughly $${medMin}-$${medMax}/week (n=${priced.length}). Prefer amounts consistent with this range, but ONLY extract a price if it explicitly appears in the search or scrape text below. Do not invent numbers.`;
            }
          }
          const qDebug: Record<string, unknown> = { provider_id: p.id, provider_name: p.name, queries: [directoryQuery, bookingQuery, generalQuery, brandQuery].filter(Boolean), brand_token: brandTok || null, brand_hint_used: !!siblingPriceHint };
          try {
            // Atomic DB Lock guard to prevent duplicate background workers checking the same camp
            const { data: lockRow } = await admin.from("mvs_providers")
              .update({ price_min: -1, updated_at: new Date().toISOString() })
              .eq("id", p.id).is("price_min", null).select("id").maybeSingle();
            
            if (!lockRow) {
              qDebug.skipped_locked = true;
              catchupResults.push(qDebug);
              return;
            }

            // Priority 2: Map-then-Scrape logic on official domain
            const siteUrl = (p.website_url || p.url) as string | null;
            const mapUrlsToScrape: string[] = [];
            if (siteUrl) {
              try {
                const parsedUrl = new URL(siteUrl);
                const mapRes = await fetchWithTimeout(`${FIRECRAWL_V2}/map`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    url: parsedUrl.origin,
                    search: "tuition rates pricing cost register faq camp",
                    limit: 10,
                  }),
                }, 15_000).catch(() => null);
                if (mapRes && mapRes.ok) {
                  totalFirecrawl += 1;
                  const mapJson = await mapRes.json().catch(() => ({}));
                  const links: string[] = Array.isArray(mapJson?.data) ? mapJson.data : Array.isArray(mapJson?.data?.links) ? mapJson.data.links : [];
                  const kw = /(rate|tuition|price|pricing|cost|register|registration|faq|camp|summer)/i;
                  for (const l of links) {
                    if (typeof l === "string" && kw.test(l)) mapUrlsToScrape.push(l);
                  }
                }
              } catch {
                // Ignore map URL parse errors
              }
            }
            qDebug.map_urls_found = mapUrlsToScrape.slice(0, 2);

            // Scrape top 1-2 mapped URLs + execute Priority 3 Booking Search & General Search concurrently
            const selectedMapUrls = mapUrlsToScrape.slice(0, 2);
            const [mapScrapes, directorySearchRes, bookingSearchRes, generalSearchRes] = await Promise.all([
              Promise.all(selectedMapUrls.map(async (sUrl) => {
                const sRes = await fetchWithTimeout(`${FIRECRAWL_V2}/scrape`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ url: sUrl, formats: ["markdown"], onlyMainContent: false }),
                }, 15_000).catch(() => null);
                if (sRes && sRes.ok) {
                  totalFirecrawl += 1;
                  const sJson = await sRes.json().catch(() => ({}));
                  if (sJson?.data?.markdown) return `=== OFFICIAL PRICING PAGE (${sUrl}) ===\n${sJson.data.markdown}`;
                }
                return null;
              })),
              // B2: directory-first — hit ActivityHero/Sawyer/etc before generic Google.
              fetchWithTimeout(`${FIRECRAWL_V2}/search`, {
                method: "POST",
                headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ query: directoryQuery, limit: 3, scrapeOptions: { formats: ["markdown"], onlyMainContent: false } }),
              }, FIRECRAWL_TIMEOUT_MS).catch(() => null),
              fetchWithTimeout(`${FIRECRAWL_V2}/search`, {
                method: "POST",
                headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ query: bookingQuery, limit: 2, scrapeOptions: { formats: ["markdown"], onlyMainContent: false } }),
              }, FIRECRAWL_TIMEOUT_MS).catch(() => null),
              fetchWithTimeout(`${FIRECRAWL_V2}/search`, {
                method: "POST",
                headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ query: generalQuery, limit: 3, scrapeOptions: { formats: ["markdown"], onlyMainContent: false } }),
              }, FIRECRAWL_TIMEOUT_MS).catch(() => null),
            ]);

            if (directorySearchRes && directorySearchRes.ok) totalFirecrawl += 1;
            if (bookingSearchRes && bookingSearchRes.ok) totalFirecrawl += 1;
            if (generalSearchRes && generalSearchRes.ok) totalFirecrawl += 1;

            const parseSearch = async (res: Response | null) => {
              if (!res || !res.ok) return [];
              const j = await res.json().catch(() => ({}));
              return (Array.isArray(j?.data?.web) ? j.data.web : Array.isArray(j?.data) ? j.data : []) as Array<Record<string, unknown>>;
            };

            const [directoryItems, bookingItems, generalItems] = await Promise.all([
              parseSearch(directorySearchRes),
              parseSearch(bookingSearchRes),
              parseSearch(generalSearchRes),
            ]);

            // Directory items come first — they usually have real dollar prices.
            const searchItems = [...directoryItems, ...bookingItems, ...generalItems];
            const searchBlob = searchItems.map((it, idx) => `=== SEARCH RESULT ${idx + 1} ===\nURL: ${it.url ?? ""}\nTITLE: ${it.title ?? ""}\nDESCRIPTION SNIPPET: ${it.description ?? ""}\n\n${String(it.markdown ?? it.content ?? "").slice(0, 6000)}`).join("\n\n");
            const blob = [...mapScrapes.filter(Boolean), searchBlob].filter(Boolean).join("\n\n");

            // Prefer a directory URL as the evidence link when one exists — cleaner than a homepage.
            const discoveredUrl = (directoryItems[0]?.url as string) || selectedMapUrls[0] || (bookingItems[0]?.url as string) || (generalItems[0]?.url as string) || null;
            qDebug.directory_hits = directoryItems.length;

            const gemRes = await fetchWithTimeout(AI_GATEWAY, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: catchupSys },
                  { role: "user", content: `Provider Name: ${p.name}\nCity: ${city}\n\nSEARCH & SCRAPE RESULTS MARKDOWN:\n${blob.slice(0, 28000)}` },
                ],
                response_format: { type: "json_object" },
              }),
            }, GEMINI_TIMEOUT_MS);

            let finalMin: number | null = null;
            let finalMax: number | null = null;
            let finalCat: string | null = null;
            let finalConf = 0.8;

            if (gemRes.ok) {
              const gemJson = await gemRes.json().catch(() => ({}));
              const parsed = JSON.parse(gemJson?.choices?.[0]?.message?.content ?? "{}") as { price_min?: number | null; price_max?: number | null; category_raw?: string | null; confidence?: number };
              
              const isValidPrice = (val?: number | null) => typeof val === "number" && Number.isFinite(val) && val >= 15 && val <= 5000;

              const candidatePrices: number[] = [];
              if (isValidPrice(parsed.price_min)) candidatePrices.push(parsed.price_min!);
              if (isValidPrice(parsed.price_max)) candidatePrices.push(parsed.price_max!);

              for (const m of blob.matchAll(/\$\s?(\d{1,3}(?:[,]?\d{3})*|\d+)/g)) {
                const num = Number(m[1].replace(/,/g, ""));
                if (Number.isFinite(num) && num >= 40 && num <= 2500) candidatePrices.push(num);
              }

              if (candidatePrices.length > 0) {
                // Priority 4: Pick HIGHEST recurring weekly tuition
                finalMax = Math.max(...candidatePrices);
                finalMin = Math.min(...candidatePrices);
                if (finalMin < 100 && finalMax >= 150) finalMin = finalMax;
              }

              finalCat = parsed.category_raw ?? null;
              finalConf = Math.max(0.7, parsed.confidence ?? 0.8);
            }

            qDebug.extracted = { price_min: finalMin, price_max: finalMax, discovered_url: discoveredUrl };
            if (finalMin != null || finalMax != null) {
              const patch: Record<string, unknown> = {
                price_min: finalMin ?? finalMax,
                price_max: finalMax ?? finalMin,
                category_raw: finalCat,
                confidence: finalConf,
                updated_at: new Date().toISOString(),
              };
              if (!p.source_listing_url && discoveredUrl) {
                patch.source_listing_url = discoveredUrl;
              }
              await admin.from("mvs_providers").update(patch).eq("id", p.id);
              qDebug.updated = true;
            } else {
              // No price found, revert lock so future runs can check again
              await admin.from("mvs_providers").update({ price_min: null, updated_at: new Date().toISOString() }).eq("id", p.id).eq("price_min", -1);
            }
          } catch (e) {
            qDebug.error = e instanceof Error ? e.message : String(e);
            // On failure, revert lock so future runs can retry
            await admin.from("mvs_providers").update({ price_min: null, updated_at: new Date().toISOString() }).eq("id", p.id).eq("price_min", -1);
          }
          catchupResults.push(qDebug);
        }));
      }
      catchupDebug = { ran: true, workerBatch: catchupBatch, count: batchRows?.length ?? 0, results: catchupResults };

      // Update parent run tracking counters if parentRunId is present
      if (parentRunId) {
        try {
          const { data: runRow } = await admin.from("mvs_pipeline_runs").select("source_counts, firecrawl_calls").eq("id", parentRunId).maybeSingle();
          if (runRow) {
            const sc = (runRow.source_counts ?? {}) as Record<string, any>;
            const catchupMeta = (sc.catchup ?? { batches_total: 0, batches_completed: 0 }) as Record<string, any>;
            const completed = (catchupMeta.batches_completed ?? 0) + 1;
            const total = catchupMeta.batches_total ?? 0;
            sc.catchup = { ...catchupMeta, batches_completed: completed };

            // B1: when this is the final worker, run brand price propagation
            // for the city before we mark the run finished.
            if (total > 0 && completed >= total) {
              try {
                const propagation = await propagateBrandPricesForCity(admin, city);
                sc.brand_propagation = propagation;
                console.log("[mvs-discover-providers] brand propagation", city, propagation);
              } catch (propErr) {
                console.warn("[mvs-discover-providers] brand propagation failed:", propErr);
              }
            }

            await admin.from("mvs_pipeline_runs").update({
              source_counts: sc,
              firecrawl_calls: (runRow.firecrawl_calls ?? 0) + totalFirecrawl,
            }).eq("id", parentRunId);
          }
        } catch (trkErr) {
          console.warn("[mvs-discover-providers] worker progress track failed:", trkErr);
        }
      }
    } else if (firecrawlKey && lovableKey && !catchupBatch) {
      // Main parent scan mode: find ALL unpriced camps and spawn background micro-batches
      try {
        const { data: missingRows } = await admin
          .from("mvs_providers")
          .select("id")
          .eq("city", city)
          .is("price_min", null)
          .is("price_max", null)
          .limit(500);

        if (missingRows && missingRows.length > 0) {
          const allMissingIds = missingRows.map(r => r.id as string);
          const slices: string[][] = [];
          for (let i = 0; i < allMissingIds.length; i += 5) {
            slices.push(allMissingIds.slice(i, i + 5));
          }

          if (parentRunId) {
            try {
              const { data: runRow } = await admin.from("mvs_pipeline_runs").select("source_counts").eq("id", parentRunId).maybeSingle();
              if (runRow) {
                const sc = (runRow.source_counts ?? {}) as Record<string, any>;
                sc.catchup = { batches_total: slices.length, batches_completed: 0 };
                await admin.from("mvs_pipeline_runs").update({ source_counts: sc }).eq("id", parentRunId);
              }
            } catch (initErr) {
              console.warn("[mvs-discover-providers] parent tracking init failed:", initErr);
            }
          }

          const functionUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/mvs-discover-providers`;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          EdgeRuntime.waitUntil((async () => {
            for (const slice of slices) {
              try {
                await fetch(functionUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                  body: JSON.stringify({ city, catchupBatch: slice, parent_run_id: parentRunId }),
                });
              } catch (bgErr) {
                console.warn("[mvs-discover-providers] bg micro-batch spawn failed:", bgErr);
              }
            }
          })());

          catchupDebug = { spawned_background: true, batches: slices.length, total_camps: allMissingIds.length };
        } else {
          catchupDebug = { skipped: true, reason: "no missing prices found" };
          // B1: even when no catchup was needed, still try brand propagation
          // once — it's a cheap same-city SQL sweep and may fill gaps left
          // by earlier runs.
          try {
            const propagation = await propagateBrandPricesForCity(admin, city);
            (catchupDebug as any).brand_propagation = propagation;
          } catch (propErr) {
            console.warn("[mvs-discover-providers] brand propagation (skip branch) failed:", propErr);
          }
        }
      } catch (e) {
        catchupDebug = { error: e instanceof Error ? e.message : String(e) };
      }
    }
    debug.missing_price_catchup = catchupDebug;



    // Only the standalone-caller branch owns the run row's lifecycle. When
    // the orchestrator owns the row, it finalizes status itself.
    if (!parentRunId) {
      await admin.from("mvs_pipeline_runs").update({
        status: "done",
        firecrawl_calls: totalFirecrawl,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    const respPayload: Record<string, unknown> = {
      run_id: runId,
      city,
      firecrawl_calls: totalFirecrawl,
      debug,
    };

    if (!catchupBatch) {
      respPayload.providers_inserted = inserted;
      respPayload.providers_updated = updated;
      respPayload.providers_merged = rows.length;
      respPayload.screenshot_path = screenshotPath;
      respPayload.source_counts = {
        ...sourceCounts,
        catchup: catchupDebug,
        google_search_queries: (debug.google_search as Record<string, unknown> | undefined)?.queries ?? [],
        targeted_scrape: debug.targeted_scrape ?? null,
      };
    }

    return new Response(
      JSON.stringify(respPayload),
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
