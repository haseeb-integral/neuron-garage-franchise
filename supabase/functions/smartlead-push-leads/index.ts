// Push verified teacher_prospects from the Master Pool into a SmartLead campaign.
// Sprint 2 of v1.2 plan. Records each successful push in outreach_queue.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";

interface PushBody {
  campaign_id: string | number;
  state?: string | null;
  city?: string | null;
  teacher_prospect_ids?: string[];
  include_catch_all?: boolean;
  limit?: number;
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = (claims.claims as { sub?: string }).sub ?? null;

    const apiKey = Deno.env.get("SMARTLEAD_API_KEY");
    if (!apiKey) return json({ error: "SMARTLEAD_API_KEY not configured" }, 500);

    const body = (await req.json().catch(() => ({}))) as PushBody;
    if (!body.campaign_id) return json({ error: "campaign_id is required" }, 400);

    // Build query: verified (+ optionally catch_all) prospects with valid emails
    // that are NOT already in outreach_queue for this campaign.
    const allowedStatuses = body.include_catch_all ? ["valid", "catch_all"] : ["valid"];
    let q = supabase
      .from("teacher_prospects")
      .select("id, first_name, last_name, name, email, school, district, city, state, verification_status")
      .in("verification_status", allowedStatuses)
      .not("email", "is", null)
      .neq("email", "")
      .limit(Math.min(body.limit ?? 1000, 5000));
    if (body.state) q = q.eq("state", body.state);
    if (body.city) q = q.eq("city", body.city);
    if (body.teacher_prospect_ids?.length) q = q.in("id", body.teacher_prospect_ids);

    const { data: prospects, error: pErr } = await q;
    if (pErr) return json({ error: pErr.message }, 500);
    if (!prospects?.length) return json({ pushed: 0, skipped: 0, candidates: 0, message: "No matching prospects" });

    // Exclude prospects already in outreach_queue for this campaign
    const { data: existing } = await supabase
      .from("outreach_queue")
      .select("teacher_prospect_id")
      .eq("campaign_id", String(body.campaign_id))
      .in("teacher_prospect_id", prospects.map((p) => p.id));
    const alreadyIn = new Set((existing ?? []).map((r) => r.teacher_prospect_id));
    const toPush = prospects.filter((p) => !alreadyIn.has(p.id));

    if (body.dry_run) {
      return json({
        candidates: prospects.length,
        already_in_campaign: alreadyIn.size,
        would_push: toPush.length,
        dry_run: true,
      });
    }
    if (toPush.length === 0) {
      return json({ pushed: 0, skipped: prospects.length, candidates: prospects.length, message: "All already in this campaign" });
    }

    // SmartLead requires lead_list — push in chunks of 100
    const chunks: typeof toPush[] = [];
    for (let i = 0; i < toPush.length; i += 100) chunks.push(toPush.slice(i, i + 100));

    let pushed = 0;
    const errors: string[] = [];
    const queueRows: Array<Record<string, unknown>> = [];

    for (const chunk of chunks) {
      const lead_list = chunk.map((p) => {
        const [fn, ...rest] = (p.name ?? "").trim().split(/\s+/);
        return {
          first_name: p.first_name || fn || "",
          last_name: p.last_name || rest.join(" ") || "",
          email: p.email,
          company_name: p.school ?? "",
          custom_fields: { city: p.city ?? "", state: p.state ?? "", district: p.district ?? "" },
        };
      });
      const url = `${SMARTLEAD_BASE}/campaigns/${body.campaign_id}/leads?api_key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_list, settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: false } }),
      });
      const text = await res.text();
      if (!res.ok) {
        errors.push(`chunk ${pushed}-${pushed + chunk.length}: ${res.status} ${text.slice(0, 200)}`);
        continue;
      }
      // Best-effort parse for upload_count / lead ids
      let parsed: { upload_count?: number; uploaded_leads?: Array<{ email?: string; lead_id?: number | string }> } = {};
      try { parsed = JSON.parse(text); } catch { /* keep */ }
      const emailToLeadId = new Map<string, string>();
      for (const u of parsed.uploaded_leads ?? []) {
        if (u.email && u.lead_id != null) emailToLeadId.set(u.email.toLowerCase(), String(u.lead_id));
      }
      pushed += parsed.upload_count ?? chunk.length;
      for (const p of chunk) {
        queueRows.push({
          teacher_prospect_id: p.id,
          campaign_id: String(body.campaign_id),
          state: "pushed",
          pushed_at: new Date().toISOString(),
          smartlead_lead_id: emailToLeadId.get((p.email ?? "").toLowerCase()) ?? null,
          added_by: userId,
        });
      }
    }

    if (queueRows.length) {
      const { error: insErr } = await supabase.from("outreach_queue").insert(queueRows);
      if (insErr) errors.push(`queue insert: ${insErr.message}`);

      // Stamp the source rows so the Master Pool view can instantly tell which
      // teachers are already in SmartLead without joining outreach_queue.
      const pushedIds = queueRows.map((r) => r.teacher_prospect_id as string);
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("teacher_prospects")
        .update({ status: "in_smartlead", last_pushed_at: nowIso })
        .in("id", pushedIds);
      if (updErr) errors.push(`source stamp: ${updErr.message}`);
    }

    return json({
      pushed,
      skipped: alreadyIn.size,
      candidates: prospects.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
