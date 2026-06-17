// Phase 3 / Turn 3.1 — mvs-extract-weeks (one provider end-to-end)
//
// Per the approved Feature 1A Build Plan, Turn 3.1:
//   - Pick one Austin Premium provider with a clean Sawyer listing.
//   - Firecrawl fetch + screenshot of the provider's registration page.
//   - Gemini extracts strict-JSON week schema:
//       status ∈ {open, limited, waitlist, sold_out, unknown}
//       status_evidence (short string describing the visual cue), confidence 0..1
//   - Confidence ≥ 0.7 → mvs_weeks
//   - Confidence  < 0.7 → mvs_weeks  +  mvs_qa_queue (entity_type='week')
//   - Manager-only.
//   - No UI surface this turn. Invoked via `supabase functions invoke`.
//
// Turn 3.2 (next) will loop this across all Austin Premium providers and
// compute the city low-confidence badge. Do NOT add the loop here.

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

type WeekStatus = "open" | "limited" | "waitlist" | "sold_out" | "unknown";

type WeekExtract = {
  week_start: string; // YYYY-MM-DD
  week_end: string;   // YYYY-MM-DD
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

status_evidence MUST be a short visual cue like "Red SOLD OUT badge", "Only 2 spots left text", "Register button enabled, no scarcity wording", "Waitlist button shown". One short sentence, taken from what the page actually shows.

confidence 0..1: how confident you are in BOTH the dates AND the status. Lower it (≤ 0.6) when dates are ambiguous, status wording is missing, or the page mostly shows marketing copy.

Date rules:
- A "week" is a single camp/class week the provider sells (e.g. "Jun 16 – Jun 20"). Output one row per week shown.
- If only a start date is shown, set week_end = week_start + 4 days.
- Skip rows that are not week-long camp/class sessions (e.g. single-day workshops, drop-ins, year-round memberships).
- Skip past weeks (older than 30 days before today). Do not invent dates.
- Hard cap: 40 weeks.`;

function normUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.toString();
  } catch {
    return null;
  }
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

  // Manager or admin required.
  const authHeader = req.headers.get("Authorization") ?? "";
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
  const admin = createClient(supabaseUrl, serviceKey);
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

  // Resolve target provider.
  // Body: { provider_id?: string }   — if omitted, auto-pick first Austin Premium with a URL.
  let body: { provider_id?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  let providerQuery = admin
    .from("mvs_providers")
    .select("id, city, name, url, tier")
    .eq("city", "Austin, TX")
    .eq("platform", "sawyer")
    .eq("tier", "premium")
    .not("url", "is", null)
    .limit(1);

  if (body.provider_id) {
    providerQuery = admin
      .from("mvs_providers")
      .select("id, city, name, url, tier")
      .eq("id", body.provider_id)
      .limit(1);
  }

  const { data: providerRows, error: provErr } = await providerQuery;
  if (provErr) {
    return new Response(
      JSON.stringify({ error: "provider lookup failed", detail: provErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const provider = providerRows?.[0];
  const providerUrl = normUrl(provider?.url ?? null);
  if (!provider || !providerUrl) {
    return new Response(
      JSON.stringify({ error: "no Austin Premium provider with a usable URL found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Open a pipeline run row for traceability.
  const { data: run, error: runErr } = await admin
    .from("mvs_pipeline_runs")
    .insert({ city: provider.city, status: "running", firecrawl_calls: 0 })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(
      JSON.stringify({ error: "failed to create run", detail: runErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let firecrawlCalls = 0;
  const debug: Record<string, unknown> = {
    provider_id: provider.id,
    provider_name: provider.name,
    provider_url: providerUrl,
  };

  try {
    // 1) Firecrawl scrape (JS wait + screenshot).
    const scrapeRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: providerUrl,
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        waitFor: 3500,
      }),
    });
    firecrawlCalls += 1;
    const scrapeJson = await scrapeRes.json();
    if (!scrapeRes.ok) {
      throw new Error(`firecrawl scrape ${scrapeRes.status}: ${JSON.stringify(scrapeJson).slice(0, 400)}`);
    }
    const markdown: string = scrapeJson?.data?.markdown ?? "";
    const screenshotUrlRemote: string | undefined =
      scrapeJson?.data?.screenshot ?? scrapeJson?.data?.screenshotUrl;
    debug.markdown_chars = markdown.length;
    debug.screenshot_received = Boolean(screenshotUrlRemote);
    if (!markdown) throw new Error("firecrawl returned empty markdown");

    // 2) Persist screenshot.
    let screenshotPath: string | null = null;
    if (screenshotUrlRemote) {
      try {
        const imgRes = await fetch(screenshotUrlRemote);
        if (imgRes.ok) {
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          const path = `${run.id}/weeks-${provider.id}.png`;
          const { error: upErr } = await admin.storage
            .from(SCREENSHOT_BUCKET)
            .upload(path, bytes, { contentType: "image/png", upsert: true });
          if (!upErr) screenshotPath = path;
          else debug.screenshot_upload_error = upErr.message;
        }
      } catch (e) {
        debug.screenshot_fetch_error = e instanceof Error ? e.message : String(e);
      }
    }

    // 3) Gemini Flash extracts weeks.
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Provider: ${provider.name}\nCity: ${provider.city}\nSource URL: ${providerUrl}\nToday: ${new Date().toISOString().slice(0, 10)}\n\nSCRAPED PAGE MARKDOWN:\n${markdown.slice(0, 24000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(`ai gateway ${aiRes.status}: ${JSON.stringify(aiJson).slice(0, 400)}`);
    }
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { weeks?: WeekExtract[] } = {};
    try { parsed = JSON.parse(raw); } catch {
      throw new Error(`failed to parse AI JSON: ${raw.slice(0, 300)}`);
    }

    const VALID_STATUS: WeekStatus[] = ["open", "limited", "waitlist", "sold_out", "unknown"];
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    const cleaned = (parsed.weeks ?? []).flatMap((w) => {
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
        source_run_id: run.id,
      }];
    });

    let insertedWeeks: { id: string; confidence: number | null }[] = [];
    if (cleaned.length > 0) {
      const { data: insData, error: insErr } = await admin
        .from("mvs_weeks")
        .insert(cleaned)
        .select("id, confidence");
      if (insErr) throw new Error(`insert weeks: ${insErr.message}`);
      insertedWeeks = insData ?? [];
    }

    // 4) Low-confidence rows also land in QA queue.
    const qaRows = insertedWeeks
      .filter((w) => (w.confidence ?? 0) < QA_CONFIDENCE_THRESHOLD)
      .map((w) => ({
        entity_type: "week" as const,
        entity_id: w.id,
        reason: `confidence ${(w.confidence ?? 0).toFixed(2)} below ${QA_CONFIDENCE_THRESHOLD}`,
        confidence: w.confidence,
      }));
    let qaInserted = 0;
    if (qaRows.length > 0) {
      const { error: qaErr, data: qaData } = await admin
        .from("mvs_qa_queue")
        .insert(qaRows)
        .select("id");
      if (qaErr) throw new Error(`insert qa: ${qaErr.message}`);
      qaInserted = qaData?.length ?? 0;
    }

    await admin
      .from("mvs_pipeline_runs")
      .update({ status: "done", firecrawl_calls: firecrawlCalls })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        provider_id: provider.id,
        provider_name: provider.name,
        weeks_inserted: insertedWeeks.length,
        qa_flagged: qaInserted,
        screenshot_path: screenshotPath,
        firecrawl_calls: firecrawlCalls,
        debug,
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
      JSON.stringify({ run_id: run.id, error: msg, debug }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
