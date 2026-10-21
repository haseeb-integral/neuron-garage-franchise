import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Daily job (and manual POST): pulls unsubscribed leads from every SmartLead
// campaign and adds new ones to suppressed_emails. Server-side only.
const SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function slGet(path: string, apiKey: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${SMARTLEAD_BASE}/${path}${sep}api_key=${apiKey}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) { await sleep(2 ** attempt * 1000); continue; }
    const text = await res.text();
    if (!res.ok) throw new Error(`SmartLead ${res.status}${res.status === 401 ? ": API key rejected" : ": request failed"}`);
    return JSON.parse(text);
  }
  throw new Error("SmartLead rate limit after retries");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration error" }, 500);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const cronToken = req.headers.get("x-cron-token");
  if (cronToken) {
    // Nightly timer: its own pass, checked in the database, max once per 20 hours.
    const { data: claim, error: claimError } = await supabase.rpc("claim_unsub_cron_run", { _token: cronToken });
    if (claimError) return json({ error: "Could not check timer pass" }, 500);
    if (claim === "too_soon") return json({ error: "Timer already ran in the last 20 hours" }, 429);
    if (claim !== "ok") return json({ error: "Not allowed" }, 401);
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in to sync unsubscribes" }, 401);
    const token = authHeader.slice(7);
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return json({ error: "Sign in to sync unsubscribes" }, 401);
    const { data: staff, error: roleError } = await supabase.rpc("is_staff", { _user_id: data.claims.sub });
    if (roleError || !staff) return json({ error: "Staff access required" }, 403);
  }
  try {
    const body = await req.text();
    const parsed = z.object({ time: z.string().datetime().optional() }).strict().safeParse(body ? JSON.parse(body) : {});
    if (!parsed.success) return json({ error: "Invalid sync request" }, 400);
    if ([...new URL(req.url).searchParams].length > 0) return json({ error: "No query parameters allowed" }, 400);
  } catch { return json({ error: "Invalid JSON" }, 400); }

  const apiKey = Deno.env.get("SMARTLEAD_API_KEY");
  if (!apiKey) return json({ error: "SMARTLEAD_API_KEY not configured" }, 500);

  const { data: campaigns, error: cErr } = await supabase.from("campaign_cache").select("id");
  if (cErr) return json({ error: "campaign_query_failed", detail: cErr.message }, 500);

  let added = 0, alreadySuppressed = 0;
  const failed: Array<{ campaign_id: string; error: string }> = [];
  const seen = new Set<string>();

  for (const c of (campaigns ?? []).filter((x: any) => /^\d+$/.test(String(x.id)))) {
    try {
      const emails: string[] = [];
      const limit = 100;
      for (let offset = 0; ; offset += limit) {
        const raw = await slGet(`campaigns/${c.id}/leads?status=unsubscribed&offset=${offset}&limit=${limit}`, apiKey);
        const rows: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        for (const r of rows) {
          const e = String(r?.lead?.email ?? r?.email ?? "").trim().toLowerCase();
          if (e && !seen.has(e)) { seen.add(e); emails.push(e); }
        }
        await sleep(250);
        const total = Number(raw?.total_leads ?? 0);
        if (rows.length < limit || (total && offset + limit >= total)) break;
      }
      if (emails.length === 0) continue;

      const { data: existing, error: existingError } = await supabase.from("suppressed_emails").select("email").in("email", emails);
      if (existingError) throw new Error("Could not read existing unsubscribes");
      const have = new Set((existing ?? []).map((x: any) => String(x.email).toLowerCase()));
      const fresh = emails.filter((e) => !have.has(e));
      alreadySuppressed += emails.length - fresh.length;
      if (fresh.length) {
        const { data: ins, error: iErr } = await supabase
          .from("suppressed_emails")
          .upsert(
            fresh.map((email) => ({
              email,
              reason: "unsubscribe",
              metadata: { source: "smartlead_unsubscribe_sync", campaign_id: c.id },
            })),
            { onConflict: "email", ignoreDuplicates: true },
          )
          .select("email");
        if (iErr) throw new Error(`insert: ${iErr.message}`);
        added += ins?.length ?? 0;
        alreadySuppressed += fresh.length - (ins?.length ?? 0);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("campaign sync failed", c.id, msg);
      failed.push({ campaign_id: c.id, error: msg });
      await sleep(250);
    }
  }

  const summary = {
    ok: failed.length === 0,
    campaigns_checked: (campaigns ?? []).filter((c) => /^\d+$/.test(String(c.id))).length,
    new_suppressions_added: added,
    already_suppressed_skipped: alreadySuppressed,
    failed_campaigns: failed,
  };
  console.log("smartlead-unsubscribe-sync summary", JSON.stringify(summary));
  return json(summary);
});
