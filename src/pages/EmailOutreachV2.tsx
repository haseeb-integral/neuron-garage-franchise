import { useEffect, useMemo, useState, type ReactNode } from "react";

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

import { ReplyTriagePanel } from "@/components/email-outreach/ReplyTriagePanel";
import { AskAssistant } from "@/components/ask/AskAssistant";
import { syncAndGetRealCampaigns } from "@/lib/smartleadCampaigns";
import { getAnalyticsCachedOrFresh, type Aggregated } from "@/lib/smartleadAnalytics";
import { ScopeSwitcher, readStoredScope, writeStoredScope, type PoolScope } from "@/components/email-outreach/ScopeSwitcher";
import { StatStripCards } from "@/components/email-outreach/StatStripCards";
import { PushToSmartLeadBanner } from "@/components/email-outreach/PushToSmartLeadBanner";

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

import { Section } from "@/components/email-outreach/Section";

export default function EmailOutreachV2() {
  
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [batchesRefresh, setBatchesRefresh] = useState(0);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  // Live SmartLead campaigns (replaces hardcoded mock data — Phase 1a)
  const [campaigns, setCampaigns] = useState<SLCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  // Live queue + analytics counts (replaces hardcoded zeros — May 20, 2026)
  const [queueCounts, setQueueCounts] = useState<{ inOutreach: number; promoted: number } | null>(null);
  const [analytics, setAnalytics] = useState<Aggregated | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // v1.2 — scope toggle between Master Teacher DB and SmartLead
  const [scope, setScope] = useState<PoolScope>(() => readStoredScope());
  const [masterTotal, setMasterTotal] = useState<number | null>(null);
  const [smartleadTotal, setSmartleadTotal] = useState<number | null>(null);
  const [verifiedInMaster, setVerifiedInMaster] = useState<number | null>(null);
  const handleScopeChange = (s: PoolScope) => { setScope(s); writeStoredScope(s); };

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
    try {
      setAnalyticsError(null);
      const agg = await getAnalyticsCachedOrFresh(opts?.forceFresh ? 0 : undefined);
      setAnalytics(agg);
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { loadCampaigns(); loadStats(); }, []);

  // Pre-fetch BOTH scope totals so the ScopeSwitcher always shows the inactive pool's count too.
  useEffect(() => {
    (async () => {
      try {
        const [{ count: masterCount }, { data: pushedRows }, { count: verified }] = await Promise.all([
          supabase.from("teacher_prospects").select("*", { count: "exact", head: true }),
          supabase.from("outreach_queue").select("teacher_prospect_id").not("pushed_at", "is", null),
          supabase.from("teacher_prospects").select("*", { count: "exact", head: true }).eq("verification_status", "valid"),
        ]);
        setMasterTotal(masterCount ?? 0);
        const unique = new Set((pushedRows ?? []).map((r) => r.teacher_prospect_id));
        setSmartleadTotal(unique.size);
        setVerifiedInMaster(verified ?? 0);
      } catch {
        // non-fatal — switcher just shows "—"
      }
    })();
  }, []);

  const safeToast = (message: string) => toast.info(message);

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
    <AskAssistant screen="email" />
    <div className="mb-2 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-black tracking-tight">Email Outreach</h1>
        <p className="mt-0.5 text-xs text-[#526078]">
          Work top to bottom — replies first, campaigns next, setup at the end.
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

    {/* Stat strip — compact */}
    <div className="mb-3 grid gap-1.5 md:grid-cols-3 xl:grid-cols-6">
      {stats.map(({ Icon, label, value, sub, tone, loading, error }) => (
        <Card key={label} className="px-2.5 py-1.5">
          <div className="flex items-center gap-2" title={error ?? undefined}>
            <IconBox tone={tone}><Icon size={14} /></IconBox>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">{label}</div>
              {loading ? (
                <div className="my-0.5 h-4 w-10 animate-pulse rounded bg-[#edf2f8]" aria-label={`${label} loading`} />
              ) : error ? (
                <div className="text-[17px] font-black leading-5 text-[#b7791f]" title={error}>—</div>
              ) : (
                <div className="text-[17px] font-black leading-5">{value}</div>
              )}
              {loading ? (
                <div className="mt-0.5 h-2.5 w-16 animate-pulse rounded bg-[#edf2f8]" />
              ) : (
                <div className="truncate text-[10px] text-[#8794ab]">{sub}</div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>

    {/* SECTION 1 — Act on replies */}
    <Section step={1} title="Act on replies" subtitle="Reply here first. Approve or skip each one." storageKey="replies" defaultOpen>
      <ReplyTriagePanel />
    </Section>

    {/* SECTION 2 — Campaigns & sending */}
    <Section step={2} title="Campaigns & sending" subtitle="Your live campaigns and outbox." storageKey="campaigns" defaultOpen>
      {campaignsLoading ? (
        <Card className="flex items-center justify-center py-10 text-sm text-[#526078]">Loading campaigns from SmartLead…</Card>
      ) : campaignsError ? (
        <Card className="p-4 text-sm text-[#ef4444]">
          <div className="font-bold">Could not load campaigns</div>
          <div className="mt-1 text-xs">{campaignsError}</div>
          <button onClick={loadCampaigns} className="mt-2 rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#174be8]">Retry</button>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4ff] text-[#174be8]"><Mail size={20} /></div>
          <h3 className="text-sm font-black">No campaigns yet</h3>
          <p className="mt-1 max-w-md text-xs text-[#526078]">Create your first campaign — use Test Mode to send to your own inbox first.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setNewCampaignOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-3 py-1.5 text-xs font-bold text-white"><Plus size={12} /> New Campaign</button>
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 py-1.5 text-xs font-bold text-[#174be8]"><Upload size={12} /> Upload Test Leads</button>
          </div>
        </Card>
      ) : (
        <SmartLeadCampaignsPanel />
      )}
      <OutreachQueuePanel />
    </Section>

    {/* SECTION 3 — Setup & reference */}
    <Section step={3} title="Setup & reference" subtitle="Mailboxes, imports, full stats. Open when you need them." storageKey="setup" defaultOpen={false}>
      <div className="rounded-xl border border-[#e7edf5] bg-white">
        <button onClick={() => setConnectionOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-left">
          <div className="flex items-center gap-2"><LinkIcon size={13} className="text-[#174be8]" /><span className="text-xs font-black">SmartLead Connection</span><span className="text-[10px] text-[#66728a]">{connectionOpen ? "Hide details" : "Show details"}</span></div>
          <ChevronDown size={14} className={`text-[#526078] transition-transform ${connectionOpen ? "rotate-180" : ""}`} />
        </button>
        {connectionOpen && <div className="border-t border-[#edf2f8] p-4"><SmartLeadConnectionPanel /></div>}
      </div>
      <EmailAccountsPanel />
      <ProspectBatchesPanel refreshKey={batchesRefresh} />
      <AnalyticsPanel />
    </Section>

    <ImportLeadsWizard open={importOpen} onClose={() => setImportOpen(false)} onComplete={() => { setBatchesRefresh((k) => k + 1); loadCampaigns(); loadStats(); }} />
    <NewCampaignDrawer open={newCampaignOpen} onClose={() => setNewCampaignOpen(false)} onCreated={loadCampaigns} />
  </div>;
}
