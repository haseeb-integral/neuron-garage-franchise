import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    if (!res.ok) throw new Error(`SmartLead ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  }
  throw new Error("SmartLead rate limit after retries");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("SMARTLEAD_API_KEY");
  if (!apiKey) return json({ error: "SMARTLEAD_API_KEY not configured" }, 500);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: campaigns, error: cErr } = await supabase.from("campaign_cache").select("id");
  if (cErr) return json({ error: "campaign_query_failed", detail: cErr.message }, 500);

  let added = 0, alreadySuppressed = 0;
  const failed: Array<{ campaign_id: string; error: string }> = [];
  const seen = new Set<string>();

  for (const c of campaigns ?? []) {
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

      const { data: existing } = await supabase.from("suppressed_emails").select("email").in("email", emails);
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
    ok: true,
    campaigns_checked: campaigns?.length ?? 0,
    new_suppressions_added: added,
    already_suppressed_skipped: alreadySuppressed,
    failed_campaigns: failed,
  };
  console.log("smartlead-unsubscribe-sync summary", JSON.stringify(summary));
  return json(summary);
});
