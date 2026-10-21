import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Staff-only: copies SmartLead mailboxes into email_accounts and each
// campaign's mailboxes into campaign_mailbox_assignments. Never deletes mailboxes.
const SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class KeyRejected extends Error {}

// 250ms gap between calls keeps us under 10 requests per 2 seconds.
async function slGet(path: string, apiKey: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(250);
    const res = await fetch(`${SMARTLEAD_BASE}/${path}${sep}api_key=${apiKey}`);
    if (res.status === 429) { await sleep(2 ** attempt * 1000); continue; }
    if (res.status === 401) throw new KeyRejected("SmartLead rejected the API key");
    if (!res.ok) throw new Error(`SmartLead ${res.status}: request failed`);
    return await res.json();
  }
  throw new Error("SmartLead rate limit after retries");
}

const asList = (raw: any): any[] => Array.isArray(raw) ? raw : (raw?.data ?? raw?.email_accounts ?? []);
const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };

function providerOf(a: any): string {
  const t = String(a?.type ?? a?.provider ?? "").toLowerCase();
  if (t.includes("gmail") || t.includes("google")) return "gmail";
  if (t.includes("outlook") || t.includes("microsoft")) return "outlook";
  return "smtp";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration error" }, 500);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in to sync mailboxes" }, 401);
  const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.slice(7));
  if (authErr || !claims?.claims?.sub) return json({ error: "Sign in to sync mailboxes" }, 401);
  const { data: staff, error: roleErr } = await supabase.rpc("is_staff", { _user_id: claims.claims.sub });
  if (roleErr || !staff) return json({ error: "Staff access required" }, 403);

  try {
    const body = await req.text();
    const parsed = z.object({}).strict().safeParse(body ? JSON.parse(body) : {});
    if (!parsed.success) return json({ error: "Invalid sync request" }, 400);
  } catch { return json({ error: "Invalid JSON" }, 400); }

  const apiKey = Deno.env.get("SMARTLEAD_API_KEY");
  if (!apiKey) return json({ error: "SmartLead key is not set up" }, 500);

  const now = new Date().toISOString();
  try {
    // 1. All mailboxes (paged).
    const accounts: any[] = [];
    for (let offset = 0; ; offset += 100) {
      const rows = asList(await slGet(`email-accounts?offset=${offset}&limit=100`, apiKey));
      accounts.push(...rows);
      if (rows.length < 100) break;
    }
    const rows = accounts.filter((a) => num(a?.id) !== null).map((a) => ({
      smartlead_id: num(a.id)!,
      email: String(a.from_email ?? a.email ?? a.username ?? "").trim().toLowerCase() || null,
      provider: providerOf(a),
      warmup_enabled: String(a?.warmup_details?.status ?? "").toLowerCase() === "active" || a?.warmup_enabled === true,
      warmup_reputation: num(String(a?.warmup_details?.warmup_reputation ?? a?.warmup_reputation ?? "").replace("%", "")),
      daily_limit: num(a.message_per_day ?? a.daily_limit),
      daily_sent: num(a.daily_sent_count ?? a.daily_sent) ?? 0,
      last_synced_at: now,
    }));
    if (rows.length) {
      const { error } = await supabase.from("email_accounts").upsert(rows, { onConflict: "smartlead_id" });
      if (error) return json({ error: "Could not save mailboxes", detail: error.message }, 500);
    }

    // 2. Each campaign's mailboxes.
    const { data: campaigns, error: cErr } = await supabase.from("campaign_cache").select("id");
    if (cErr) return json({ error: "Could not read campaigns", detail: cErr.message }, 500);
    let links = 0;
    const failed: Array<{ campaign_id: string; error: string }> = [];
    for (const c of (campaigns ?? []).filter((x: any) => /^\d+$/.test(String(x.id)))) {
      try {
        const list = asList(await slGet(`campaigns/${c.id}/email-accounts`, apiKey));
        const linkRows = list.filter((a) => num(a?.id) !== null).map((a) => ({
          campaign_cache_id: String(c.id),
          smartlead_campaign_id: Number(c.id),
          email_account_smartlead_id: num(a.id)!,
          email: String(a.from_email ?? a.email ?? "").trim().toLowerCase() || null,
          last_synced_at: now,
        }));
        // Replace this campaign's links only after a successful fetch.
        const del = await supabase.from("campaign_mailbox_assignments").delete().eq("smartlead_campaign_id", Number(c.id));
        if (del.error) throw new Error(del.error.message);
        if (linkRows.length) {
          const ins = await supabase.from("campaign_mailbox_assignments").insert(linkRows);
          if (ins.error) throw new Error(ins.error.message);
        }
        links += linkRows.length;
      } catch (e) {
        if (e instanceof KeyRejected) throw e;
        failed.push({ campaign_id: String(c.id), error: e instanceof Error ? e.message : "failed" });
      }
    }
    return json({ ok: true, mailboxes: rows.length, links, failed });
  } catch (e) {
    if (e instanceof KeyRejected) {
      return json({ ok: false, error: "SmartLead rejected the API key. Nothing was changed." }, 502);
    }
    return json({ ok: false, error: e instanceof Error ? e.message : "Sync failed" }, 502);
  }
});
