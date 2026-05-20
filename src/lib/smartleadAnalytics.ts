import { supabase } from "@/integrations/supabase/client";

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload } });
  if (error) throw new Error(error.message ?? String(error));
  return data;
}

export type CampaignAnalytic = {
  id: string | number;
  name: string;
  status?: string;
  sent_count: number;
  open_count: number;
  reply_count: number;
  click_count: number;
  bounce_count: number;
  interested_count: number;
};

export type Aggregated = {
  totals: { sent: number; open: number; reply: number; click: number; bounce: number; interested: number };
  rates: { openRate: number; replyRate: number; clickRate: number; bounceRate: number; interestedRate: number };
  perCampaign: CampaignAnalytic[];
  source: "overview" | "per-campaign-fallback";
  fetchedAt: string;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

function normalizeAnalytics(raw: unknown, id: string | number, name: string, status?: string): CampaignAnalytic {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id, name, status,
    sent_count: num(r.sent_count ?? r.total_sent ?? r.sent),
    open_count: num(r.open_count ?? r.unique_open_count ?? r.opened ?? r.opens),
    reply_count: num(r.reply_count ?? r.replied_count ?? r.replies),
    click_count: num(r.click_count ?? r.unique_click_count ?? r.clicks),
    bounce_count: num(r.bounce_count ?? r.bounced_count ?? r.bounces),
    interested_count: num(r.interested_count ?? r.positive_reply_count ?? r.interested),
  };
}

export async function fetchAggregated(): Promise<Aggregated> {
  let perCampaign: CampaignAnalytic[] = [];
  let source: Aggregated["source"] = "overview";
  try {
    const overview = await callProxy("/analytics/overview", "GET");
    const list = Array.isArray(overview) ? overview : (overview?.campaigns ?? overview?.data ?? []);
    if (Array.isArray(list) && list.length > 0) {
      perCampaign = list.map((c: Record<string, unknown>) =>
        normalizeAnalytics(c, (c.id ?? c.campaign_id) as string | number, String(c.name ?? c.campaign_name ?? `Campaign ${c.id}`), c.status as string | undefined)
      );
    }
  } catch {
    // fall through to per-campaign
  }

  if (perCampaign.length === 0) {
    source = "per-campaign-fallback";
    const campaignsRaw = await callProxy("/campaigns", "GET");
    const campaigns: Array<{ id: string | number; name?: string; status?: string }> = Array.isArray(campaignsRaw) ? campaignsRaw : (campaignsRaw?.data ?? []);
    for (const c of campaigns) {
      try {
        const a = await callProxy(`/campaigns/${c.id}/analytics`, "GET");
        const data = a?.data ?? a;
        perCampaign.push(normalizeAnalytics(data, c.id, c.name ?? `Campaign ${c.id}`, c.status));
      } catch {
        perCampaign.push(normalizeAnalytics({}, c.id, c.name ?? `Campaign ${c.id}`, c.status));
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const totals = perCampaign.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent_count,
      open: acc.open + c.open_count,
      reply: acc.reply + c.reply_count,
      click: acc.click + c.click_count,
      bounce: acc.bounce + c.bounce_count,
      interested: acc.interested + c.interested_count,
    }),
    { sent: 0, open: 0, reply: 0, click: 0, bounce: 0, interested: 0 }
  );

  const rates = {
    openRate: pct(totals.open, totals.sent),
    replyRate: pct(totals.reply, totals.sent),
    clickRate: pct(totals.click, totals.sent),
    bounceRate: pct(totals.bounce, totals.sent),
    interestedRate: pct(totals.interested, totals.reply),
  };

  return { totals, rates, perCampaign, source, fetchedAt: new Date().toISOString() };
}

export const ANALYTICS_CACHE_KEY = "smartlead_analytics_overview";

/** Reads cached analytics from campaign_cache if fresh (10min); fetches otherwise. */
export async function getAnalyticsCachedOrFresh(maxAgeMs: number = 10 * 60 * 1000): Promise<Aggregated> {
  if (maxAgeMs > 0) {
    const { data: cached } = await supabase
      .from("campaign_cache")
      .select("raw_data, last_synced")
      .eq("id", ANALYTICS_CACHE_KEY)
      .maybeSingle();
    if (cached?.raw_data && cached.last_synced) {
      const ageMs = Date.now() - new Date(cached.last_synced).getTime();
      if (ageMs < maxAgeMs) return cached.raw_data as unknown as Aggregated;
    }
  }
  const fresh = await fetchAggregated();
  await supabase.from("campaign_cache").upsert([{
    id: ANALYTICS_CACHE_KEY,
    name: "Analytics Overview",
    status: fresh.source,
    last_synced: new Date().toISOString(),
    raw_data: JSON.parse(JSON.stringify(fresh)),
  }]);
  return fresh;
}
