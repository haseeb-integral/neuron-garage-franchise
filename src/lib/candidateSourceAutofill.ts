import { supabase } from "@/integrations/supabase/client";

export interface CandidateSourceFields {
  source_type: string;
  source_name: string;
  source_campaign: string | null;
}

/**
 * Phase 3 — auto-fill candidate source for candidates promoted from teacher
 * prospects. If the prospect sits in an outreach_queue row with a SmartLead
 * campaign, we fill Outbound Email › SmartLead › <campaign name>.
 * Staff can still change the values by hand afterwards.
 */
export async function smartleadSourceForProspects(
  prospectIds: string[],
): Promise<Map<string, CandidateSourceFields>> {
  const out = new Map<string, CandidateSourceFields>();
  const ids = Array.from(new Set(prospectIds.filter(Boolean)));
  if (ids.length === 0) return out;

  const { data: queueRows } = await supabase
    .from("outreach_queue")
    .select("teacher_prospect_id, campaign_id, pushed_at, added_at")
    .in("teacher_prospect_id", ids);
  if (!queueRows?.length) return out;

  // Keep the most recent queue row per prospect.
  const latest = new Map<string, { campaign_id: string | null; ts: string }>();
  for (const r of queueRows) {
    const pid = r.teacher_prospect_id as string | null;
    if (!pid) continue;
    const ts = (r.pushed_at ?? r.added_at ?? "") as string;
    const prev = latest.get(pid);
    if (!prev || ts > prev.ts) latest.set(pid, { campaign_id: r.campaign_id ?? null, ts });
  }

  const campaignIds = Array.from(
    new Set(Array.from(latest.values()).map((v) => v.campaign_id).filter(Boolean) as string[]),
  );
  const nameById = new Map<string, string>();
  if (campaignIds.length) {
    const { data: campaigns } = await supabase
      .from("campaign_cache")
      .select("id, name")
      .in("id", campaignIds);
    for (const c of campaigns ?? []) if (c.name) nameById.set(String(c.id), c.name);
  }

  for (const [pid, v] of latest) {
    out.set(pid, {
      source_type: "Outbound Email",
      source_name: "SmartLead",
      source_campaign: v.campaign_id ? nameById.get(v.campaign_id) ?? v.campaign_id : null,
    });
  }
  return out;
}

/** Convenience for single-prospect promote flows. */
export async function smartleadSourceForProspect(
  prospectId: string | null | undefined,
): Promise<CandidateSourceFields | null> {
  if (!prospectId) return null;
  const map = await smartleadSourceForProspects([prospectId]);
  return map.get(prospectId) ?? null;
}
