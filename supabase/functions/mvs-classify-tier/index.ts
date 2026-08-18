// Phase 2 / Turn 2.2 — mvs-classify-tier
//
// Per the approved Feature 1A Build Plan, Turn 2.2:
//   - Gemini Flash tags each mvs_providers row Premium / Mid / Budget / Community
//     using the methodology's $400 / category / not-childcare rule.
//   - Writes `tier` + `category_classified` back to mvs_providers.
//   - Spot-check expectation: Galileo + iD Tech (if present) must be Premium;
//     any YMCA / parks-and-rec must not be Premium.
//   - No UI surface in this turn. Invoked via `supabase functions invoke`.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Tier = "premium" | "mid" | "budget" | "community";

type ProviderRow = {
  id: string;
  city: string;
  name: string;
  platform: string;
  url: string | null;
  price_min: number | null;
  price_max: number | null;
  category_raw: string | null;
};

type ClassifyResult = {
  tier: Tier;
  category_classified: string;
  reasoning?: string;
};

const SYSTEM_PROMPT = `You classify kids' activity providers into one of four tiers using the Market Validation v1.0 methodology.

Return strict JSON for each provider:
{ "id": "<provider id>", "tier": "premium"|"mid"|"budget"|"community", "category_classified": string, "reasoning": string }

Rules (apply in this order):

1. NOT-CHILDCARE FILTER: If the provider is primarily daycare, childcare, preschool, after-school care, or babysitting (not enrichment/classes/camps), classify as "community" with category_classified="childcare-excluded". They do not count as competitors.

2. COMMUNITY: If the provider is a YMCA, JCC, parks-and-rec department, public library, city/municipal program, public school enrichment, church program, or other non-profit/community organization — classify as "community" regardless of price.

3. PREMIUM: If the listed price is >= $400 per week (or equivalent: >= $80/class for multi-class packages, or >= $400 for a multi-day camp), OR the brand is a recognized national premium operator (e.g. Galileo Learning, iD Tech, Steve & Kate's, Snapology premium tracks, Lavner Camps premium), classify as "premium".

4. BUDGET: If listed price is < $200 per week (or < $25/class), classify as "budget".

5. MID: Everything else with a real listed price between $200 and $400 per week (or $25-$80/class), classify as "mid".

6. UNKNOWN PRICE: If no price is given and category is enrichment-style (gymnastics, art, music, STEM, language, sports), default to "mid" unless brand recognition pushes it to "premium".

category_classified should be a short snake_case label like "gymnastics", "stem", "music", "art", "language", "sports", "swim", "dance", "multi-activity", "camp", "childcare-excluded".

reasoning: one short sentence citing the price or category cue you used.`;

// Fixed enum used by Enrichment Diversity pillar. Keep in sync with
// ELIGIBLE_CATEGORIES in src/lib/mvs/computeMvs.ts.
const CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(stem|science|robotics|coding|engineering|tech)\b/, "stem"],
  [/\b(art|painting|drawing|ceramic|pottery|sculpt|maker)\b/, "art"],
  [/\b(music|guitar|piano|orchestra|band|rock)\b/, "music"],
  [/\b(dance|ballet|hip\s*hop|tap)\b/, "dance"],
  [/\b(language|spanish|french|mandarin|chinese|german|bilingual)\b/, "language"],
  [/\b(swim|aqua)\b/, "swim"],
  [/\b(gymnast|tumbl|cheer)\b/, "gymnastics"],
  [/\b(soccer|basketball|baseball|tennis|volleyball|football|martial|karate|jiu.?jitsu|sport)\b/, "sports"],
  [/\b(theater|theatre|drama|acting|film|video)\b/, "theater"],
  [/\b(chess|debate|academic|tutor|math|reading)\b/, "academic enrichment"],
  [/\b(cook|culinary|chef|baking)\b/, "cooking"],
  [/\b(outdoor|nature|wilderness|hiking|farm)\b/, "outdoor"],
];

function normalizeCategory(rawCat: string, nameLc: string, tier: Tier): string {
  if (tier === "community" && /child.?care|daycare|preschool/.test(rawCat + " " + nameLc)) {
    return "childcare-excluded";
  }
  const haystack = `${rawCat} ${nameLc}`;
  for (const [re, label] of CATEGORY_PATTERNS) {
    if (re.test(haystack)) return label;
  }
  // Fallback: if classifier said something explicit and short, keep it normalized
  if (rawCat && rawCat !== "camp" && rawCat !== "multi-activity" && rawCat.length < 30) {
    return rawCat.replace(/[^a-z0-9 ]+/g, "").trim() || "multi-activity";
  }
  return "multi-activity";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!lovableKey) {
    return new Response(
      JSON.stringify({ error: "missing LOVABLE_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Manager or admin required (or internal background service-role caller).
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
      return new Response(JSON.stringify({ error: "forbidden: manager required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Optional filter: city (default Austin), reclassify (default false — only untagged).
  // background=true returns 202 immediately and continues via EdgeRuntime.waitUntil,
  // so long sweeps aren't killed by the caller's HTTP timeout.
  const body = await req.json().catch(() => ({}));
  const city: string = (body?.city ?? "Austin, TX").trim();
  const reclassify: boolean = Boolean(body?.reclassify);
  const background: boolean = Boolean(body?.background);
  const batchSize = 20;


  // Fetch providers to classify.
  let query = admin
    .from("mvs_providers")
    .select("id, city, name, platform, url, price_min, price_max, category_raw, tier, sources")
    .eq("city", city);
  if (!reclassify) query = query.is("tier", null);
  const { data: providers, error: fetchErr } = await query;
  if (fetchErr) {
    return new Response(
      JSON.stringify({ error: `fetch providers: ${fetchErr.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rows = (providers ?? []) as Array<ProviderRow & { tier: Tier | null }>;
  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ city, classified: 0, message: "no providers to classify" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Load the single source of truth for Premium brand recognition from the
  // watchlist. Any row flagged is_premium_brand=true (plus its aliases) is
  // treated as a nationally recognized premium operator. This replaces the
  // previous hard-coded regex so adding a new premium brand is a one-row DB
  // insert, not a code change.
  const { data: brandRows, error: brandErr } = await admin
    .from("mvs_operator_watchlist")
    .select("name, aliases")
    .eq("is_premium_brand", true);
  if (brandErr) {
    return new Response(
      JSON.stringify({ error: `load premium brands: ${brandErr.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const premiumBrandTerms: string[] = [];
  for (const b of brandRows ?? []) {
    const name = (b as { name?: string }).name;
    if (name) premiumBrandTerms.push(name.toLowerCase());
    const aliases = (b as { aliases?: string[] | null }).aliases;
    if (Array.isArray(aliases)) {
      for (const a of aliases) if (a) premiumBrandTerms.push(String(a).toLowerCase());
    }
  }
  // Dedupe and drop empties.
  const brandMatchTerms = Array.from(
    new Set(premiumBrandTerms.map((t) => t.trim()).filter(Boolean)),
  );
  function matchesPremiumBrand(nameLc: string): boolean {
    for (const term of brandMatchTerms) {
      if (nameLc.includes(term)) return true;
    }
    return false;
  }

  let classifiedCount = 0;
  const errors: string[] = [];
  const sample: Array<{ name: string; tier: Tier; category_classified: string }> = [];

  // Build list of batches up front.
  const batches: Array<typeof rows> = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  // Process a single batch: AI call + per-row write-back.
  // Returns counts/sample so the parent loop can aggregate atomically.
  async function processBatch(batch: typeof rows, batchIdx: number) {
    const userPayload = batch.map((r) => ({
      id: r.id,
      name: r.name,
      price_min: r.price_min,
      price_max: r.price_max,
      category_raw: r.category_raw,
      url: r.url,
    }));

    let results: ClassifyResult[] = [];
    // Per-AI-call hard timeout. If the gateway hangs we'd rather abort this
    // batch and report it cleanly than burn the whole 150s edge budget on one call.
    const ac = new AbortController();
    const callTimer = setTimeout(() => ac.abort(), 60_000);
    try {
      const aiRes = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Classify each provider. Return JSON: { "classifications": [ {...}, ... ] }\n\nProviders:\n${JSON.stringify(userPayload, null, 2)}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
        signal: ac.signal,
      });
      const aiJson = await aiRes.json();
      if (!aiRes.ok) throw new Error(`ai gateway ${aiRes.status}`);
      const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { classifications?: ClassifyResult[] };
      results = parsed.classifications ?? [];
    } catch (e) {
      const msg = e instanceof Error
        ? (e.name === "AbortError" ? "ai call timed out after 60s" : e.message)
        : String(e);
      errors.push(`batch ${batchIdx}: ${msg}`);
      return;
    } finally {
      clearTimeout(callTimer);
    }


    for (const r of results) {
      if (!r?.id || !r.tier) continue;
      let tier: Tier = (["premium", "mid", "budget", "community"].includes(r.tier)
        ? r.tier
        : "mid") as Tier;

      const src = batch.find((b) => b.id === r.id) as
        | (ProviderRow & { tier: Tier | null; sources?: unknown })
        | undefined;

      const nameLc = (src?.name ?? "").toLowerCase();
      const pMax = Number(src?.price_max ?? 0);
      const pMin = Number(src?.price_min ?? 0);
      const hasPrice = pMax > 0 || pMin > 0;
      const sourcesArr = Array.isArray(src?.sources) ? (src!.sources as unknown[]) : [];
      const sourceCount = sourcesArr.length;

      const isCommunityBrand =
        /\b(ymca|jcc|parks?\s*(and|&)?\s*rec(reation)?|public library|municipal|city of |church|kindercare|boys\s*(and|&)?\s*girls\s*club|scout|4-h|parks\s+dept)\b/.test(
          nameLc,
        );
      const isChildcareLike =
        !hasPrice &&
        /\b(daycare|preschool|childcare|after.?school\s+care|learning\s+center|montessori\s+school)\b/.test(
          nameLc,
        );
      // Single source of truth: Premium brand list comes from
      // mvs_operator_watchlist (is_premium_brand=true) + aliases, loaded above.
      const isNationalPremium = matchesPremiumBrand(nameLc);

      // Precedence (Phase 2 rule): community > price-gate override > brand > AI.
      // The two-gate price rule is a HARD OVERRIDE — if a provider has a real
      // listed price and it fails the gate, it cannot be Premium even if the
      // AI tagged it Premium or the brand is on the premium watchlist.
      // Exception: known Premium brands with NO listed price keep Premium
      // (the "no price + known brand" fallback).
      if (isCommunityBrand || isChildcareLike) {
        tier = "community";
      } else if (hasPrice) {
        // Two-gate premium rule: BOTH min >= 300 AND max >= 400 required.
        if (pMin >= 300 && pMax >= 400) {
          tier = "premium";
        } else if (pMax > 0 && pMax < 200 && (pMin === 0 || pMin < 200)) {
          tier = "budget";
        } else {
          tier = "mid";
        }
      } else if (isNationalPremium) {
        // No price + known premium brand → keep Premium (brand fallback).
        tier = "premium";
      } else {
        // No price + not a known premium brand → never Premium.
        tier = tier === "premium" ? "mid" : tier;
      }

      const rawCat = (r.category_classified || src?.category_raw || "").toLowerCase();
      const category = normalizeCategory(rawCat, nameLc, tier);

      const { error: upErr } = await admin
        .from("mvs_providers")
        .update({
          tier,
          category_classified: category.slice(0, 100),
        })
        .eq("id", r.id);
      if (upErr) {
        errors.push(`update ${r.id}: ${upErr.message}`);
        continue;
      }
      classifiedCount += 1;
      if (src && sample.length < 10) {
        sample.push({ name: src.name, tier, category_classified: category });
      }
    }
  }

  // Run batches with bounded concurrency so total wall time stays well under
  // the 150s edge-function idle timeout.
  const MAX_CONCURRENCY = 5;
  const SOFT_DEADLINE_MS = 130_000;
  const startedAt = Date.now();

  async function runAllBatches() {
    let batchesAttempted = 0;
    let abortedAtBatch: number | null = null;
    for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
      if (Date.now() - startedAt > SOFT_DEADLINE_MS) {
        abortedAtBatch = i;
        errors.push(
          `aborted at batch ${i}/${batches.length} after ${Math.round(
            (Date.now() - startedAt) / 1000,
          )}s to avoid 150s platform timeout`,
        );
        break;
      }
      const wave = batches.slice(i, i + MAX_CONCURRENCY);
      batchesAttempted += wave.length;
      await Promise.all(wave.map((b, j) => processBatch(b, i + j)));
    }
    return { batchesAttempted, abortedAtBatch };
  }

  if (background) {
    // Fire-and-forget: return 202 now, keep working.
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(runAllBatches());
    else runAllBatches();
    return new Response(
      JSON.stringify({ city, total_candidates: rows.length, background: true, batches_total: batches.length }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { batchesAttempted, abortedAtBatch } = await runAllBatches();
  return new Response(
    JSON.stringify({
      city,
      total_candidates: rows.length,
      classified: classifiedCount,
      batches_total: batches.length,
      batches_attempted: batchesAttempted,
      aborted_at_batch: abortedAtBatch,
      duration_ms: Date.now() - startedAt,
      errors: errors.slice(0, 10),
      sample,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});


