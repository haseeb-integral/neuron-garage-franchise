import { supabase } from "@/integrations/supabase/client";

export interface RealCampaign {
  id: string;
  name: string;
  status: string | null;
}

const REAL_STATUSES = new Set(["active", "paused", "stopped", "drafted", "draft", "completed", "running"]);

export const isRealCampaignId = (id: string | null | undefined) => !!id && /^\d+$/.test(id);

/**
 * Fetch live SmartLead campaigns via the proxy and upsert the real ones
 * into `campaign_cache`. Returns the real-campaign list (numeric ids,
 * real lifecycle statuses) ready to drive selectors. Falls back to a
 * cache-only read if the proxy is unreachable.
 */
export async function syncAndGetRealCampaigns(): Promise<RealCampaign[]> {
  try {
    const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
      body: { endpoint: "campaigns/", method: "GET" },
    });
    if (error) throw error;
    if (data && (data as { ok?: boolean }).ok === false) {
      throw new Error("smartlead-proxy returned an error");
    }
    const list = Array.isArray(data) ? data : [];
    const real: RealCampaign[] = list
      .map((c: { id?: string | number; name?: string; status?: string }) => ({
        id: String(c.id ?? ""),
        name: c.name ?? "",
        status: c.status ?? null,
      }))
      .filter((c) => /^\d+$/.test(c.id) && REAL_STATUSES.has((c.status ?? "").toLowerCase()));

    if (real.length) {
      // Mirror into campaign_cache so badges/lookups elsewhere stay in sync.
      const rows = real.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        last_synced: new Date().toISOString(),
      }));
      await supabase.from("campaign_cache").upsert(rows, { onConflict: "id" });
    }
    return real;
  } catch {
    // Fallback: read whatever's already cached.
    const { data } = await supabase
      .from("campaign_cache")
      .select("id, name, status")
      .order("last_synced", { ascending: false })
      .limit(200);
    return ((data ?? []) as RealCampaign[]).filter(
      (c) => /^\d+$/.test(c.id) && REAL_STATUSES.has((c.status ?? "").toLowerCase()),
    );
  }
}
