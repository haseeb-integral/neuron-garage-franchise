import { useMemo, useState } from "react";
import { Mail, Users, Send, Reply, Star, FolderCheck, RefreshCw, Upload, Plus, ExternalLink, MapPin, CalendarDays, Link as LinkIcon, MoreVertical, Trophy, Target, CheckCircle2, Clock, XCircle, AlertCircle, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import { toast } from "sonner";

type CampaignStatus = "Active" | "Draft" | "Paused" | "Complete";
type EmailStatus = "Opened" | "Replied" | "Bounced" | "Queued" | "Sent";
type ReplyStatus = "Interested" | "Meeting Booked" | "Follow-Up Needed" | "No Reply" | "Not Interested";
type Fit = "High" | "Medium" | "Low";

type Campaign = {
  id: number;
  name: string;
  market: string;
  status: CampaignStatus;
  prospects: number;
  openRate: string;
  replies: number;
  interested: number;
};

type Prospect = {
  id: number;
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
  { id: 1, name: "Austin TX — Spring 2026", market: "Austin, TX", status: "Active", prospects: 312, openRate: "42.6%", replies: 46, interested: 16 },
  { id: 2, name: "Nashville TN — Spring 2026", market: "Nashville, TN", status: "Active", prospects: 298, openRate: "40.1%", replies: 38, interested: 12 },
  { id: 3, name: "Denver CO — April 2026", market: "Denver, CO", status: "Active", prospects: 284, openRate: "38.7%", replies: 34, interested: 11 },
  { id: 4, name: "Frisco TX — May 2026", market: "Frisco, TX", status: "Draft", prospects: 354, openRate: "—", replies: 0, interested: 0 },
];

const prospects: Prospect[] = [
  { id: 1, initials: "ER", name: "Emily Rogers", school: "Westwood HS", emailStatus: "Opened", engagement: "2 opens", replyStatus: "Interested", fit: "High", preview: "Hi Neuron Garage team, this sounds interesting..." },
  { id: 2, initials: "JM", name: "Jason Miller", school: "Bowie High School", emailStatus: "Replied", engagement: "3 opens + 1 click", replyStatus: "Meeting Booked", fit: "High", preview: "Thanks for reaching out. I can talk this week..." },
  { id: 3, initials: "SC", name: "Sarah Chen", school: "Cedar Ridge HS", emailStatus: "Opened", engagement: "1 open", replyStatus: "Follow-Up Needed", fit: "Medium", preview: "I’m interested in learning more later..." },
  { id: 4, initials: "DP", name: "David Patel", school: "McNeil High School", emailStatus: "Replied", engagement: "2 opens + 1 click", replyStatus: "No Reply", fit: "Medium", preview: "—" },
  { id: 5, initials: "LT", name: "Lisa Thompson", school: "Round Rock HS", emailStatus: "Bounced", engagement: "—", replyStatus: "No Reply", fit: "Low", preview: "—" },
  { id: 6, initials: "MW", name: "Michael Ward", school: "Anderson High School", emailStatus: "Queued", engagement: "—", replyStatus: "No Reply", fit: "Low", preview: "—" },
];

function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "gold" | "red" | "gray" | "purple" }) {
  const styles = {
    blue: "bg-[#eef4ff] text-[#174be8]",
    green: "bg-[#e6f7ef] text-[#0a8f5a]",
    gold: "bg-[#fff4df] text-[#b7791f]",
    red: "bg-[#fff1f1] text-[#ef4444]",
    gray: "bg-[#eef2f7] text-[#526078]",
    purple: "bg-[#f2ebff] text-[#7c3aed]",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${styles[tone]}`}>{children}</span>;
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
  return <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}>{children}</div>;
}

function statusTone(status: CampaignStatus) {
  if (status === "Active") return "green";
  if (status === "Draft") return "blue";
  if (status === "Paused") return "gold";
  return "gray";
}

function emailTone(status: EmailStatus) {
  if (status === "Opened" || status === "Sent") return "blue";
  if (status === "Replied") return "green";
  if (status === "Bounced") return "red";
  return "gold";
}

function replyTone(status: ReplyStatus) {
  if (status === "Interested") return "green";
  if (status === "Meeting Booked") return "purple";
  if (status === "Follow-Up Needed") return "gold";
  if (status === "Not Interested") return "red";
  return "gray";
}

function fitTone(fit: Fit) {
  if (fit === "High") return "green";
  if (fit === "Medium") return "gold";
  return "red";
}

export default function EmailOutreach() {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  const [tab, setTab] = useState("All Prospects");

  const visibleProspects = useMemo(() => prospects, []);

  const safeToast = (message: string) => toast.info(message);

  return (
    <div className="min-h-screen bg-white text-[#07142f]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-[520px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8794ab]" />
          <input className="h-10 w-full rounded-xl border border-[#dbe4f2] bg-white pl-10 pr-4 text-sm text-[#07142f] outline-none placeholder:text-[#8794ab]" placeholder="Search campaigns, prospects, schools, cities..." />
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <button className="rounded-full border border-[#e7edf5] p-2 text-[#526078]"><AlertCircle size={18} /></button>
          <div className="flex items-center gap-3 rounded-xl border border-[#e7edf5] px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white">H</div>
            <div className="leading-tight"><div className="text-sm font-bold">Haseeb</div><div className="text-[11px] text-[#66728a]">ADMIN</div></div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-[#07142f]">Email Outreach</h1>
          <p className="mt-1 text-sm text-[#526078]">Manage teacher prospect outreach campaigns and move interested replies into the candidate pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => safeToast("Sample CSV export prepared. Live exports will use synced campaign data.")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-4 text-sm font-bold text-[#07142f]"><Download size={15} /> Export CSV</button>
          <button onClick={() => safeToast("Sample replies synced. SmartLead or GHL sync will connect later.")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-4 text-sm font-bold text-[#07142f]"><RefreshCw size={15} /> Sync Replies</button>
          <button onClick={() => safeToast("Selected teacher prospects would be imported into the selected campaign.")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-4 text-sm font-bold text-[#174be8]"><Upload size={15} /> Import Prospects</button>
          <button onClick={() => safeToast("Campaign creation is sample-only until SmartLead/GHL is connected.")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#174be8] px-4 text-sm font-bold text-white"><Plus size={15} /> Create Campaign</button>
        </div>
      </div>

      <Card className="mb-4 p-3">
        <div className="grid gap-2 md:grid-cols-5">
          {["City Search", "Teacher Prospects", "Email Outreach", "Candidate Pipeline", "Onboarding"].map((step, i) => (
            <div key={step} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${i === 2 ? "bg-[#174be8] text-white" : "bg-[#eef2f7] text-[#526078]"}`}>{i + 1}</span>
              <div className="min-w-0"><div className={`text-sm font-bold ${i === 2 ? "text-[#174be8]" : "text-[#07142f]"}`}>{step}</div><div className="text-[11px] text-[#8794ab]">{i === 0 ? "10 cities" : i === 1 ? "12 prospects" : i === 2 ? "4 campaigns" : i === 3 ? "11 candidates" : "Active"}</div></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          [Mail, "Active Campaigns", "4", "Across 4 cities", "blue"],
          [Users, "Prospects in Outreach", "1,248", "+128 this week", "purple"],
          [Send, "Open Rate", "42.6%", "+6.3 pp vs last 7 days", "green"],
          [Reply, "Replies", "186", "14.9% reply rate", "green"],
          [Star, "Interested Leads", "58", "31.2% of replies", "gold"],
          [FolderCheck, "Promoted to Pipeline", "23", "+8 this week", "blue"],
        ].map(([Icon, label, value, sub, tone]) => (
          <Card key={label as string} className="p-4">
            <div className="flex items-center gap-3">
              <IconBox tone={tone as "blue" | "green" | "gold" | "purple"}><Icon size={19} /></IconBox>
              <div><div className="text-xs font-bold text-[#34445f]">{label as string}</div><div className="text-2xl font-black text-[#07142f]">{value as string}</div><div className="text-xs font-bold text-[#0a8f5a]">{sub as string}</div></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#edf2f8] p-4">
            <h2 className="text-lg font-black">Campaigns</h2>
            <button onClick={() => safeToast("New campaign setup is sample-only in this preview.")} className="text-sm font-bold text-[#174be8]">+ New Campaign</button>
          </div>
          <div className="divide-y divide-[#edf2f8]">
            {campaigns.map((campaign) => {
              const active = selectedCampaign.id === campaign.id;
              return (
                <button key={campaign.id} onClick={() => setSelectedCampaign(campaign)} className={`block w-full p-4 text-left transition hover:bg-[#f8fbff] ${active ? "bg-[#f8fbff]" : "bg-white"}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="text-sm font-black text-[#07142f]">{campaign.name}</div>
                    <Pill tone={statusTone(campaign.status) as "blue" | "green" | "gold" | "gray"}>{campaign.status}</Pill>
                  </div>
                  <div className="mb-3 flex items-center gap-1 text-xs text-[#526078]"><MapPin size={12} className="text-[#ef4444]" /> {campaign.market}</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><div className="text-sm font-black">{campaign.prospects}</div><div className="text-[10px] text-[#526078]">Prospects</div></div>
                    <div><div className="text-sm font-black">{campaign.openRate}</div><div className="text-[10px] text-[#526078]">Open Rate</div></div>
                    <div><div className="text-sm font-black">{campaign.replies}</div><div className="text-[10px] text-[#526078]">Replies</div></div>
                    <div><div className="text-sm font-black">{campaign.interested}</div><div className="text-[10px] text-[#526078]">Interested</div></div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-4 text-center"><button className="text-sm font-bold text-[#174be8]">View all campaigns →</button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[#edf2f8] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-xl font-black">{selectedCampaign.name}</h2><Pill tone={statusTone(selectedCampaign.status) as "blue" | "green" | "gold" | "gray"}>{selectedCampaign.status}</Pill></div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#526078]"><span className="flex items-center gap-1"><MapPin size={13} /> {selectedCampaign.market}</span><span className="flex items-center gap-1"><CalendarDays size={13} /> Launched Apr 28, 2025</span><span className="flex items-center gap-1"><LinkIcon size={13} /> SmartLead #4812</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => safeToast("This would open the connected campaign in SmartLead.")} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8]">Open in SmartLead <ExternalLink size={13} /></button>
                <button onClick={() => safeToast("Sample replies synced. Live SmartLead/GHL sync will connect later.")} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8]"><RefreshCw size={13} /> Sync Replies</button>
                <button onClick={() => safeToast("Selected prospects would be pushed to the selected outreach campaign.")} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#174be8] px-3 text-xs font-bold text-white"><Upload size={13} /> Import Prospects</button>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[#dbe4f2] bg-white px-4 py-3 text-sm text-[#526078]">
              <span className="font-bold text-[#174be8]">Info:</span> Outreach is managed in SmartLead. Use this screen to monitor status, sync replies, import prospects, and promote interested leads.
            </div>
            <div className="mt-4 grid grid-cols-6 divide-x divide-[#edf2f8] rounded-lg border border-[#edf2f8]">
              {[["SENT","38"],["OPEN RATE","52%"],["REPLY RATE","10.5%"],["REPLIES","4"],["INTERESTED","2"],["PROMOTED","1"]].map(([label,value]) => <div key={label} className="p-3"><div className="text-[10px] font-bold text-[#8794ab]">{label}</div><div className={`mt-1 text-lg font-black ${label.includes("RATE") || label === "INTERESTED" ? "text-[#0a8f5a]" : "text-[#07142f]"}`}>{value}</div></div>)}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#edf2f8] p-3">
              {[["Day 1","Cold Outreach"],["Day 3","Follow-Up 1"],["Day 7","Final Follow-Up"]].map((s, idx) => <div key={s[0]} className="flex flex-1 items-center gap-2"><IconBox><Mail size={16} /></IconBox><div><Pill tone="blue">{s[0]}</Pill><div className="mt-1 text-xs font-bold">{s[1]}</div></div>{idx < 2 && <div className="ml-auto h-px flex-1 border-t border-dashed border-[#cbd5e1]" />}</div>)}
            </div>
          </div>

          <div className="px-4 pt-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-5 text-sm font-bold">
                {[["All Prospects","312"],["Replied","46"],["Interested","16"],["Opened","133"],["Bounced","21"]].map(([name,count]) => <button key={name} onClick={() => setTab(name)} className={`pb-2 ${tab === name ? "border-b-2 border-[#174be8] text-[#174be8]" : "text-[#526078]"}`}>{name} <span className="ml-1 rounded-full bg-[#eef4ff] px-1.5 text-[10px] text-[#174be8]">{count}</span></button>)}
              </div>
              <button className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#07142f]">Filter</button>
            </div>
          </div>

          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead><tr className="border-y border-[#edf2f8] text-[10px] uppercase text-[#8794ab]"><th className="py-3">Teacher</th><th>School</th><th>Email Status</th><th>Engagement</th><th>Reply Status</th><th>Fit</th><th>Reply Preview</th><th className="text-right">Action</th></tr></thead>
              <tbody>
                {visibleProspects.map((p) => (
                  <tr key={p.id} className="border-b border-[#edf2f8] hover:bg-[#f8fbff]">
                    <td className="py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dbe7ff] text-xs font-black text-[#174be8]">{p.initials}</div><div><div className="font-bold text-[#07142f]">{p.name}</div><div className="text-xs text-[#8794ab]">{p.name.toLowerCase().replace(" ", ".")}@school.edu</div></div></div></td>
                    <td className="text-[#34445f]">{p.school}</td>
                    <td><Pill tone={emailTone(p.emailStatus) as "blue" | "green" | "gold" | "red"}>{p.emailStatus}</Pill></td>
                    <td className="text-xs text-[#526078]">{p.engagement}</td>
                    <td><Pill tone={replyTone(p.replyStatus) as "green" | "gold" | "red" | "gray" | "purple"}>{p.replyStatus}</Pill></td>
                    <td><Pill tone={fitTone(p.fit) as "green" | "gold" | "red"}>{p.fit}</Pill></td>
                    <td className="max-w-[150px] truncate text-xs text-[#526078]">{p.preview}</td>
                    <td className="text-right">{p.replyStatus === "Interested" || p.replyStatus === "Meeting Booked" ? <button onClick={() => safeToast(`${p.name} would be promoted to Candidate Pipeline.`)} className="rounded-md bg-[#174be8] px-3 py-1.5 text-xs font-bold text-white">Promote to Pipeline</button> : p.replyStatus === "Follow-Up Needed" ? <button className="rounded-md border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#174be8]">Follow Up</button> : <button className="rounded-md border border-[#dbe4f2] px-2 py-1.5 text-[#526078]"><MoreVertical size={14} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between py-3 text-xs text-[#526078]"><span>Showing 1 to 6 of 312 prospects</span><div className="flex items-center gap-1"><button className="rounded-md border border-[#dbe4f2] p-2"><ChevronLeft size={14} /></button><button className="rounded-md bg-[#174be8] px-3 py-2 font-bold text-white">1</button><button className="rounded-md border border-[#dbe4f2] px-3 py-2 font-bold">2</button><button className="rounded-md border border-[#dbe4f2] p-2"><ChevronRight size={14} /></button></div></div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[#edf2f8] p-4"><h2 className="text-lg font-black">Outreach Insights</h2><p className="text-xs text-[#66728a]">Austin TX campaign overview</p></div>
          <div className="space-y-3 p-4">
            <Card className="p-4"><div className="flex items-start justify-between"><div><div className="text-[11px] font-bold uppercase text-[#174be8]">Best Performing Campaign</div><div className="mt-2 font-black">Austin TX — Spring 2026</div><div className="mt-1 text-xs text-[#0a8f5a]">42.6% open rate • 14.9% reply rate</div><button className="mt-3 text-xs font-bold text-[#174be8]">View campaign performance →</button></div><IconBox tone="gold"><Trophy size={18} /></IconBox></div></Card>
            <Card className="p-4"><div className="mb-3 text-sm font-black">Email Status Breakdown</div>{[["Sent",926,"74.3%","blue"],["Opened",530,"42.6%","green"],["Replied",186,"14.9%","green"],["Bounced",63,"5.1%","red"],["Queued",80,"6.4%","gold"]].map(([label,num,pct,tone]) => <div key={label as string} className="mb-2 grid grid-cols-[80px_1fr_58px] items-center gap-2 text-xs"><span>{label as string}</span><div className="h-2 rounded-full bg-[#edf2f8]"><div className={`h-2 rounded-full ${tone === "blue" ? "bg-[#174be8]" : tone === "green" ? "bg-[#0ea66e]" : tone === "red" ? "bg-[#ef4444]" : "bg-[#f59e0b]"}`} style={{ width: pct as string }} /></div><span className="text-right font-bold">{num as number}</span></div>)}</Card>
            <Card className="p-4"><div className="mb-3 text-sm font-black">Reply Status Breakdown</div>{[[CheckCircle2,"Interested",58,"31.2%","green"],[CalendarDays,"Meeting Booked",28,"15.1%","green"],[Clock,"Follow-Up Needed",38,"20.4%","gold"],[MoreVertical,"No Reply",48,"25.8%","gray"],[XCircle,"Not Interested",14,"7.5%","red"]].map(([Icon,label,num,pct,tone]) => <div key={label as string} className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2"><Icon className={tone === "green" ? "text-[#0a8f5a]" : tone === "gold" ? "text-[#b7791f]" : tone === "red" ? "text-[#ef4444]" : "text-[#8794ab]"} size={13} /> {label as string}</span><span className="font-bold">{num as number} ({pct as string})</span></div>)}</Card>
            <Card className="border-[#d5f2df] bg-[#f4fff8] p-4"><div className="flex gap-3"><IconBox tone="green"><Target size={18} /></IconBox><div><div className="font-black">Recommended Next Step</div><p className="mt-2 text-sm text-[#34445f]">You have 3 interested leads ready to move to the pipeline.</p><button onClick={() => safeToast("Three interested leads would be promoted to Candidate Pipeline.")} className="mt-3 w-full rounded-lg bg-[#0ea66e] px-4 py-2 text-sm font-bold text-white">Promote 3 to Pipeline</button></div></div></Card>
          </div>
        </Card>
      </div>
    </div>
  );
}
