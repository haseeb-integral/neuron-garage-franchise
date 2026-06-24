import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SiteScoreResult } from "@/hooks/useSiteScore";
import type { SchoolType, GradeBand } from "@/lib/sasMath";

export interface SavedSiteInputs {
  schoolName: string;
  address: string;
  schoolType: SchoolType;
  gradeBand: GradeBand;
  enrollment: string;
  lat: number | null;
  lng: number | null;
}

export interface SavedSiteRow {
  id: string;
  user_id: string;
  site_name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  site_type: string | null;
  grade_band: string | null;
  enrollment: number | null;
  inputs_json: SavedSiteInputs;
  snapshot_json: {
    pillars?: SiteScoreResult["pillars"];
    composite?: number;
    band?: string;
    verdict?: string;
    signals?: SiteScoreResult["signals"];
  };
  created_at: string;
  updated_at: string;
  saver_name?: string | null;
  saver_email?: string | null;
}

const KEY_ROUND = 5;
const roundKey = (n: number | null | undefined) =>
  n == null ? "0" : Number(n).toFixed(KEY_ROUND);

export function makeSavedKey(
  lat: number | null | undefined,
  lng: number | null | undefined,
  siteType: string | null | undefined,
) {
  return `${roundKey(lat)}|${roundKey(lng)}|${siteType ?? ""}`;
}

export function useSavedSites() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedSiteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("site_saved_sites")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as unknown as SavedSiteRow[];
    // Hydrate saver names
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const byId = new Map(
        (profiles ?? []).map((p) => [p.id, p as { id: string; full_name: string | null; email: string }]),
      );
      for (const r of list) {
        const p = byId.get(r.user_id);
        r.saver_name = p?.full_name ?? null;
        r.saver_email = p?.email ?? null;
      }
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savedByKey = useMemo(() => {
    const m = new Map<string, SavedSiteRow>();
    for (const r of rows) {
      m.set(makeSavedKey(r.lat, r.lng, r.site_type), r);
    }
    return m;
  }, [rows]);

  const isSaved = useCallback(
    (lat: number | null | undefined, lng: number | null | undefined, siteType: string | null | undefined) => {
      return savedByKey.has(makeSavedKey(lat, lng, siteType));
    },
    [savedByKey],
  );

  const findSaved = useCallback(
    (lat: number | null | undefined, lng: number | null | undefined, siteType: string | null | undefined) => {
      return savedByKey.get(makeSavedKey(lat, lng, siteType)) ?? null;
    },
    [savedByKey],
  );

  const addSite = useCallback(
    async (inputs: SavedSiteInputs, snapshot: SavedSiteRow["snapshot_json"]) => {
      if (!user) throw new Error("Sign in to save sites");
      const enrollmentNum = inputs.enrollment ? Number(inputs.enrollment) : null;
      const { error: err } = await supabase.from("site_saved_sites").insert({
        user_id: user.id,
        site_name: inputs.schoolName,
        address: inputs.address,
        lat: inputs.lat,
        lng: inputs.lng,
        site_type: inputs.schoolType,
        grade_band: inputs.gradeBand,
        enrollment: enrollmentNum,
        inputs_json: inputs as unknown as never,
        snapshot_json: snapshot as unknown as never,
      });
      if (err) throw err;
      await refresh();
    },
    [user, refresh],
  );

  const removeSite = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from("site_saved_sites").delete().eq("id", id);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  return {
    rows,
    loading,
    error,
    refresh,
    isSaved,
    findSaved,
    addSite,
    removeSite,
    currentUserId: user?.id ?? null,
  };
}
