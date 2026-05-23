import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TeacherProspect } from "@/data/teacherData";

export interface TeacherOutreachStatus {
  promotedUuids: Set<string>;
  promotedInfo: Map<string, { campaign_id: string | null; state: string }>;
  allPromotedIds: string[];
  campaignNames: Map<string, string>;
  refreshAllPromoted: () => Promise<void>;
}

/**
 * Loads outreach-queue status for a page of prospects plus the full
 * "active outreach" id list and a campaign id → name map.
 */
export function useTeacherOutreachStatus(prospects: TeacherProspect[]): TeacherOutreachStatus {
  const [promotedUuids, setPromotedUuids] = useState<Set<string>>(new Set());
  const [promotedInfo, setPromotedInfo] = useState<Map<string, { campaign_id: string | null; state: string }>>(new Map());
  const [allPromotedIds, setAllPromotedIds] = useState<string[]>([]);
  const [campaignNames, setCampaignNames] = useState<Map<string, string>>(new Map());

  // Per-page campaign-state lookup
  useEffect(() => {
    const uuids = prospects.map((p) => p.uuid);
    if (uuids.length === 0) {
      setPromotedUuids(new Set());
      setPromotedInfo(new Map());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("outreach_queue")
        .select("teacher_prospect_id, campaign_id, state, added_at")
        .in("teacher_prospect_id", uuids)
        .in("state", ["queued", "assigned", "sending", "sent", "failed"])
        .order("added_at", { ascending: false });
      if (!data) return;
      const info = new Map<string, { campaign_id: string | null; state: string }>();
      for (const r of data as { teacher_prospect_id: string; campaign_id: string | null; state: string }[]) {
        if (!info.has(r.teacher_prospect_id)) {
          info.set(r.teacher_prospect_id, { campaign_id: r.campaign_id, state: r.state });
        }
      }
      const activeOnly = new Set<string>();
      for (const [uuid, v] of info.entries()) {
        if (v.state !== "failed") activeOnly.add(uuid);
      }
      setPromotedUuids(activeOnly);
      setPromotedInfo(info);
    })();
  }, [prospects]);

  const refreshAllPromoted = useCallback(async () => {
    const { data } = await supabase
      .from("outreach_queue")
      .select("teacher_prospect_id")
      .in("state", ["queued", "assigned", "sending", "sent"]);
    if (data) {
      const ids = Array.from(new Set((data as { teacher_prospect_id: string }[]).map((r) => r.teacher_prospect_id)));
      setAllPromotedIds(ids);
    }
  }, []);
  useEffect(() => { refreshAllPromoted(); }, [refreshAllPromoted]);

  // Campaign id → name map (small, cached)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("campaign_cache").select("id, name");
      if (data) {
        const m = new Map<string, string>();
        for (const c of data as { id: string; name: string | null }[]) {
          if (c.name) m.set(c.id, c.name);
        }
        setCampaignNames(m);
      }
    })();
  }, []);

  return { promotedUuids, promotedInfo, allPromotedIds, campaignNames, refreshAllPromoted };
}
