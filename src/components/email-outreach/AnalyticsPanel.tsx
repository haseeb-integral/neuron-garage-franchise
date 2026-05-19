import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, AlertCircle, TrendingUp, Mail, Reply, Target, XCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload } });
  if (error) throw new Error(error.message ?? String(error));
  return data;
}

type CampaignAnalytic = {
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

type Aggregated = {
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

async function fetchAggregated(): Promise<Aggregated> {
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
    // fall through
  }

  if (perCampaign.length === 0) {
    source = "per-campaign-fallback";
    const campaignsRaw = await callProxy("/campaigns", "GET");
    const campaigns: Array<{ id: string | number; name?: string; status?: string }> = Array.isArray(campaignsRaw) ? campaignsRaw : (campaignsRaw?.data ?? []);
    // Sequential with 250ms gap to respect 10 req/2s
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

const CACHE_KEY = "smartlead_analytics_overview";

export function AnalyticsPanel() {
  const [data, setData] = useState<Aggregated | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      // Try cache first (10 min freshness)
      if (!force) {
        const { data: cached } = await supabase
          .from("campaign_cache")
          .select("raw_data, last_synced")
          .eq("id", CACHE_KEY)
          .maybeSingle();
        if (cached?.raw_data && cached.last_synced) {
          const ageMs = Date.now() - new Date(cached.last_synced).getTime();
          if (ageMs < 10 * 60 * 1000) {
            setData(cached.raw_data as unknown as Aggregated);
            setLoading(false);
            return;
          }
        }
      }
      const fresh = await fetchAggregated();
      setData(fresh);
      await supabase.from("campaign_cache").upsert([{
        id: CACHE_KEY,
        name: "Analytics Overview",
        status: fresh.source,
        last_synced: new Date().toISOString(),
        raw_data: fresh as unknown as Record<string, unknown>,
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const sendsByCampaign = useMemo(
    () => (data?.perCampaign ?? []).map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name, Sent: c.sent_count, Opens: c.open_count, Replies: c.reply_count })),
    [data]
  );

  const funnel = useMemo(() => {
    if (!data) return [];
    return [
      { stage: "Sent", value: data.totals.sent },
      { stage: "Opened", value: data.totals.open },
      { stage: "Clicked", value: data.totals.click },
      { stage: "Replied", value: data.totals.reply },
      { stage: "Interested", value: data.totals.interested },
    ];
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e7edf5] bg-white py-16">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#174be8]" />
        <span className="text-sm text-[#526078]">Loading SmartLead analytics…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700"><AlertCircle size={16} /><span className="text-sm font-bold">Could not load analytics</span></div>
        <p className="mt-2 text-xs text-red-700">{error}</p>
        <button onClick={() => void load(true)} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700">Retry</button>
      </div>
    );
  }

  if (!data || data.perCampaign.length === 0) {
    return (
      <div className="rounded-xl border border-[#e7edf5] bg-white p-10 text-center">
        <TrendingUp className="mx-auto mb-3 h-10 w-10 text-[#174be8]" />
        <h3 className="text-base font-black">No analytics yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#526078]">Analytics will appear here as soon as your SmartLead campaigns start sending. Aggregated KPIs, sends-over-time, and a reply funnel will populate automatically.</p>
        <button onClick={() => void load(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-3 py-2 text-xs font-bold text-white"><RefreshCw size={14} /> Refresh</button>
      </div>
    );
  }

  const kpis: Array<{ icon: typeof Mail; label: string; value: string; sub: string; tone: string }> = [
    { icon: Send, label: "Total Sent", value: data.totals.sent.toLocaleString(), sub: `${data.perCampaign.length} campaigns`, tone: "text-[#174be8]" },
    { icon: Mail, label: "Open Rate", value: `${data.rates.openRate.toFixed(1)}%`, sub: `${data.totals.open.toLocaleString()} opens`, tone: "text-[#0a8f5a]" },
    { icon: Reply, label: "Reply Rate", value: `${data.rates.replyRate.toFixed(1)}%`, sub: `${data.totals.reply.toLocaleString()} replies`, tone: "text-[#0a8f5a]" },
    { icon: Target, label: "Interested", value: data.totals.interested.toLocaleString(), sub: `${data.rates.interestedRate.toFixed(1)}% of replies`, tone: "text-[#b7791f]" },
    { icon: XCircle, label: "Bounce Rate", value: `${data.rates.bounceRate.toFixed(1)}%`, sub: `${data.totals.bounce.toLocaleString()} bounces`, tone: "text-[#ef4444]" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[#66728a]">
          Source: <span className="font-bold text-[#34445f]">{data.source === "overview" ? "GET /analytics/overview" : "Per-campaign fallback"}</span>
          {" · "}Updated {new Date(data.fetchedAt).toLocaleTimeString()}
        </div>
        <button onClick={() => void load(true)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 py-1.5 text-xs font-bold text-[#174be8] disabled:opacity-60">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-[#e7edf5] bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef4ff] text-[#174be8]"><Icon size={17} /></div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold text-[#34445f]">{k.label}</div>
                  <div className={`text-[21px] font-black leading-6 ${k.tone}`}>{k.value}</div>
                  <div className="truncate text-[11px] font-bold text-[#66728a]">{k.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e7edf5] bg-white p-3">
          <div className="mb-2 text-sm font-black">Sends, Opens, Replies by Campaign</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sendsByCampaign} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f8" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Sent" stroke="#174be8" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Opens" stroke="#0a8f5a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Replies" stroke="#b7791f" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#e7edf5] bg-white p-3">
          <div className="mb-2 text-sm font-black">Reply Funnel</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f8" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#174be8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e7edf5] bg-white">
        <div className="border-b border-[#edf2f8] p-3 text-sm font-black">Per-Campaign Performance</div>
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[#edf2f8] text-[9px] uppercase text-[#8794ab]">
              <th className="py-2 pl-3">Campaign</th>
              <th>Status</th>
              <th className="text-right">Sent</th>
              <th className="text-right">Opens</th>
              <th className="text-right">Open %</th>
              <th className="text-right">Replies</th>
              <th className="text-right">Reply %</th>
              <th className="text-right">Interested</th>
              <th className="pr-3 text-right">Bounces</th>
            </tr>
          </thead>
          <tbody>
            {data.perCampaign.map((c) => (
              <tr key={c.id} className="border-b border-[#edf2f8] last:border-b-0">
                <td className="py-2 pl-3 font-bold">{c.name}</td>
                <td className="text-[#526078]">{c.status ?? "—"}</td>
                <td className="text-right">{c.sent_count.toLocaleString()}</td>
                <td className="text-right">{c.open_count.toLocaleString()}</td>
                <td className="text-right">{pct(c.open_count, c.sent_count).toFixed(1)}%</td>
                <td className="text-right">{c.reply_count.toLocaleString()}</td>
                <td className="text-right">{pct(c.reply_count, c.sent_count).toFixed(1)}%</td>
                <td className="text-right">{c.interested_count.toLocaleString()}</td>
                <td className="pr-3 text-right">{c.bounce_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
