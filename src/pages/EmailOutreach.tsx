import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, Info, Link as LinkIcon, Mail, MapPin, MoreVertical, Plus, RefreshCw, Reply, Search, Send, Target, Trophy, Upload, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

type CampaignStatus = "Active" | "Draft" | "Paused" | "Complete";
type EmailStatus = "Opened" | "Replied" | "Bounced" | "Queued" | "Sent";
type ReplyStatus = "Interested" | "Meeting Booked" | "Follow-Up Needed" | "No Reply" | "Not Interested";
type Fit = "High" | "Medium" | "Low";

type Campaign = {
  id: number;
  name: string;
  market: string;
  smartLeadId: string;
  status: CampaignStatus;
  prospects: number;
  sent: number;
  openRate: string;
  replyRate: string;
  replies: number;
  interested: number;
  promoted: number;
};

type Prospect = {
  id: number;
  campaignId: number;
  initials: string;
  name: string;
  school: string;
  emailStatus: EmailStatus;
  engagement: string;
  replyStatus: ReplyStatus;
  fit: Fit;
  preview: string;
};

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

function Chip({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "gold" | "red" | "gray" | "purple" }) {
  const styles = {
    blue: "bg-[#eef4ff] text-[#174be8]",
    green: "bg-[#e6f7ef] text-[#0a8f5a]",
    gold: "bg-[#fff4df] text-[#b7791f]",
    red: "bg-[#fff1f1] text-[#ef4444]",
    gray: "bg-[#eef2f7] text-[#526078]",
    purple: "bg-[#f2ebff] text-[#7c3aed]",
  };
  return <span className={`inline-flex h-6 max-w-full items-center rounded-md px-2 text-[11px] font-bold ${styles[tone]}`}>{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}>{children}</div>;
}

function IconBox({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "gold" | "purple" }) {
  const styles = {
    blue: "bg-[#eef4ff] text-[#174be8]",
    green: "bg-[#e6f7ef] text-[#0a8f5a]",
    gold: "bg-[#fff4df] text-[#b7791f]",
    purple: "bg-[#f2ebff] text-[#7c3aed]",
  };
  return <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles[tone]}`}>{children}</div>;
}

const statusTone = (status: CampaignStatus) => status === "Active" ? "green" : status === "Draft" ? "blue" : status === "Paused" ? "gold" : "gray";
const emailTone = (status: EmailStatus) => status === "Opened" || status === "Sent" ? "blue" : status === "Replied" ? "green" : status === "Bounced" ? "red" : "gold";
const replyDot = (status: ReplyStatus) => status === "Interested" || status === "Meeting Booked" ? "bg-[#0ea66e]" : status === "Follow-Up Needed" ? "bg-[#f59e0b]" : status === "Not Interested" ? "bg-[#ef4444]" : "bg-[#8794ab]";
const replyText = (status: ReplyStatus) => status === "Meeting Booked" ? "Booked" : status === "Follow-Up Needed" ? "Follow-Up" : status;
const fitTone = (fit: Fit) => fit === "High" ? "green" : fit === "Medium" ? "gold" : "red";

export default function EmailOutreach() {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  const [tab, setTab] = useState("All Prospects");
  const safeToast = (message: string) => toast.info(message);

  const campaignProspects = prospects.filter((p) => p.campaignId === selectedCampaign.id);
  const statusCounts = {
    Sent: campaignProspects.filter((p) => p.emailStatus === "Sent").length,
    Opened: campaignProspects.filter((p) => p.emailStatus === "Opened").length,
    Replied: campaignProspects.filter((p) => p.emailStatus === "Replied").length,
    Bounced: campaignProspects.filter((p) => p.emailStatus === "Bounced").length,
    Queued: campaignProspects.filter((p) => p.emailStatus === "Queued").length,
  };
  const replyCounts = {
    Interested: campaignProspects.filter((p) => p.replyStatus === "Interested").length,
    "Meeting Booked": campaignProspects.filter((p) => p.replyStatus === "Meeting Booked").length,
    "Follow-Up Needed": campaignProspects.filter((p) => p.replyStatus === "Follow-Up Needed").length,
    "No Reply": campaignProspects.filter((p) => p.replyStatus === "No Reply").length,
    "Not Interested": campaignProspects.filter((p) => p.replyStatus === "Not Interested").length,
  };
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

  return (
    <div className="min-h-screen bg-white text-[#07142f]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-[520px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8794ab]" />
          <input className="h-10 w-full rounded-xl border border-[#dbe4f2] bg-white pl-10 pr-4 text-sm outline-none placeholder:text-[#8794ab]" placeholder="Search campaigns, prospects, schools, cities..." />
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <button className="rounded-full border border-[#e7edf5] p-2 text-[#526078]"><AlertCircle size={18} /></button>
          <div className="flex items-center gap-3 rounded-xl border border-[#e7edf5] px-3 py-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white">H</div><div className="leading-tight"><div className="text-sm font-bold">Haseeb</div><div className="text-[11px] text-[#66728a]">ADMIN</div></div></div>
        </div>
      </div>

      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-black tracking-tight">Email Outreach</h1>
          <p className="mt-1 text-sm text-[#526078]">Manage teacher prospect outreach campaigns and move interested replies into the candidate pipeline.</p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2 pt-1">
          <button onClick={() => safeToast("Sample CSV export prepared. Live exports will use synced campaign data.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#07142f]"><Download size={14} /> CSV</button>
          <button onClick={() => safeToast("Sample replies synced. SmartLead or GHL sync will connect later.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#07142f]"><RefreshCw size={14} /> Sync</button>
          <button onClick={() => safeToast("Selected teacher prospects would be imported into the selected campaign.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8]"><Upload size={14} /> Import</button>
          <button onClick={() => safeToast("Campaign creation is sample-only until SmartLead/GHL is connected.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#174be8] px-3 text-xs font-bold text-white"><Plus size={14} /> Campaign</button>
        </div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[
          [Mail, "Active Campaigns", "4", "Across 4 cities", "blue"],
          [Users, "Prospects in Outreach", "1,248", "+128 this week", "purple"],
          [Send, "Open Rate", "42.6%", "+6.3 pp", "green"],
          [Reply, "Replies", "186", "14.9% reply rate", "green"],
          [Target, "Interested Leads", "58", "31.2% of replies", "gold"],
          [Mail, "Promoted to Pipeline", "23", "+8 this week", "blue"],
        ].map(([Icon, label, value, sub, tone]) => (
          <Card key={label as string} className="px-3 py-2.5">
            <div className="flex items-center gap-2"><IconBox tone={tone as "blue" | "green" | "gold" | "purple"}><Icon size={17} /></IconBox><div className="min-w-0"><div className="truncate text-[11px] font-bold text-[#34445f]">{label as string}</div><div className="text-[21px] font-black leading-6">{value as string}</div><div className="truncate text-[11px] font-bold text-[#0a8f5a]">{sub as string}</div></div></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[275px_minmax(0,1fr)_280px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#edf2f8] p-3"><h2 className="text-base font-black">Campaigns</h2><button onClick={() => safeToast("New campaign setup is sample-only in this preview.")} className="text-xs font-bold text-[#174be8]">+ New</button></div>
          <div className="divide-y divide-[#edf2f8]">
            {campaigns.map((campaign) => {
              const active = selectedCampaign.id === campaign.id;
              return (
                <button key={campaign.id} onClick={() => { setSelectedCampaign(campaign); setTab("All Prospects"); }} className={`block w-full px-3 py-3 text-left transition hover:bg-[#f8fbff] ${active ? "bg-[#f8fbff]" : "bg-white"}`}>
                  <div className="mb-1 flex items-start justify-between gap-2"><div className="text-[13px] font-black">{campaign.name}</div><Chip tone={statusTone(campaign.status) as "blue" | "green" | "gold" | "gray"}>{campaign.status}</Chip></div>
                  <div className="mb-2 flex items-center gap-1 text-[11px] text-[#526078]"><MapPin size={11} className="text-[#ef4444]" /> {campaign.market}</div>
                  <div className="grid grid-cols-4 gap-1 text-center"><div><div className="text-xs font-black">{campaign.prospects}</div><div className="text-[9px] text-[#526078]">Prospects</div></div><div><div className="text-xs font-black">{campaign.openRate}</div><div className="text-[9px] text-[#526078]">Open</div></div><div><div className="text-xs font-black">{campaign.replies}</div><div className="text-[9px] text-[#526078]">Replies</div></div><div><div className="text-xs font-black">{campaign.interested}</div><div className="text-[9px] text-[#526078]">Interest</div></div></div>
                </button>
              );
            })}
          </div>
          <div className="p-3 text-center"><button className="text-xs font-bold text-[#174be8]">View all campaigns →</button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[#edf2f8] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><div className="flex items-center gap-2"><h2 className="text-lg font-black">{selectedCampaign.name}</h2><Chip tone={statusTone(selectedCampaign.status) as "blue" | "green" | "gold" | "gray"}>{selectedCampaign.status}</Chip></div><div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#526078]"><span className="flex items-center gap-1"><MapPin size={12} /> {selectedCampaign.market}</span><span className="flex items-center gap-1"><CalendarDays size={12} /> Apr 28, 2025</span><span className="flex items-center gap-1"><LinkIcon size={12} /> SmartLead {selectedCampaign.smartLeadId}</span></div></div>
              <div className="flex flex-wrap gap-2"><button onClick={() => safeToast("This would open the connected campaign in SmartLead.")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-3 text-[11px] font-bold text-[#174be8]">Open SmartLead <ExternalLink size={12} /></button><button onClick={() => safeToast("Sample replies synced. Live SmartLead/GHL sync will connect later.")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-3 text-[11px] font-bold text-[#174be8]"><RefreshCw size={12} /> Sync Replies</button><button onClick={() => safeToast("Selected prospects would be pushed to the selected outreach campaign.")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-3 text-[11px] font-bold text-[#174be8]"><Upload size={12} /> Import Prospects</button></div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#dbe4f2] bg-[#fbfdff] px-3 py-2 text-xs text-[#526078]"><Info size={14} className="text-[#174be8]" /><span><b>Outreach is managed in SmartLead.</b> Use this dashboard to open the platform, sync replies, import prospects, and promote interested leads.</span></div>
            <div className="mt-3 grid grid-cols-3 gap-0 rounded-xl border border-[#edf2f8] bg-white md:grid-cols-6">
              {[["SENT", selectedCampaign.sent],["OPEN RATE", selectedCampaign.openRate],["REPLY RATE", selectedCampaign.replyRate],["REPLIES", selectedCampaign.replies],["INTERESTED", selectedCampaign.interested],["PROMOTED", selectedCampaign.promoted]].map(([label,value]) => <div key={label} className="border-r border-[#edf2f8] px-3 py-2 last:border-r-0"><div className="text-[9px] font-bold text-[#8794ab]">{label}</div><div className={`mt-0.5 text-base font-black ${String(label).includes("RATE") || label === "INTERESTED" ? "text-[#0a8f5a]" : "text-[#07142f]"}`}>{value}</div></div>)}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center rounded-xl border border-[#edf2f8] px-3 py-3">
              {[ ["Day 1", "Cold Outreach"], ["Day 3", "Follow-Up 1"], ["Day 7", "Final Follow-Up"] ].map((item, idx) => (
                <div key={item[0]} className={`flex items-center gap-2 ${idx === 0 ? "justify-start" : idx === 1 ? "justify-center" : "justify-end"}`}><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dbe4f2] bg-[#eef4ff] text-[#174be8]"><Mail size={15} /></div><div><div className="text-xs font-black">{item[0]}</div><div className="text-xs text-[#526078]">{item[1]}</div></div></div>
              )).flatMap((node, idx) => idx < 2 ? [node, <div key={`line-${idx}`} className="h-px border-t border-dashed border-[#cbd5e1]" />] : [node])}
            </div>
          </div>

          <div className="px-3 pt-2"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-4 text-xs font-bold">{[["All Prospects", campaignProspects.length],["Replied", statusCounts.Replied],["Interested", readyToPromote],["Opened", statusCounts.Opened],["Bounced", statusCounts.Bounced]].map(([name,count]) => <button key={name} onClick={() => setTab(String(name))} className={`pb-1.5 ${tab === name ? "border-b-2 border-[#174be8] text-[#174be8]" : "text-[#526078]"}`}>{name} <span className="ml-1 rounded-full bg-[#eef4ff] px-1.5 text-[10px] text-[#174be8]">{count}</span></button>)}</div><button className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold">Filter</button></div></div>

          <div className="px-3 pb-3">
            <table className="w-full table-fixed text-left text-[12px]">
              <thead><tr className="border-y border-[#edf2f8] text-[10px] uppercase text-[#8794ab]"><th className="w-[20%] py-2">Teacher</th><th className="w-[13%]">School</th><th className="w-[11%]">Email</th><th className="w-[11%]">Engage</th><th className="w-[14%]">Reply</th><th className="w-[9%]">Fit</th><th className="w-[14%]">Preview</th><th className="w-[8%] text-right">Action</th></tr></thead>
              <tbody>
                {visibleProspects.map((p) => (
                  <tr key={p.id} className="border-b border-[#edf2f8] hover:bg-[#f8fbff]">
                    <td className="py-2"><div className="flex items-center gap-2"><div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[10px] font-black text-[#174be8]">{p.initials}</div><div className="min-w-0"><div className="truncate font-bold">{p.name}</div><div className="truncate text-[10px] text-[#8794ab]">{p.name.toLowerCase().replace(" ", ".")}@school.edu</div></div></div></td>
                    <td className="truncate text-[#34445f]">{p.school}</td>
                    <td><Chip tone={emailTone(p.emailStatus) as "blue" | "green" | "gold" | "red"}>{p.emailStatus}</Chip></td>
                    <td className="truncate text-[#526078]">{p.engagement}</td>
                    <td><span className="flex items-center gap-1.5 truncate font-bold text-[#34445f]"><span className={`h-2 w-2 flex-shrink-0 rounded-full ${replyDot(p.replyStatus)}`} />{replyText(p.replyStatus)}</span></td>
                    <td><Chip tone={fitTone(p.fit) as "green" | "gold" | "red"}>{p.fit}</Chip></td>
                    <td className="truncate text-[#526078]">{p.preview}</td>
                    <td className="text-right">{p.replyStatus === "Interested" || p.replyStatus === "Meeting Booked" ? <button onClick={() => safeToast(`${p.name} would be promoted to Candidate Pipeline.`)} className="rounded-md bg-[#174be8] px-2 py-1.5 text-[11px] font-bold text-white">Pipeline</button> : p.replyStatus === "Follow-Up Needed" || p.emailStatus === "Replied" ? <button className="rounded-md border border-[#dbe4f2] px-2 py-1.5 text-[11px] font-bold text-[#174be8]">Follow</button> : <button className="rounded-md border border-[#dbe4f2] px-1.5 py-1.5 text-[#526078]"><MoreVertical size={13} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between pt-2 text-[11px] text-[#526078]"><span>Showing {visibleProspects.length} of {campaignProspects.length} prospects</span><div className="flex items-center gap-1"><button className="rounded-md border border-[#dbe4f2] p-1.5"><ChevronLeft size={13} /></button><button className="rounded-md bg-[#174be8] px-2.5 py-1.5 font-bold text-white">1</button><button className="rounded-md border border-[#dbe4f2] px-2.5 py-1.5 font-bold">2</button><button className="rounded-md border border-[#dbe4f2] p-1.5"><ChevronRight size={13} /></button></div></div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[#edf2f8] p-3"><h2 className="text-base font-black">Outreach Insights</h2><p className="text-[11px] text-[#66728a]">{selectedCampaign.market} campaign overview</p></div>
          <div className="space-y-3 p-3">
            <Card className="p-3"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase text-[#174be8]">Selected Campaign</div><div className="mt-1 text-sm font-black">{selectedCampaign.name}</div><div className="mt-1 text-[11px] text-[#0a8f5a]">{selectedCampaign.openRate} open • {selectedCampaign.replyRate} reply</div></div><IconBox tone="gold"><Trophy size={16} /></IconBox></div></Card>
            <Card className="p-3"><div className="mb-2 text-sm font-black">Email Status Breakdown</div>{Object.entries(statusCounts).map(([label,num]) => <div key={label} className="mb-2 grid grid-cols-[58px_1fr_24px] items-center gap-2 text-[11px]"><span>{label}</span><div className="h-1.5 rounded-full bg-[#edf2f8]"><div className="h-1.5 rounded-full bg-[#174be8]" style={{ width: `${Math.max(8, (num / maxCount) * 100)}%` }} /></div><span className="text-right font-bold">{num}</span></div>)}</Card>
            <Card className="p-3"><div className="mb-2 text-sm font-black">Reply Status Breakdown</div>{Object.entries(replyCounts).map(([label,num]) => <div key={label} className="mb-1.5 flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5">{label === "Interested" ? <CheckCircle2 size={12} className="text-[#0a8f5a]" /> : label === "Meeting Booked" ? <CalendarDays size={12} className="text-[#0a8f5a]" /> : label === "Follow-Up Needed" ? <Clock size={12} className="text-[#b7791f]" /> : label === "Not Interested" ? <XCircle size={12} className="text-[#ef4444]" /> : <MoreVertical size={12} className="text-[#8794ab]" />} {label}</span><span className="font-bold">{num}</span></div>)}</Card>
            <Card className="border-[#d5f2df] bg-[#f4fff8] p-3"><div className="flex gap-2"><IconBox tone="green"><Target size={16} /></IconBox><div><div className="text-sm font-black">Recommended Next Step</div><p className="mt-1 text-xs text-[#34445f]">{readyToPromote} interested leads are ready to move to the pipeline.</p><button onClick={() => safeToast(`${readyToPromote} interested leads would be promoted to Candidate Pipeline.`)} className="mt-2 w-full rounded-lg bg-[#0ea66e] px-3 py-2 text-xs font-bold text-white">Promote {readyToPromote} to Pipeline</button></div></div></Card>
          </div>
        </Card>
      </div>
    </div>
  );
}
