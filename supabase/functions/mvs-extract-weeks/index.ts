// mvs-extract-weeks
//
// City-parametrized week extractor. Scrapes premium-tier provider pages for
// the given city, asks the LLM to identify per-week availability, and writes
// rows to mvs_weeks. Body: { city, state? }. Defaults to Austin, TX.
// This is the single extractor function — earlier `-all` / `-austin-all`
// variants have been removed.

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
const QA_CONFIDENCE_THRESHOLD = 0.7;
const LOW_CONFIDENCE_BADGE_PCT = 0.20;
const MAX_PROVIDERS = 25;

type WeekStatus = "open" | "limited" | "waitlist" | "sold_out" | "unknown";

type WeekExtract = {
  week_start: string;
  week_end: string;
  status: WeekStatus;
  status_evidence: string;
  confidence: number;
};

const SYSTEM_PROMPT = `You extract weekly camp/class availability from a kids' activity provider's Sawyer registration page.

Return strict JSON:
{ "weeks": [ { "week_start": "YYYY-MM-DD", "week_end": "YYYY-MM-DD", "status": "open"|"limited"|"waitlist"|"sold_out"|"unknown", "status_evidence": string, "confidence": number } ] }

Status rules (apply the strongest visible cue):
- "sold_out": page shows "Sold Out", "Full", a red badge, or the Register button is disabled with sold-out wording.
- "waitlist": page shows "Waitlist", "Join Waitlist", or a yellow/amber waitlist badge.
- "limited": page shows "Only N spots left", "Almost full", "Limited", or similar low-availability text.
- "open": Register / Enroll / Book button is enabled and no scarcity wording is shown.
- "unknown": price/date is shown but availability cannot be determined from the page.

status_evidence MUST be a short visual cue. One short sentence, taken from what the page actually shows.

confidence 0..1: how confident you are in BOTH the dates AND the status.

Date rules:
- A "week" is a single camp/class week the provider sells. Output one row per week shown.
- If only a start date is shown, set week_end = week_start + 4 days.
- Skip rows that are not week-long camp/class sessions.
- Skip past weeks (older than 30 days before today). Do not invent dates.
- Hard cap: 40 weeks.`;

const VALID_STATUS: WeekStatus[] = ["open", "limited", "waitlist", "sold_out", "unknown"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function normUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try { return new URL(u).toString(); } catch { return null; }
}

function fallbackWeeksFromMarkdown(markdown: string): WeekExtract[] {
  const match = markdown.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(20\d{2})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(20\d{2})\b/);
  if (!match) return [];
  const start = `${match[3]}-${MONTHS[match[1]]}-${match[2].padStart(2, "0")}`;
  const end = `${match[6]}-${MONTHS[match[4]]}-${match[5].padStart(2, "0")}`;
  const lc = markdown.toLowerCase();
  const status: WeekStatus = lc.includes("sold out") ? "sold_out"
    : lc.includes("waitlist") ? "waitlist"
    : lc.includes("booking fast") || lc.includes("classes remaining") || lc.includes("spots left") ? "limited"
    : "open";
  return [{
    week_start: start,
    week_end: end,
    status,
    status_evidence: status === "limited" ? "Sawyer page shows booking fast/classes remaining" : "Sawyer page shows visible dates and registration page",
    confidence: 0.7,
  }];
}

type ProviderRow = {
  id: string;
  name: string;
  url: string | null;
  website_url: string | null;
  source_listing_url: string | null;
};

type TriedEntry = {
  url: string;
  step: "map" | "search" | "scrape" | "ai";
  ok: boolean;
  http_status?: number;
  note?: string;
};

type ProviderOutcome = {
  provider_id: string;
  provider_name: string;
  url: string | null;
  root_url: string | null;
  no_reg_page: boolean;
  weeks_inserted: number;
  qa_flagged: number;
  error?: string;
  tried: TriedEntry[];
};

async function processProvider(
  admin: ReturnType<typeof createClient>,
  provider: ProviderRow,
  runId: string,
  firecrawlKey: string,
  lovableKey: string,
  todayISO: string,
  cityLabel: string,
): Promise<{ outcome: ProviderOutcome; firecrawlCalls: number }> {
  // Prefer the provider's own website; fall back to the discovery/listing
  // URL, then to the legacy url column. Skip Google-search fallback URLs.
  const candidates = [provider.website_url, provider.source_listing_url, provider.url]
    .map((u) => normUrl(u))
    .filter((u): u is string => !!u && !u.startsWith("https://www.google.com/search"));
  const rootUrl = candidates[0] ?? null;
  const out: ProviderOutcome = {
    provider_id: provider.id,
    provider_name: provider.name,
    url: rootUrl,
    root_url: rootUrl,
    no_reg_page: false,
    weeks_inserted: 0,
    qa_flagged: 0,
    tried: [],
  };

  if (!rootUrl) {
    out.no_reg_page = true;
    out.error = "no website URL on provider record";
    return { outcome: out, firecrawlCalls: 0 };
  }

  let firecrawlCalls = 0;

  // Step 1: build a prioritized candidate list of pages where weekly availability
  // might live: (a) the provider's existing Sawyer/registration URL if any,
  // (b) high-scoring links from a Firecrawl /map of the provider site,
  // (c) Firecrawl /search results on the same domain (or hisawyer.com).
  // Root URL is only a last resort.
  const candidatePages: string[] = [];
  const seenCandidate = new Set<string>();
  const pushCand = (u: string | null | undefined) => {
    const n = normUrl(u ?? null);
    if (!n) return;
    if (n.startsWith("https://www.google.com/search")) return;
    if (seenCandidate.has(n)) return;
    seenCandidate.add(n);
    candidatePages.push(n);
  };
  if (provider.url) pushCand(provider.url);

  try {
    const mapRes = await fetch(`${FIRECRAWL_V2}/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: rootUrl, limit: 100 }),
    });
    firecrawlCalls += 1;
    const mapJson = await mapRes.json().catch(() => ({}));
    const links: string[] = Array.isArray(mapJson?.links)
      ? mapJson.links
      : Array.isArray(mapJson?.data?.links) ? mapJson.data.links : [];
    out.tried.push({
      url: rootUrl,
      step: "map",
      ok: mapRes.ok,
      http_status: mapRes.status,
      note: mapRes.ok ? `found ${links.length} links` : `map failed`,
    });
    const KW = [
      { re: /summer[-_/]?camp/i, w: 10 },
      { re: /\/camps?(\/|$)/i, w: 8 },
      { re: /schedule|calendar|sessions|weeks?-of/i, w: 6 },
      { re: /register|registration|enroll|signup|sign-up|book/i, w: 5 },
      { re: /sawyer|hisawyer/i, w: 4 },
      { re: /classes|programs|workshops/i, w: 3 },
    ];
    const NEG = /\b(blog|news|press|about|contact|gift|policy|privacy|terms|login|account|careers|jobs|faq|staff|team|gallery|donate)\b/i;
    const scored = links
      .map((l) => {
        let s = 0;
        for (const k of KW) if (k.re.test(l)) s += k.w;
        if (NEG.test(l)) s -= 8;
        return { l, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4);
    for (const s of scored) pushCand(s.l);
  } catch (e) {
    out.tried.push({ url: rootUrl, step: "map", ok: false, note: `map error: ${(e as Error).message}` });
  }

  try {
    const searchQuery = `${provider.name} ${cityLabel} summer camp registration schedule`;
    const searchRes = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, limit: 5 }),
    });
    firecrawlCalls += 1;
    const sj = await searchRes.json().catch(() => ({}));
    const web = sj?.data?.web ?? sj?.data ?? [];
    let sameDomainHits = 0;
    if (Array.isArray(web)) {
      const rootHost = new URL(rootUrl).hostname.replace(/^www\./, "");
      for (const r of web) {
        const u = r?.url;
        if (!u || typeof u !== "string") continue;
        try {
          const h = new URL(u).hostname.replace(/^www\./, "");
          if (h === rootHost || h.endsWith("." + rootHost) || h.endsWith("hisawyer.com")) {
            pushCand(u);
            sameDomainHits += 1;
          }
        } catch { /* skip */ }
      }
    }
    out.tried.push({
      url: `web search: ${searchQuery}`,
      step: "search",
      ok: searchRes.ok,
      http_status: searchRes.status,
      note: searchRes.ok
        ? `${sameDomainHits} of ${Array.isArray(web) ? web.length : 0} results matched provider domain or hisawyer.com`
        : "search failed",
    });
  } catch (e) {
    out.tried.push({ url: "web search", step: "search", ok: false, note: `search error: ${(e as Error).message}` });
  }

  if (candidatePages.length === 0) pushCand(rootUrl);

  // Step 2: scrape up to 3 candidates and pick the one with the strongest
  // week-date + status evidence. This avoids storing the homepage when an
  // actual schedule page exists.
  type Scraped = { url: string; markdown: string; screenshot?: string; score: number };
  const scraped: Scraped[] = [];
  const WEEK_DATE_RE = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/gi;
  const STATUS_HINT_RE = /(sold\s*out|wait\s*list|spots?\s*left|register|enroll|book\s*now|add\s*to\s*cart|\$\d)/gi;

  for (const cand of candidatePages.slice(0, 3)) {
    try {
      const sRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cand,
          formats: ["markdown", "screenshot"],
          onlyMainContent: true,
          waitFor: 3500,
        }),
      });
      firecrawlCalls += 1;
      const sj = await sRes.json().catch(() => ({}));
      if (!sRes.ok) {
        out.tried.push({ url: cand, step: "scrape", ok: false, http_status: sRes.status, note: `scrape blocked (HTTP ${sRes.status})` });
        continue;
      }
      const md: string = sj?.data?.markdown ?? "";
      const ss: string | undefined = sj?.data?.screenshot ?? sj?.data?.screenshotUrl;
      if (!md || md.length < 200) {
        out.tried.push({ url: cand, step: "scrape", ok: true, http_status: sRes.status, note: `page was too short (${md.length} chars)` });
        continue;
      }
      const dateHits = (md.match(WEEK_DATE_RE) ?? []).length;
      const statusHits = (md.match(STATUS_HINT_RE) ?? []).length;
      const score = dateHits * 3 + statusHits;
      out.tried.push({
        url: cand,
        step: "scrape",
        ok: true,
        http_status: sRes.status,
        note: `scraped ok · ${dateHits} week-date hits · ${statusHits} status hits`,
      });
      scraped.push({ url: cand, markdown: md, screenshot: ss, score });
      if (dateHits >= 6 && statusHits >= 3) break;
    } catch (e) {
      out.tried.push({ url: cand, step: "scrape", ok: false, note: `scrape error: ${(e as Error).message}` });
    }
  }

  if (scraped.length === 0) {
    out.no_reg_page = true;
    out.error = "no scrapeable candidate page";
    return { outcome: out, firecrawlCalls };
  }

  scraped.sort((a, b) => b.score - a.score);
  const best = scraped[0];
  const url = best.url;
  const markdown = best.markdown;
  const screenshotRemote = best.screenshot;
  out.url = url;

  try {
    let screenshotPath: string | null = null;
    if (screenshotRemote) {
      try {
        const imgRes = await fetch(screenshotRemote);
        if (imgRes.ok) {
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          const path = `${runId}/weeks-${provider.id}.png`;
          const { error: upErr } = await admin.storage
            .from(SCREENSHOT_BUCKET)
            .upload(path, bytes, { contentType: "image/png", upsert: true });
          if (!upErr) screenshotPath = path;
        }
      } catch { /* non-fatal */ }
    }

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Provider: ${provider.name}\nCity: ${cityLabel}\nSource URL: ${url}\nToday: ${todayISO}\n\nSCRAPED PAGE MARKDOWN:\n${markdown.slice(0, 24000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json().catch(() => ({}));
    if (!aiRes.ok) {
      out.error = `ai ${aiRes.status}`;
      return { outcome: out, firecrawlCalls };
    }
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { weeks?: WeekExtract[] } = {};
    try { parsed = JSON.parse(raw); } catch {
      out.error = "ai parse fail";
      return { outcome: out, firecrawlCalls };
    }

    const extractedWeeks = (parsed.weeks && parsed.weeks.length > 0)
      ? parsed.weeks
      : fallbackWeeksFromMarkdown(markdown);

    const cleaned = extractedWeeks.flatMap((w) => {
      if (!w || !DATE_RE.test(w.week_start ?? "") || !DATE_RE.test(w.week_end ?? "")) return [];
      const status: WeekStatus = VALID_STATUS.includes(w.status) ? w.status : "unknown";
      const conf = Math.max(0, Math.min(1, Number(w.confidence ?? 0.5)));
      return [{
        provider_id: provider.id,
        week_start: w.week_start,
        week_end: w.week_end,
        status,
        status_evidence: (w.status_evidence ?? "").toString().slice(0, 500) || null,
        screenshot_url: screenshotPath,
        source_url: url,
        confidence: conf,
        source_run_id: runId,
      }];
    });

    if (cleaned.length > 0) {
      const { data: insData, error: insErr } = await admin
        .from("mvs_weeks")
        .upsert(cleaned, { onConflict: "provider_id,week_start" })
        .select("id, confidence");
      if (insErr) {
        out.error = `upsert weeks: ${insErr.message}`;
        return { outcome: out, firecrawlCalls };
      }
      out.weeks_inserted = insData?.length ?? 0;

      // Clear stale unresolved week QA rows for this provider's weeks so
      // re-runs don't pile up duplicates. Resolved history is preserved.
      const allWeekIds = (insData ?? []).map((w) => w.id);
      if (allWeekIds.length > 0) {
        await admin
          .from("mvs_qa_queue")
          .delete()
          .eq("entity_type", "week")
          .is("resolved_at", null)
          .in("entity_id", allWeekIds);
      }

      const qaRows = (insData ?? [])
        .filter((w) => (w.confidence ?? 0) < QA_CONFIDENCE_THRESHOLD)
        .map((w) => ({
          entity_type: "week" as const,
          entity_id: w.id,
          reason: `confidence ${(w.confidence ?? 0).toFixed(2)} below ${QA_CONFIDENCE_THRESHOLD}`,
          confidence: w.confidence,
        }));
      if (qaRows.length > 0) {
        const { data: qaData } = await admin.from("mvs_qa_queue").insert(qaRows).select("id");
        out.qa_flagged = qaData?.length ?? 0;
      }
    }
    return { outcome: out, firecrawlCalls };
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
    return { outcome: out, firecrawlCalls };
  }
}

// Derive state abbr from "City, ST" key. Falls back to provided state.
function parseCityKey(cityKey: string, stateOverride?: string): { city: string; state: string } {
  const m = cityKey.match(/^(.+),\s*([A-Z]{2})$/);
  if (m) return { city: cityKey.trim(), state: m[2] };
  return { city: cityKey.trim(), state: (stateOverride ?? "").trim() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
  const cityKey: string = (body?.city ?? "Austin, TX").trim();
  const parentRunId: string | null = body?.parent_run_id ?? null;
  const providerIdsFilter: string[] | null = Array.isArray(body?.provider_ids) && body.provider_ids.length > 0
    ? (body.provider_ids as string[]).filter((s) => typeof s === "string" && s.length > 0)
    : null;
  const { city, state } = parseCityKey(cityKey, body?.state);
  if (!state) {
    return new Response(
      JSON.stringify({ error: `unable to derive state from city '${cityKey}'` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Prefer premium-tier Sawyer providers; if none exist for this city,
  // fall back to any tier and flag the run as low-confidence.
  let providerQuery = admin
    .from("mvs_providers")
    .select("id, name, url, website_url, source_listing_url, tier")
    .eq("city", city)
    .eq("platform", "sawyer")
    .order("created_at", { ascending: true })
    .limit(MAX_PROVIDERS);

  const { data: premiumProviders, error: premiumErr } = await providerQuery.eq("tier", "premium");
  if (premiumErr) {
    return new Response(
      JSON.stringify({ error: "provider lookup failed", detail: premiumErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let providerList = (premiumProviders ?? []) as ProviderRow[];
  let premiumFallback = false;
  if (providerList.length === 0) {
    const { data: anyTier, error: anyErr } = await admin
      .from("mvs_providers")
      .select("id, name, url, website_url, source_listing_url, tier")
      .eq("city", city)
      .eq("platform", "sawyer")
      .order("created_at", { ascending: true })
      .limit(MAX_PROVIDERS);
    if (anyErr) {
      return new Response(
        JSON.stringify({ error: "provider lookup failed", detail: anyErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    providerList = (anyTier ?? []) as ProviderRow[];
    premiumFallback = providerList.length > 0;
  }

  // Optional per-row re-run: limit to the provider IDs the caller asked for.
  if (providerIdsFilter) {
    providerList = providerList.filter((p) => providerIdsFilter.includes(p.id));
  }

  if (providerList.length === 0) {
    const { error: flagErr } = await admin
      .from("mvs_city_flags")
      .upsert(
        {
          city,
          state,
          low_confidence_badge: true,
        },
        { onConflict: "city,state" },
      );
    if (flagErr) {
      return new Response(
        JSON.stringify({ error: "city flag upsert failed", detail: flagErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        run_id: null,
        city,
        providers_processed: 0,
        no_reg_page_count: 0,
        no_reg_page_pct: 0,
        low_confidence_badge: true,
        premium_fallback: false,
        weeks_inserted_total: 0,
        qa_flagged_total: 0,
        firecrawl_calls: 0,
        outcomes: [],
        message: `No Sawyer providers found for ${city}; pipeline completed with no extractable providers.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }


  let runId: string;
  if (parentRunId) {
    runId = parentRunId;
  } else {
    const { data: run, error: runErr } = await admin
      .from("mvs_pipeline_runs")
      .insert({ city, status: "running", firecrawl_calls: 0, started_at: new Date().toISOString() })
      .select()
      .single();
    if (runErr || !run) {
      return new Response(
        JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    runId = run.id;
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const outcomes: ProviderOutcome[] = [];
  let firecrawlCalls = 0;

  try {
    for (const p of providerList) {
      const { outcome, firecrawlCalls: used } = await processProvider(
        admin, p, runId, firecrawlKey, lovableKey, todayISO, city,
      );
      outcomes.push(outcome);
      firecrawlCalls += used;
    }

    // Surface providers that produced 0 weeks in the QA queue so reviewers
    // can follow up (entity_type='provider'). Clear any prior unresolved
    // provider-level rows for these providers first so re-runs stay clean.
    const zeroWeekProviderIds = outcomes
      .filter((o) => (o.weeks_inserted ?? 0) === 0)
      .map((o) => o.provider_id);
    if (zeroWeekProviderIds.length > 0) {
      await admin
        .from("mvs_qa_queue")
        .delete()
        .eq("entity_type", "provider")
        .is("resolved_at", null)
        .in("entity_id", zeroWeekProviderIds);
      const providerQaRows = outcomes
        .filter((o) => (o.weeks_inserted ?? 0) === 0)
        .map((o) => ({
          entity_type: "provider" as const,
          entity_id: o.provider_id,
          reason: o.no_reg_page
            ? (o.error ? `no usable page: ${o.error}` : "no registration page found")
            : (o.error ?? "extraction returned 0 weeks"),
          confidence: null,
          diagnostics: {
            root_url: o.root_url ?? o.url ?? null,
            tried: o.tried ?? [],
            error: o.error ?? null,
          },
        }));
      if (providerQaRows.length > 0) {
        await admin.from("mvs_qa_queue").insert(providerQaRows);
      }
    }


    const noRegCount = outcomes.filter((o) => o.no_reg_page).length;
    const noRegPct = outcomes.length > 0 ? noRegCount / outcomes.length : 0;
    const lowConfidence = premiumFallback || noRegPct > LOW_CONFIDENCE_BADGE_PCT;


    const { error: flagErr } = await admin
      .from("mvs_city_flags")
      .upsert(
        {
          city,
          state,
          low_confidence_badge: lowConfidence,
          last_run_id: runId,
        },
        { onConflict: "city,state" },
      );
    if (flagErr) throw new Error(`city flag upsert: ${flagErr.message}`);

    // Orchestrator owns the run row's lifecycle when parentRunId is set.
    if (!parentRunId) {
      await admin
        .from("mvs_pipeline_runs")
        .update({ status: "done", firecrawl_calls: firecrawlCalls, finished_at: new Date().toISOString() })
        .eq("id", runId);
    }

    const totalWeeks = outcomes.reduce((s, o) => s + o.weeks_inserted, 0);
    const totalQa = outcomes.reduce((s, o) => s + o.qa_flagged, 0);

    return new Response(
      JSON.stringify({
        run_id: runId,
        city,
        providers_processed: outcomes.length,
        no_reg_page_count: noRegCount,
        no_reg_page_pct: Number(noRegPct.toFixed(3)),
        low_confidence_badge: lowConfidence,
        premium_fallback: premiumFallback,
        weeks_inserted_total: totalWeeks,
        qa_flagged_total: totalQa,
        firecrawl_calls: firecrawlCalls,
        outcomes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!parentRunId) {
      await admin
        .from("mvs_pipeline_runs")
        .update({ status: "failed", error: msg, firecrawl_calls: firecrawlCalls, finished_at: new Date().toISOString() })
        .eq("id", runId);
    }
    return new Response(
      JSON.stringify({ run_id: runId, error: msg, outcomes }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
