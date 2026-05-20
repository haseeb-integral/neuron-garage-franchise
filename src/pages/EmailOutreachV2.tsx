import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronDown,
  Download,
  Link as LinkIcon,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartLeadConnectionPanel } from "@/components/email-outreach/SmartLeadConnectionPanel";
import { SmartLeadCampaignsPanel } from "@/components/email-outreach/SmartLeadCampaignsPanel";
import { ImportLeadsWizard } from "@/components/email-outreach/ImportLeadsWizard";
import { ProspectBatchesPanel } from "@/components/email-outreach/ProspectBatchesPanel";
import { AnalyticsPanel } from "@/components/email-outreach/AnalyticsPanel";
import { NewCampaignDrawer } from "@/components/email-outreach/NewCampaignDrawer";
import { EmailAccountsPanel } from "@/components/email-outreach/EmailAccountsPanel";
import { OutreachQueuePanel } from "@/components/email-outreach/OutreachQueuePanel";
import { SmartLeadInboxPanel } from "@/components/email-outreach/SmartLeadInboxPanel";
import { ReplyTriagePanel } from "@/components/email-outreach/ReplyTriagePanel";
import { syncAndGetRealCampaigns } from "@/lib/smartleadCampaigns";
import { getAnalyticsCachedOrFresh, type Aggregated } from "@/lib/smartleadAnalytics";

type SLCampaign = { id: number | string; name?: string; status?: string; created_at?: string };

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload } });
  if (error) throw new Error(error.message ?? String(error));
  return data;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}>{children}</div>;
}
function IconBox({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "gold" | "purple" }) {
  const styles = { blue: "bg-[#eef4ff] text-[#174be8]", green: "bg-[#e6f7ef] text-[#0a8f5a]", gold: "bg-[#fff4df] text-[#b7791f]", purple: "bg-[#f2ebff] text-[#7c3aed]" };
  return <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles[tone]}`}>{children}</div>;
}

export default function EmailOutreachV2() {
  const navigate = useNavigate();
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [batchesRefresh, setBatchesRefresh] = useState(0);
  const [view, setView] = useState<"dashboard" | "analytics" | "accounts">("dashboard");
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  // Live SmartLead campaigns (replaces hardcoded mock data — Phase 1a)
  const [campaigns, setCampaigns] = useState<SLCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  // Live queue + analytics counts (replaces hardcoded zeros — May 20, 2026)
  const [queueCounts, setQueueCounts] = useState<{ inOutreach: number; promoted: number } | null>(null);
  const [analytics, setAnalytics] = useState<Aggregated | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const res = await callProxy("campaigns/");
      const list = Array.isArray(res) ? res : [];
      setCampaigns(list);
      void syncAndGetRealCampaigns();
    } catch (e) {
      setCampaignsError(e instanceof Error ? e.message : String(e));
    } finally {
      setCampaignsLoading(false);
    }
  };

  const loadStats = async (opts?: { forceFresh?: boolean }) => {
    // Queue counts — always works (local DB)
    try {
      const { data: q } = await supabase.from("outreach_queue").select("state");
      const rows = q ?? [];
      setQueueCounts({
        inOutreach: rows.filter((r) => ["queued", "assigned", "sending"].includes(r.state)).length,
        promoted: rows.filter((r) => r.state === "promoted").length,
      });
    } catch {
      setQueueCounts({ inOutreach: 0, promoted: 0 });
    }
    // Analytics — SmartLead (cached 10min unless forceFresh)
    try {
      setAnalyticsError(null);
      const agg = await getAnalyticsCachedOrFresh(opts?.forceFresh ? 0 : undefined);
      setAnalytics(agg);
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { loadCampaigns(); loadStats(); }, []);

  const safeToast = (message: string) => toast.info(message);

  // Every card MUST resolve to a live value, a skeleton (loading), or an explicit "—" with tooltip (error).
  // Never ship hardcoded zeros — caught May 20, 2026.
  const stats = useMemo(() => {
    const active = campaigns.filter((c) => (c.status ?? "").toUpperCase() === "ACTIVE" || (c.status ?? "").toUpperCase() === "RUNNING").length;
    const fmtPct = (n: number) => `${n.toFixed(1)}%`;
    const a = analytics;
    const analyticsLoading = !a && !analyticsError;
    const queueLoading = queueCounts === null;
    const ageMin = a?.fetchedAt ? Math.max(0, Math.round((Date.now() - new Date(a.fetchedAt).getTime()) / 60000)) : null;
    const ageLabel = ageMin === null ? "" : ageMin < 1 ? " · just now" : ` · ${ageMin}m ago`;
    return [
      { Icon: Mail, label: "Active Campaigns", value: String(active), sub: campaigns.length ? `of ${campaigns.length} total` : "no campaigns yet", tone: "blue" as const, loading: campaignsLoading, error: null as string | null },
      { Icon: Mail, label: "Prospects in Outreach", value: queueCounts ? String(queueCounts.inOutreach) : "—", sub: "queued + assigned + sending", tone: "purple" as const, loading: queueLoading, error: null as string | null },
      { Icon: Mail, label: "Open Rate", value: a ? fmtPct(a.rates.openRate) : "—", sub: a ? `${a.totals.sent.toLocaleString()} sent${ageLabel}` : (analyticsError ?? "loading SmartLead"), tone: "green" as const, loading: analyticsLoading, error: analyticsError },
      { Icon: Mail, label: "Replies", value: a ? a.totals.reply.toLocaleString() : "—", sub: a ? `${fmtPct(a.rates.replyRate)} reply rate${ageLabel}` : (analyticsError ?? "loading SmartLead"), tone: "green" as const, loading: analyticsLoading, error: analyticsError },
      { Icon: Mail, label: "Interested Leads", value: a ? a.totals.interested.toLocaleString() : "—", sub: a ? `${fmtPct(a.rates.interestedRate)} of replies${ageLabel}` : (analyticsError ?? "loading SmartLead"), tone: "gold" as const, loading: analyticsLoading, error: analyticsError },
      { Icon: Mail, label: "Promoted to Pipeline", value: queueCounts ? String(queueCounts.promoted) : "—", sub: "moved to Candidate Pipeline", tone: "blue" as const, loading: queueLoading, error: null as string | null },
    ];
  }, [campaigns, campaignsLoading, queueCounts, analytics, analyticsError]);

  // Last-updated stamp + auto-refetch on tab refocus
  const [statsLoadedAt, setStatsLoadedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (!campaignsLoading && queueCounts !== null) setStatsLoadedAt(new Date());
  }, [campaignsLoading, queueCounts, analytics]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") { loadCampaigns(); loadStats(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return <div className="min-h-screen bg-white text-[#07142f]">
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="relative w-full max-w-[520px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8794ab]" />
        <input className="h-10 w-full rounded-xl border border-[#dbe4f2] bg-white pl-10 pr-4 text-sm outline-none placeholder:text-[#8794ab]" placeholder="Search campaigns, prospects, schools, cities..." />
      </div>
      <div className="hidden items-center gap-3 lg:flex">
        <button className="rounded-full border border-[#e7edf5] p-2 text-[#526078]"><AlertCircle size={18} /></button>
      </div>
    </div>
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-black tracking-tight">Email Outreach</h1>
        <p className="mt-1 text-sm text-[#526078]">
          Cockpit for SmartLead campaigns. Create, launch, and promote interested replies into the candidate pipeline.
          {statsLoadedAt && <span className="ml-1 text-[#8794ab]">· updated {statsLoadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2 pt-1">
        <button onClick={() => safeToast("CSV export will be wired to real campaign data.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#07142f]"><Download size={14} /> CSV</button>
        <button onClick={() => { loadCampaigns(); loadStats({ forceFresh: true }); }} title="Bypass 10-min analytics cache" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#07142f]"><RefreshCw size={14} /> Refresh</button>
        <button onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8]"><Upload size={14} /> Import Leads</button>
        <button onClick={() => setNewCampaignOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#174be8] px-3 text-xs font-bold text-white"><Plus size={14} /> Campaign</button>
      </div>
    </div>

    <div className="mb-3 flex items-center gap-1 border-b border-[#edf2f8]">
      {(["dashboard", "analytics", "accounts"] as const).map((v) => (
        <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-xs font-bold capitalize ${view === v ? "border-b-2 border-[#174be8] text-[#174be8]" : "text-[#526078]"}`}>
          {v === "accounts" ? "Email Accounts" : v}
        </button>
      ))}
    </div>

    <div className="mb-4 rounded-xl border border-[#e7edf5] bg-white">
      <button onClick={() => setConnectionOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2"><LinkIcon size={14} className="text-[#174be8]" /><span className="text-sm font-black">SmartLead Connection</span><span className="text-[11px] text-[#66728a]">{connectionOpen ? "Hide details" : "Show details"}</span></div>
        <ChevronDown size={16} className={`text-[#526078] transition-transform ${connectionOpen ? "rotate-180" : ""}`} />
      </button>
      {connectionOpen && <div className="border-t border-[#edf2f8] p-4"><SmartLeadConnectionPanel /></div>}
    </div>

    {view === "dashboard" && <>
      <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ Icon, label, value, sub, tone, loading, error }) => (
          <Card key={label} className="px-3 py-2.5" >
            <div className="flex items-center gap-2" title={error ?? undefined}>
              <IconBox tone={tone}><Icon size={17} /></IconBox>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-bold text-[#34445f]">{label}</div>
                {loading ? (
                  <div className="my-1 h-5 w-12 animate-pulse rounded bg-[#edf2f8]" aria-label={`${label} loading`} />
                ) : error ? (
                  <div className="text-[21px] font-black leading-6 text-[#b7791f]" title={error}>—</div>
                ) : (
                  <div className="text-[21px] font-black leading-6">{value}</div>
                )}
                {loading ? (
                  <div className="h-3 w-20 animate-pulse rounded bg-[#edf2f8]" />
                ) : (
                  <div className="truncate text-[11px] font-bold text-[#8794ab]">{sub}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {campaignsLoading ? (
        <Card className="flex items-center justify-center py-16 text-sm text-[#526078]">Loading campaigns from SmartLead…</Card>
      ) : campaignsError ? (
        <Card className="p-6 text-sm text-[#ef4444]">
          <div className="font-bold">Could not load campaigns</div>
          <div className="mt-1 text-xs">{campaignsError}</div>
          <button onClick={loadCampaigns} className="mt-3 rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#174be8]">Retry</button>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-[#174be8]"><Mail size={26} /></div>
          <h3 className="text-lg font-black">No campaigns yet</h3>
          <p className="mt-1 max-w-md text-sm text-[#526078]">Create your first campaign — use Test Mode to send to your own inbox first so nothing reaches real teachers until you flip the switch.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setNewCampaignOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-4 py-2 text-xs font-bold text-white"><Plus size={14} /> New Campaign</button>
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-4 py-2 text-xs font-bold text-[#174be8]"><Upload size={14} /> Upload Test Leads</button>
          </div>
        </Card>
      ) : (
        <SmartLeadCampaignsPanel />
      )}
    </>}

    {view === "analytics" && <div className="mb-4"><AnalyticsPanel /></div>}
    {view === "accounts" && <div className="mb-4"><EmailAccountsPanel /></div>}

    <div className="mt-4"><SmartLeadInboxPanel /></div>
    <div className="mt-4"><ReplyTriagePanel /></div>
    <div className="mt-4"><OutreachQueuePanel /></div>
    <div className="mt-4"><ProspectBatchesPanel refreshKey={batchesRefresh} /></div>

    <ImportLeadsWizard open={importOpen} onClose={() => setImportOpen(false)} onComplete={() => { setBatchesRefresh((k) => k + 1); loadCampaigns(); loadStats(); }} />
    <NewCampaignDrawer open={newCampaignOpen} onClose={() => setNewCampaignOpen(false)} onCreated={loadCampaigns} />
  </div>;
}
