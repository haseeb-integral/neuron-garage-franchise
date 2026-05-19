import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Info,
  Link as LinkIcon,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Target,
  Trophy,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deriveFitTag } from "@/utils/fitScore";
import { SmartLeadConnectionPanel } from "@/components/email-outreach/SmartLeadConnectionPanel";
import { ImportLeadsWizard } from "@/components/email-outreach/ImportLeadsWizard";
import { ProspectBatchesPanel } from "@/components/email-outreach/ProspectBatchesPanel";
import { AnalyticsPanel } from "@/components/email-outreach/AnalyticsPanel";
import { NewCampaignDrawer } from "@/components/email-outreach/NewCampaignDrawer";
import { EmailAccountsPanel } from "@/components/email-outreach/EmailAccountsPanel";



type CampaignStatus = "Active" | "Draft" | "Paused" | "Complete";
type EmailStatus = "Opened" | "Replied" | "Bounced" | "Queued" | "Sent";
type ReplyStatus = "Interested" | "Meeting Booked" | "Follow-Up Needed" | "No Reply" | "Not Interested";
type Fit = "High" | "Medium" | "Low";

type Campaign = { id: number; name: string; market: string; smartLeadId: string; status: CampaignStatus; prospects: number; sent: number; openRate: string; replyRate: string; replies: number; interested: number; promoted: number; };
type Prospect = { id: number; campaignId: number; initials: string; name: string; school: string; emailStatus: EmailStatus; engagement: string; replyStatus: ReplyStatus; fit: Fit; preview: string; };

const campaigns: Campaign[] = [
  { id: 1, name: "Austin TX — Spring 2026", market: "Austin, TX", smartLeadId: "#4812", status: "Active", prospects: 312, sent: 38, openRate: "52%", replyRate: "10.5%", replies: 4, interested: 2, promoted: 1 },
  { id: 2, name: "Nashville TN — Spring 2026", market: "Nashville, TN", smartLeadId: "#4921", status: "Active", prospects: 298, sent: 32, openRate: "48%", replyRate: "9.4%", replies: 3, interested: 1, promoted: 0 },
  { id: 3, name: "Denver CO — April 2026", market: "Denver, CO", smartLeadId: "#5034", status: "Paused", prospects: 284, sent: 30, openRate: "39%", replyRate: "6.8%", replies: 2, interested: 1, promoted: 0 },
  { id: 4, name: "Frisco TX — May 2026", market: "Frisco, TX", smartLeadId: "Draft", status: "Draft", prospects: 354, sent: 0, openRate: "—", replyRate: "—", replies: 0, interested: 0, promoted: 0 },
];

const prospects: Prospect[] = [
  { id: 1, campaignId: 1, initials: "ER", name: "Emily Rogers", school: "Westwood HS", emailStatus: "Opened", engagement: "2 opens", replyStatus: "Interested", fit: "High", preview: "Hi Neuron Garage team, this sounds interesting..." },
  { id: 2, campaignId: 1, initials: "JM", name: "Jason Miller", school: "Bowie HS", emailStatus: "Replied", engagement: "3 opens + click", replyStatus: "Meeting Booked", fit: "High", preview: "Thanks for reaching out. I can talk this week..." },
  { id: 3, campaignId: 1, initials: "SC", name: "Sarah Chen", school: "Cedar Ridge HS", emailStatus: "Opened", engagement: "1 open", replyStatus: "Follow-Up Needed", fit: "Medium", preview: "I’m interested in learning more later..." },
  { id: 4, campaignId: 1, initials: "DP", name: "David Patel", school: "McNeil HS", emailStatus: "Replied", engagement: "2 opens + click", replyStatus: "No Reply", fit: "Medium", preview: "—" },
  { id: 5, campaignId: 1, initials: "LT", name: "Lisa Thompson", school: "Round Rock HS", emailStatus: "Bounced", engagement: "—", replyStatus: "No Reply", fit: "Low", preview: "—" },
  { id: 6, campaignId: 1, initials: "MW", name: "Michael Ward", school: "Anderson HS", emailStatus: "Queued", engagement: "—", replyStatus: "No Reply", fit: "Low", preview: "—" },
  { id: 7, campaignId: 2, initials: "NW", name: "Nora Wilson", school: "Hillsboro ES", emailStatus: "Replied", engagement: "2 opens", replyStatus: "Interested", fit: "High", preview: "I have been considering a new opportunity..." },
  { id: 8, campaignId: 2, initials: "RB", name: "Ryan Brooks", school: "Meadowlawn ES", emailStatus: "Opened", engagement: "1 open", replyStatus: "No Reply", fit: "Medium", preview: "—" },
  { id: 9, campaignId: 2, initials: "AK", name: "Ava King", school: "Cumberland ES", emailStatus: "Sent", engagement: "not opened", replyStatus: "No Reply", fit: "High", preview: "—" },
  { id: 10, campaignId: 2, initials: "BH", name: "Ben Harris", school: "Franklin Academy", emailStatus: "Opened", engagement: "2 opens", replyStatus: "Follow-Up Needed", fit: "Medium", preview: "Can you send more details?" },
  { id: 11, campaignId: 3, initials: "CP", name: "Clara Price", school: "Aurora STEM", emailStatus: "Replied", engagement: "4 opens", replyStatus: "Interested", fit: "High", preview: "This could be a good fit for me..." },
  { id: 12, campaignId: 3, initials: "GO", name: "Gavin Ortiz", school: "Denver Prep", emailStatus: "Opened", engagement: "1 open", replyStatus: "Not Interested", fit: "Low", preview: "Not the right time for me." },
  { id: 13, campaignId: 3, initials: "ML", name: "Maya Lee", school: "Lincoln ES", emailStatus: "Sent", engagement: "not opened", replyStatus: "No Reply", fit: "Medium", preview: "—" },
  { id: 14, campaignId: 4, initials: "SM", name: "Sarah Mitchell", school: "Frisco Elementary", emailStatus: "Queued", engagement: "—", replyStatus: "No Reply", fit: "High", preview: "Draft prospect, not sent yet." },
  { id: 15, campaignId: 4, initials: "MJ", name: "Marcus Johnson", school: "Pioneer Heritage", emailStatus: "Queued", engagement: "—", replyStatus: "No Reply", fit: "High", preview: "Draft prospect, not sent yet." },
  { id: 16, campaignId: 4, initials: "JP", name: "Jennifer Park", school: "Spears Elementary", emailStatus: "Queued", engagement: "—", replyStatus: "No Reply", fit: "Medium", preview: "Draft prospect, not sent yet." },
];

function Chip({ children, tone = "blue", compact = false }: { children: ReactNode; tone?: "blue" | "green" | "gold" | "red" | "gray" | "purple"; compact?: boolean }) {
  const styles = { blue: "bg-[#eef4ff] text-[#174be8]", green: "bg-[#e6f7ef] text-[#0a8f5a]", gold: "bg-[#fff4df] text-[#b7791f]", red: "bg-[#fff1f1] text-[#ef4444]", gray: "bg-[#eef2f7] text-[#526078]", purple: "bg-[#f2ebff] text-[#7c3aed]" };
  return <span className={`inline-flex items-center rounded-md font-bold ${compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-[11px]"} ${styles[tone]}`}>{children}</span>;
}
function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}>{children}</div>; }
function IconBox({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "gold" | "purple" }) { const styles = { blue: "bg-[#eef4ff] text-[#174be8]", green: "bg-[#e6f7ef] text-[#0a8f5a]", gold: "bg-[#fff4df] text-[#b7791f]", purple: "bg-[#f2ebff] text-[#7c3aed]" }; return <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles[tone]}`}>{children}</div>; }

const statusTone = (status: CampaignStatus) => status === "Active" ? "green" : status === "Draft" ? "blue" : status === "Paused" ? "gold" : "gray";
const emailTone = (status: EmailStatus) => status === "Opened" || status === "Sent" ? "blue" : status === "Replied" ? "green" : status === "Bounced" ? "red" : "gold";
const emailIcon = (status: EmailStatus) => status === "Replied" ? <Send size={14} /> : status === "Bounced" ? <XCircle size={14} /> : status === "Queued" ? <Clock size={14} /> : <Mail size={14} />;
const replyDot = (status: ReplyStatus) => status === "Interested" || status === "Meeting Booked" ? "bg-[#0ea66e]" : status === "Follow-Up Needed" ? "bg-[#f59e0b]" : status === "Not Interested" ? "bg-[#ef4444]" : "bg-[#8794ab]";
const fitTone = (fit: Fit) => fit === "High" ? "green" : fit === "Medium" ? "gold" : "red";
const fitShort = (fit: Fit) => fit === "Medium" ? "Med" : fit;
const scoreFromFit = (fit: Fit) => fit === "High" ? 90 : fit === "Medium" ? 72 : 55;

export default function EmailOutreachV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [tab, setTab] = useState("All Prospects");
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [batchesRefresh, setBatchesRefresh] = useState(0);
  const [view, setView] = useState<"dashboard" | "analytics" | "accounts">("dashboard");
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);




  const [promoted, setPromoted] = useState<Record<number, string>>({});
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const safeToast = (message: string) => toast.info(message);

  const campaignProspects = prospects.filter((p) => p.campaignId === selectedCampaign.id);
  const statusCounts = { Sent: campaignProspects.filter((p) => p.emailStatus === "Sent").length, Opened: campaignProspects.filter((p) => p.emailStatus === "Opened").length, Replied: campaignProspects.filter((p) => p.emailStatus === "Replied").length, Bounced: campaignProspects.filter((p) => p.emailStatus === "Bounced").length, Queued: campaignProspects.filter((p) => p.emailStatus === "Queued").length };
  const replyCounts = { Interested: campaignProspects.filter((p) => p.replyStatus === "Interested").length, "Meeting Booked": campaignProspects.filter((p) => p.replyStatus === "Meeting Booked").length, "Follow-Up Needed": campaignProspects.filter((p) => p.replyStatus === "Follow-Up Needed").length, "No Reply": campaignProspects.filter((p) => p.replyStatus === "No Reply").length, "Not Interested": campaignProspects.filter((p) => p.replyStatus === "Not Interested").length };
  const readyToPromote = replyCounts.Interested + replyCounts["Meeting Booked"];
  const maxCount = Math.max(1, campaignProspects.length);
  const visibleProspects = useMemo(() => {
    const rows = prospects.filter((p) => p.campaignId === selectedCampaign.id);
    if (tab === "Replied") return rows.filter((p) => p.emailStatus === "Replied");
    if (tab === "Interested") return rows.filter((p) => p.replyStatus === "Interested" || p.replyStatus === "Meeting Booked");
    if (tab === "Opened") return rows.filter((p) => p.emailStatus === "Opened" || p.engagement.includes("open"));
    if (tab === "Bounced") return rows.filter((p) => p.emailStatus === "Bounced");
    return rows;
  }, [selectedCampaign.id, tab]);

  const promoteToPipeline = async (p: Prospect) => {
    if (promoted[p.id]) { navigate(`/candidate-pipeline?candidate=${promoted[p.id]}`); return; }
    if (promotingId === p.id) return;
    setPromotingId(p.id);
    const [first_name, ...rest] = p.name.trim().split(/\s+/);
    const last_name = rest.join(" ") || "";
    const state = selectedCampaign.market.split(",").pop()?.trim() || "TX";
    const city = selectedCampaign.market.split(",")[0]?.trim() || "";
    const fitScore = scoreFromFit(p.fit);
    const { data: inserted, error } = await supabase.from("candidates").insert({ prospect_id: null, first_name, last_name, email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@school.edu`, city, state, current_stage: "new_lead", fit_score: fitScore, fit_tag: deriveFitTag(fitScore), status: "active", assigned_to: user?.email ?? null }).select("id").single();
    if (error || !inserted) { setPromotingId(null); toast.error(`Could not promote ${p.name}: ${error?.message ?? "Failed to promote"}`); return; }
    await supabase.from("candidate_stage_history").insert({ candidate_id: inserted.id, from_stage: null, to_stage: "new_lead", changed_by: user?.email ?? null, notes: `Promoted from Email Outreach campaign: ${selectedCampaign.name}` });
    setPromoted((prev) => ({ ...prev, [p.id]: inserted.id }));
    setPromotingId(null);
    toast.success("Promoted to Candidate Pipeline", { description: `${p.name} is now in Lead Generated.`, action: { label: "View Pipeline", onClick: () => navigate(`/candidate-pipeline?candidate=${inserted.id}`) } });
  };

  return <div className="min-h-screen bg-white text-[#07142f]">
    <div className="mb-3 flex items-center justify-between gap-4"><div className="relative w-full max-w-[520px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8794ab]" /><input className="h-10 w-full rounded-xl border border-[#dbe4f2] bg-white pl-10 pr-4 text-sm outline-none placeholder:text-[#8794ab]" placeholder="Search campaigns, prospects, schools, cities..." /></div><div className="hidden items-center gap-3 lg:flex"><button className="rounded-full border border-[#e7edf5] p-2 text-[#526078]"><AlertCircle size={18} /></button><div className="flex items-center gap-3 rounded-xl border border-[#e7edf5] px-3 py-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white">H</div><div className="leading-tight"><div className="text-sm font-bold">Haseeb</div><div className="text-[11px] text-[#66728a]">ADMIN</div></div></div></div></div>
    <div className="mb-3 flex items-start justify-between gap-4"><div className="min-w-0"><h1 className="text-[26px] font-black tracking-tight">Email Outreach</h1><p className="mt-1 text-sm text-[#526078]">Manage teacher prospect outreach campaigns and move interested replies into the candidate pipeline.</p></div><div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2 pt-1"><button onClick={() => safeToast("Sample CSV export prepared. Live exports will use synced campaign data.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#07142f]"><Download size={14} /> CSV</button><button onClick={() => safeToast("Sample replies synced. SmartLead or GHL sync will connect later.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#07142f]"><RefreshCw size={14} /> Sync Replies</button><button onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8]"><Upload size={14} /> Import Leads</button><button onClick={() => setNewCampaignOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#174be8] px-3 text-xs font-bold text-white"><Plus size={14} /> Campaign</button></div></div>
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

    <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">{[[Mail, "Active Campaigns", "4", "Across 4 cities", "blue"], [Users, "Prospects in Outreach", "1,248", "+128 this week", "purple"], [Send, "Open Rate", "42.6%", "+6.3 pp", "green"], [Reply, "Replies", "186", "14.9% reply rate", "green"], [Target, "Interested Leads", "58", "31.2% of replies", "gold"], [Mail, "Promoted to Pipeline", 23 + Object.keys(promoted).length, "+8 this week", "blue"]].map(([Icon, label, value, sub, tone]) => { const IconCmp = Icon as React.ComponentType<{ size?: number }>; return <Card key={label as string} className="px-3 py-2.5"><div className="flex items-center gap-2"><IconBox tone={tone as "blue" | "green" | "gold" | "purple"}><IconCmp size={17} /></IconBox><div className="min-w-0"><div className="truncate text-[11px] font-bold text-[#34445f]">{label as string}</div><div className="text-[21px] font-black leading-6">{value as string | number}</div><div className="truncate text-[11px] font-bold text-[#0a8f5a]">{sub as string}</div></div></div></Card>; })}</div>
    <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_250px]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-[#edf2f8] p-3"><h2 className="text-base font-black">Campaigns</h2><button onClick={() => safeToast("New campaign setup is sample-only in this preview.")} className="text-xs font-bold text-[#174be8]">+ New</button></div><div className="divide-y divide-[#edf2f8]">{campaigns.map((campaign) => { const active = selectedCampaign.id === campaign.id; return <button key={campaign.id} onClick={() => { setSelectedCampaign(campaign); setTab("All Prospects"); setSelectedProspect(null); }} className={`block w-full px-3 py-3 text-left transition hover:bg-[#f8fbff] ${active ? "bg-[#f8fbff]" : "bg-white"}`}><div className="mb-1 flex items-start justify-between gap-2"><div className="text-[13px] font-black">{campaign.name}</div><Chip tone={statusTone(campaign.status) as "blue" | "green" | "gold" | "gray"}>{campaign.status}</Chip></div><div className="mb-2 flex items-center gap-1 text-[11px] text-[#526078]"><MapPin size={11} className="text-[#ef4444]" /> {campaign.market}</div><div className="grid grid-cols-4 gap-1 text-center"><div><div className="text-xs font-black">{campaign.prospects}</div><div className="text-[9px] text-[#526078]">Prospects</div></div><div><div className="text-xs font-black">{campaign.openRate}</div><div className="text-[9px] text-[#526078]">Open</div></div><div><div className="text-xs font-black">{campaign.replies}</div><div className="text-[9px] text-[#526078]">Replies</div></div><div><div className="text-xs font-black">{campaign.interested}</div><div className="text-[9px] text-[#526078]">Interest</div></div></div></button>; })}</div><div className="p-3 text-center"><button className="text-xs font-bold text-[#174be8]">View all campaigns →</button></div></Card>
      <Card className="overflow-hidden"><div className="border-b border-[#edf2f8] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black">{selectedCampaign.name}</h2><Chip tone={statusTone(selectedCampaign.status) as "blue" | "green" | "gold" | "gray"}>{selectedCampaign.status}</Chip></div><div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#526078]"><span className="flex items-center gap-1"><MapPin size={12} /> {selectedCampaign.market}</span><span className="flex items-center gap-1"><CalendarDays size={12} /> Apr 28, 2025</span><span className="flex items-center gap-1"><LinkIcon size={12} /> SmartLead {selectedCampaign.smartLeadId}</span></div></div><div className="flex flex-wrap gap-2"><button onClick={() => safeToast("This would open the connected campaign in SmartLead.")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-3 text-[11px] font-bold text-[#174be8]">Open in SmartLead <ExternalLink size={12} /></button><button onClick={() => safeToast("Sample replies synced. Live SmartLead/GHL sync will connect later.")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-3 text-[11px] font-bold text-[#174be8]"><RefreshCw size={12} /> Sync Replies</button><button onClick={() => safeToast("Selected prospects would be pushed to the selected outreach campaign.")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-3 text-[11px] font-bold text-[#174be8]"><Upload size={12} /> Import Prospects</button></div></div><div className="mt-3 flex items-center gap-2 rounded-lg border border-[#dbe4f2] bg-[#fbfdff] px-3 py-2 text-xs text-[#526078]"><Info size={14} className="text-[#174be8]" /><span><b>Outreach is managed in SmartLead.</b> Use this dashboard to open the platform, sync replies, import prospects, and promote interested leads.</span></div><div className="mt-3 grid grid-cols-3 gap-0 rounded-xl border border-[#edf2f8] bg-white md:grid-cols-6">{[["SENT", selectedCampaign.sent], ["OPEN RATE", selectedCampaign.openRate], ["REPLY RATE", selectedCampaign.replyRate], ["REPLIES", selectedCampaign.replies], ["INTERESTED", selectedCampaign.interested], ["PROMOTED", selectedCampaign.promoted + Object.keys(promoted).length]].map(([label, value]) => <div key={label} className="border-r border-[#edf2f8] px-3 py-2 last:border-r-0"><div className="text-[9px] font-bold text-[#8794ab]">{label}</div><div className={`mt-0.5 text-base font-black ${String(label).includes("RATE") || label === "INTERESTED" ? "text-[#0a8f5a]" : "text-[#07142f]"}`}>{value}</div></div>)}</div><div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center rounded-xl border border-[#edf2f8] px-3 py-3">{[["Day 1", "Cold Outreach"], ["Day 3", "Follow-Up 1"], ["Day 7", "Final Follow-Up"]].map((item, idx) => <div key={item[0]} className={`flex items-center gap-2 ${idx === 0 ? "justify-start" : idx === 1 ? "justify-center" : "justify-end"}`}><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dbe4f2] bg-[#eef4ff] text-[#174be8]"><Mail size={15} /></div><div><div className="text-xs font-black">{item[0]}</div><div className="text-xs text-[#526078]">{item[1]}</div></div></div>).flatMap((node, idx) => idx < 2 ? [node, <div key={`line-${idx}`} className="h-px border-t border-dashed border-[#cbd5e1]" />] : [node])}</div></div><div className="px-3 pt-2"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-4 text-xs font-bold">{[["All Prospects", campaignProspects.length], ["Replied", statusCounts.Replied], ["Interested", readyToPromote], ["Opened", statusCounts.Opened], ["Bounced", statusCounts.Bounced]].map(([name, count]) => <button key={name} onClick={() => setTab(String(name))} className={`pb-1.5 ${tab === name ? "border-b-2 border-[#174be8] text-[#174be8]" : "text-[#526078]"}`}>{name} <span className="ml-1 rounded-full bg-[#eef4ff] px-1.5 text-[10px] text-[#174be8]">{count}</span></button>)}</div><button className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold">Filter</button></div></div><div className="px-3 pb-3"><table className="w-full table-fixed text-left text-[11px]"><thead><tr className="border-y border-[#edf2f8] text-[9px] uppercase text-[#8794ab]"><th className="w-[18%] py-2">Teacher</th><th className="w-[12%]">School</th><th className="w-[12%]">Email Status</th><th className="w-[10%]">Engage</th><th className="w-[13%]">Reply</th><th className="w-[6%]">Fit</th><th className="w-[16%]">Preview</th><th className="w-[13%] text-right">Action</th></tr></thead><tbody>{visibleProspects.map((p) => { const isPromoted = Boolean(promoted[p.id]); return <tr key={p.id} onClick={() => setSelectedProspect(p)} className={`cursor-pointer border-b border-[#edf2f8] hover:bg-[#f8fbff] ${isPromoted ? "bg-[#fbfdff]" : ""}`}><td className="py-2"><div className="flex items-center gap-2"><div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[10px] font-black text-[#174be8]">{p.initials}</div><div className="min-w-0"><div className="truncate font-bold">{p.name}</div><div className="truncate text-[10px] text-[#8794ab]">{p.name.toLowerCase().replace(/\s+/g, ".")}@school.edu</div></div></div></td><td className="truncate text-[#34445f]">{p.school}</td><td><span className={`inline-flex items-center gap-1 truncate font-semibold ${emailTone(p.emailStatus) === "green" ? "text-[#0a8f5a]" : emailTone(p.emailStatus) === "red" ? "text-[#ef4444]" : emailTone(p.emailStatus) === "gold" ? "text-[#b7791f]" : "text-[#174be8]"}`}>{emailIcon(p.emailStatus)} {p.emailStatus}</span></td><td className="truncate text-[#34445f]">{p.engagement}</td><td>{isPromoted ? <Chip tone="gray" compact>Promoted</Chip> : <span className="flex items-center gap-1.5 truncate text-[#34445f]"><span className={`h-2 w-2 flex-shrink-0 rounded-full ${replyDot(p.replyStatus)}`} />{p.replyStatus === "Meeting Booked" ? "Booked" : p.replyStatus}</span>}</td><td><Chip tone={fitTone(p.fit) as "green" | "gold" | "red"} compact>{fitShort(p.fit)}</Chip></td><td className="truncate text-[#526078]">{p.preview}</td><td className="text-right">{isPromoted ? <button onClick={(e) => { e.stopPropagation(); navigate(`/candidate-pipeline?candidate=${promoted[p.id]}`); }} className="rounded-md border border-[#dbe4f2] px-2 py-1.5 text-[10px] font-bold text-[#174be8]">View Pipeline</button> : p.replyStatus === "Interested" || p.replyStatus === "Meeting Booked" ? <button disabled={promotingId === p.id} onClick={(e) => { e.stopPropagation(); promoteToPipeline(p); }} className="rounded-md bg-[#174be8] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-60">{promotingId === p.id ? "Promoting..." : "Promote"}</button> : p.replyStatus === "Follow-Up Needed" || p.emailStatus === "Replied" ? <button onClick={(e) => { e.stopPropagation(); safeToast(`Sample follow-up would be queued for ${p.name}.`); }} className="rounded-md border border-[#dbe4f2] px-2 py-1.5 text-[10px] font-bold text-[#174be8]">Follow Up</button> : <button onClick={(e) => { e.stopPropagation(); setSelectedProspect(p); }} className="rounded-md border border-[#dbe4f2] px-2 py-1.5 text-[10px] font-bold text-[#174be8]">Details</button>}</td></tr>; })}</tbody></table><div className="flex items-center justify-between pt-2 text-[11px] text-[#526078]"><span>Showing {visibleProspects.length} of {campaignProspects.length} prospects</span><div className="flex items-center gap-1"><button className="rounded-md border border-[#dbe4f2] p-1.5"><ChevronLeft size={13} /></button><button className="rounded-md bg-[#174be8] px-2.5 py-1.5 font-bold text-white">1</button><button className="rounded-md border border-[#dbe4f2] px-2.5 py-1.5 font-bold">2</button><button className="rounded-md border border-[#dbe4f2] p-1.5"><ChevronRight size={13} /></button></div></div></div></Card>
      <Card className="overflow-hidden"><div className="border-b border-[#edf2f8] p-3"><h2 className="text-base font-black">Outreach Insights</h2><p className="text-[11px] text-[#66728a]">{selectedCampaign.market} campaign overview</p></div><div className="space-y-3 p-3"><Card className="p-3"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase text-[#174be8]">Selected Campaign</div><div className="mt-1 text-sm font-black">{selectedCampaign.name}</div><div className="mt-1 text-[11px] text-[#0a8f5a]">{selectedCampaign.openRate} open • {selectedCampaign.replyRate} reply</div></div><IconBox tone="gold"><Trophy size={16} /></IconBox></div></Card><Card className="p-3"><div className="mb-2 text-sm font-black">Email Status Breakdown</div>{Object.entries(statusCounts).map(([label, num]) => <div key={label} className="mb-2 grid grid-cols-[50px_1fr_20px] items-center gap-2 text-[11px]"><span>{label}</span><div className="h-1.5 rounded-full bg-[#edf2f8]"><div className="h-1.5 rounded-full bg-[#174be8]" style={{ width: `${Math.max(8, (num / maxCount) * 100)}%` }} /></div><span className="text-right font-bold">{num}</span></div>)}</Card><Card className="p-3"><div className="mb-2 text-sm font-black">Reply Status Breakdown</div>{Object.entries(replyCounts).map(([label, num]) => <div key={label} className="mb-1.5 flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5">{label === "Interested" ? <CheckCircle2 size={12} className="text-[#0a8f5a]" /> : label === "Meeting Booked" ? <CalendarDays size={12} className="text-[#0a8f5a]" /> : label === "Follow-Up Needed" ? <Clock size={12} className="text-[#b7791f]" /> : label === "Not Interested" ? <XCircle size={12} className="text-[#ef4444]" /> : <span className="h-3 w-3 rounded-full bg-[#8794ab]" />} {label}</span><span className="font-bold">{num}</span></div>)}</Card><Card className="border-[#d5f2df] bg-[#f4fff8] p-3"><div className="flex gap-2"><IconBox tone="green"><Target size={16} /></IconBox><div><div className="text-sm font-black">Recommended Next Step</div><p className="mt-1 text-xs text-[#34445f]">{readyToPromote} interested leads are ready to move to the pipeline.</p><button onClick={() => visibleProspects.filter((p) => p.replyStatus === "Interested" || p.replyStatus === "Meeting Booked").forEach(promoteToPipeline)} className="mt-2 w-full rounded-lg bg-[#0ea66e] px-3 py-2 text-xs font-bold text-white">Promote {readyToPromote} to Pipeline</button></div></div></Card></div></Card>
    </div>
    </>}
    {view === "analytics" && <div className="mb-4"><AnalyticsPanel /></div>}
    {view === "accounts" && <div className="mb-4"><EmailAccountsPanel /></div>}
    <div className="mt-4"><ProspectBatchesPanel refreshKey={batchesRefresh} /></div>
    <ImportLeadsWizard open={importOpen} onClose={() => setImportOpen(false)} onComplete={() => setBatchesRefresh((k) => k + 1)} />

    {selectedProspect && <div className="fixed inset-0 z-50 flex justify-end bg-black/35" onClick={() => setSelectedProspect(null)}><aside className="h-full w-full max-w-[430px] overflow-y-auto border-l border-[#e7edf5] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#edf2f8] bg-white px-5 py-5"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dbe7ff] text-sm font-black text-[#174be8]">{selectedProspect.initials}</div><div><h2 className="text-xl font-black">{selectedProspect.name}</h2><p className="text-sm text-[#526078]">{selectedProspect.school}</p><p className="text-xs text-[#8794ab]">{selectedCampaign.market} • {selectedCampaign.name}</p></div></div><button onClick={() => setSelectedProspect(null)} className="rounded-full p-1 text-[#526078] hover:bg-[#f7faff]"><X size={20} /></button></div><div className="space-y-4 p-5"><Card className="p-4"><div className="mb-3 text-xs font-black uppercase text-[#8794ab]">Outreach Status</div><div className="grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs font-bold text-[#8794ab]">Email Status</div><div className="mt-1 font-bold">{selectedProspect.emailStatus}</div></div><div><div className="text-xs font-bold text-[#8794ab]">Engagement</div><div className="mt-1 font-bold">{selectedProspect.engagement}</div></div><div><div className="text-xs font-bold text-[#8794ab]">Reply Status</div><div className="mt-1 font-bold">{selectedProspect.replyStatus}</div></div><div><div className="text-xs font-bold text-[#8794ab]">Fit</div><div className="mt-1"><Chip tone={fitTone(selectedProspect.fit) as "green" | "gold" | "red"} compact>{fitShort(selectedProspect.fit)}</Chip></div></div></div></Card><Card className="p-4"><div className="mb-3 text-xs font-black uppercase text-[#8794ab]">Campaign Record</div><div className="space-y-2 text-sm text-[#34445f]"><p><b>Campaign:</b> {selectedCampaign.name}</p><p><b>Engine:</b> SmartLead {selectedCampaign.smartLeadId}</p><p><b>Market:</b> {selectedCampaign.market}</p><p><b>Email:</b> {selectedProspect.name.toLowerCase().replace(/\s+/g, ".")}@school.edu</p></div></Card><Card className="p-4"><div className="mb-2 text-xs font-black uppercase text-[#8794ab]">Reply Preview</div><p className="rounded-lg border border-[#edf2f8] bg-[#fbfdff] p-3 text-sm text-[#34445f]">{selectedProspect.preview}</p></Card><Card className="p-4"><div className="mb-2 text-xs font-black uppercase text-[#8794ab]">Internal Notes</div><textarea className="min-h-[90px] w-full rounded-lg border border-[#dbe4f2] p-3 text-sm outline-none placeholder:text-[#8794ab]" placeholder="Add outreach notes..." /></Card><div className="grid grid-cols-2 gap-2"><button onClick={() => safeToast("This would open the matching SmartLead contact/campaign record.")} className="rounded-lg border border-[#dbe4f2] px-3 py-2 text-sm font-bold text-[#174be8]">Open SmartLead</button><button onClick={() => safeToast(`Sample follow-up would be queued for ${selectedProspect.name}.`)} className="rounded-lg border border-[#dbe4f2] px-3 py-2 text-sm font-bold text-[#174be8]">Follow Up</button><button disabled={Boolean(promoted[selectedProspect.id]) || promotingId === selectedProspect.id} onClick={() => promoteToPipeline(selectedProspect)} className="rounded-lg bg-[#174be8] px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{promoted[selectedProspect.id] ? "Promoted ✓" : "Promote to Pipeline"}</button><button onClick={() => safeToast(`${selectedProspect.name} would be marked as not interested.`)} className="rounded-lg border border-[#f5c2c2] px-3 py-2 text-sm font-bold text-[#ef4444]">Not Interested</button></div></div></aside></div>}
  </div>;
}
