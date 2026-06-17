// Phase 7 / Turn 7.1 — mvs-extract-weeks-all
//
// City-parametrized successor to mvs-extract-weeks-austin-all. Same scrape +
// extract pipeline, but pulls premium Sawyer providers for whatever city the
// caller passes. Body: { city, state? }. Defaults to Austin, TX for back-compat
// so the old orchestrator path keeps working until rollout is fully wired.

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

type ProviderRow = { id: string; name: string; url: string | null };

type ProviderOutcome = {
  provider_id: string;
  provider_name: string;
  url: string | null;
  no_reg_page: boolean;
  weeks_inserted: number;
  qa_flagged: number;
  error?: string;
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
  const url = normUrl(provider.url);
  const out: ProviderOutcome = {
    provider_id: provider.id,
    provider_name: provider.name,
    url,
    no_reg_page: false,
    weeks_inserted: 0,
    qa_flagged: 0,
  };

  if (!url) {
    out.no_reg_page = true;
    return { outcome: out, firecrawlCalls: 0 };
  }

  let firecrawlCalls = 0;
  try {
    const scrapeRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        waitFor: 3500,
      }),
    });
    firecrawlCalls += 1;
    const scrapeJson = await scrapeRes.json().catch(() => ({}));
    if (!scrapeRes.ok) {
      out.no_reg_page = true;
      out.error = `firecrawl ${scrapeRes.status}`;
      return { outcome: out, firecrawlCalls };
    }
    const markdown: string = scrapeJson?.data?.markdown ?? "";
    const screenshotRemote: string | undefined =
      scrapeJson?.data?.screenshot ?? scrapeJson?.data?.screenshotUrl;
    if (!markdown || markdown.length < 200) {
      out.no_reg_page = true;
      out.error = "empty markdown";
      return { outcome: out, firecrawlCalls };
    }

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
  const cityKey: string = (body?.city ?? "Austin, TX").trim();
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
    .select("id, name, url, tier")
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
      .select("id, name, url, tier")
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

  if (providerList.length === 0) {
    return new Response(
      JSON.stringify({ error: `no Sawyer providers found for ${city} (run discover/classify first)` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }


  const { data: run, error: runErr } = await admin
    .from("mvs_pipeline_runs")
    .insert({ city, status: "running", firecrawl_calls: 0 })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(
      JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const outcomes: ProviderOutcome[] = [];
  let firecrawlCalls = 0;

  try {
    for (const p of providerList) {
      const { outcome, firecrawlCalls: used } = await processProvider(
        admin, p, run.id, firecrawlKey, lovableKey, todayISO, city,
      );
      outcomes.push(outcome);
      firecrawlCalls += used;
    }

    const noRegCount = outcomes.filter((o) => o.no_reg_page).length;
    const noRegPct = outcomes.length > 0 ? noRegCount / outcomes.length : 0;
    const lowConfidence = noRegPct > LOW_CONFIDENCE_BADGE_PCT;

    const { error: flagErr } = await admin
      .from("mvs_city_flags")
      .upsert(
        {
          city,
          state,
          low_confidence_badge: lowConfidence,
          last_run_id: run.id,
        },
        { onConflict: "city,state" },
      );
    if (flagErr) throw new Error(`city flag upsert: ${flagErr.message}`);

    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "done", firecrawl_calls: firecrawlCalls })
      .eq("id", run.id);

    const totalWeeks = outcomes.reduce((s, o) => s + o.weeks_inserted, 0);
    const totalQa = outcomes.reduce((s, o) => s + o.qa_flagged, 0);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        city,
        providers_processed: outcomes.length,
        no_reg_page_count: noRegCount,
        no_reg_page_pct: Number(noRegPct.toFixed(3)),
        low_confidence_badge: lowConfidence,
        weeks_inserted_total: totalWeeks,
        qa_flagged_total: totalQa,
        firecrawl_calls: firecrawlCalls,
        outcomes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "failed", error: msg, firecrawl_calls: firecrawlCalls })
      .eq("id", run.id);
    return new Response(
      JSON.stringify({ run_id: run.id, error: msg, outcomes }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
