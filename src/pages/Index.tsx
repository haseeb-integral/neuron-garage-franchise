import { ArrowRight, BarChart3, CalendarDays, ClipboardCheck, Download, FileText, MapPin, TrendingUp, Upload, UserRound, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const kpis = [
  { title: "Target Cities", value: "42", delta: "12%", compare: "vs Apr 12 – May 11", icon: MapPin, bg: "#e4f7f4", color: "#05939a" },
  { title: "Teacher Prospects", value: "354", delta: "25%", compare: "vs Apr 12 – May 11", icon: UserRound, bg: "#f0efff", color: "#174be8" },
  { title: "Active Candidates", value: "128", delta: "18%", compare: "vs Apr 12 – May 11", icon: Users, bg: "#eef4ff", color: "#174be8" },
  { title: "Onboarding in Progress", value: "23", delta: "21%", compare: "vs Apr 12 – May 11", icon: ClipboardCheck, bg: "#fff1e5", color: "#fd7e14" },
];

const pipeline = [
  { stage: "New Lead", count: 12, percent: 9 },
  { stage: "Initial Qual", count: 9, percent: 7 },
  { stage: "Business Overview", count: 7, percent: 5 },
  { stage: "FDD Review", count: 5, percent: 4 },
  { stage: "Immersion", count: 4, percent: 3 },
  { stage: "Confirmation", count: 3, percent: 2 },
  { stage: "Signing", count: 2, percent: 2 },
  { stage: "Disqualified", count: 6, percent: 5 },
];

const recentActivity = [
  { text: "Sarah Mitchell moved to FDD Review", location: "Frisco, TX", time: "12 min ago", icon: Users, color: "#20c997", bg: "#e7f7ed" },
  { text: "New prospect imported for Austin, TX", location: "Austin, TX", time: "1 hr ago", icon: FileText, color: "#174be8", bg: "#eef4ff" },
  { text: "Marcus Johnson flagged as Overdue", location: "Plano, TX", time: "3 hr ago", icon: BarChart3, color: "#fd7e14", bg: "#fff1e5" },
  { text: "Patricia Williams completed Business Immersion", location: "Dallas, TX", time: "Yesterday", icon: ClipboardCheck, color: "#174be8", bg: "#eef4ff" },
  { text: "City score recalculated for Plano, TX (Tier A)", location: "Plano, TX", time: "Yesterday", icon: MapPin, color: "#20c997", bg: "#e7f7ed" },
  { text: "Onboarding completed for Ankit Desai", location: "Houston, TX", time: "2 days ago", icon: FileText, color: "#6b5cff", bg: "#f0efff" },
];

const nextActions = [
  { text: "Follow up with 12 engaged candidates", sub: "Last contacted 5 days ago", priority: "High", icon: UserRound, bg: "#eef4ff", color: "#174be8", pill: "#ffe4e7", pillText: "#e11d48" },
  { text: "Review 7 pending documents", sub: "Awaiting verification", priority: "Medium", icon: ClipboardCheck, bg: "#fff1e5", color: "#fd7e14", pill: "#fff1e5", pillText: "#d95f00" },
  { text: "Score 6 shortlisted cities", sub: "Improve city pipeline", priority: "Low", icon: MapPin, bg: "#e4f7f4", color: "#05939a", pill: "#e4f7f4", pillText: "#047c80" },
  { text: "Import new prospect list", sub: "Add teachers to pipeline", priority: "Low", icon: Upload, bg: "#eef4ff", color: "#174be8", pill: "#eef4ff", pillText: "#174be8" },
];

const insights = [
  { title: "Active Candidates", value: "128", delta: "18%" },
  { title: "New Prospects", value: "96", delta: "14%" },
  { title: "Cities Scored", value: "27", delta: "8%" },
  { title: "Onboardings Completed", value: "15", delta: "38%" },
  { title: "Conversion Rate", value: "11.7%", delta: "2.4pp" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const maxPipeline = Math.max(...pipeline.map((p) => p.count));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your franchise acquisition and onboarding performance."
        action={
          <>
            <Button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#174be8] px-4 text-sm font-bold leading-none text-white shadow-sm hover:bg-[#0f3fd0]"
              style={{ minHeight: 36 }}
            >
              <Download className="mr-2 h-4 w-4 shrink-0" />
              <span className="leading-none">Export Report</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="inline-flex h-9 items-center justify-center rounded-lg border-[#d8e2ef] bg-white px-4 text-sm font-semibold leading-none text-[#26364d] hover:bg-[#f3f7ff]"
              style={{ minHeight: 36 }}
            >
              <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-[#526078]" />
              <span className="leading-none">May 12 – Jun 11, 2026</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((stat) => (
          <div key={stat.title} className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d8e2ef" }}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: stat.bg, color: stat.color }}>
                <stat.icon size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#26364d]">{stat.title}</p>
                <p className="mt-1 text-3xl font-black leading-none text-[#07142f]">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-5 text-sm">
              <span className="flex items-center gap-1 font-bold text-[#16a34a]"><TrendingUp size={14} /> {stat.delta}</span>
              <span className="text-[#526078]">{stat.compare}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr_1.12fr]">
        <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d8e2ef" }}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-black text-[#07142f]">Pipeline Snapshot</h2><p className="text-xs text-[#526078]">Candidates by stage</p></div>
            <Button variant="outline" className="h-8 rounded-lg border-[#d8e2ef] px-3 text-xs font-semibold">All Stages</Button>
          </div>
          <div className="space-y-2.5">
            <div className="grid grid-cols-[130px_1fr_42px_46px] items-center gap-3 text-[11px] font-bold text-[#526078]"><span>Stage</span><span /><span className="text-right">Candidates</span><span className="text-right">% Total</span></div>
            {pipeline.map((p) => (
              <div key={p.stage} className="grid grid-cols-[130px_1fr_42px_46px] items-center gap-3 text-xs">
                <span className="font-semibold text-[#26364d]">{p.stage}</span>
                <div className="h-3 overflow-hidden rounded-full bg-[#edf1f6]"><div className="h-full rounded-full bg-[#174be8]" style={{ width: `${(p.count / maxPipeline) * 100}%` }} /></div>
                <span className="text-right font-bold text-[#07142f]">{p.count}</span><span className="text-right font-bold text-[#26364d]">{p.percent}%</span>
              </div>
            ))}
            <div className="mt-2 grid grid-cols-[130px_1fr_42px_46px] items-center gap-3 border-t border-[#eef2f6] pt-3 text-sm font-black text-[#07142f]"><span>Total Candidates</span><span /><span className="text-right">48</span><span className="text-right">100%</span></div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d8e2ef" }}>
          <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[#07142f]">Recent Activity</h2><p className="text-xs text-[#526078]">Latest events across the system</p></div><button className="text-xs font-bold text-[#174be8] hover:underline">View All</button></div>
          <div className="space-y-1">
            {recentActivity.map((evt, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-[#eef2f6] py-2 last:border-b-0">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: evt.bg, color: evt.color }}><evt.icon size={13} /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#26364d]">{evt.text}</p><p className="text-[11px] text-[#526078]">{evt.location}</p></div>
                <span className="shrink-0 text-[11px] text-[#526078]">{evt.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d8e2ef" }}>
          <h2 className="mb-4 text-lg font-black text-[#07142f]">Next Best Actions</h2>
          <div className="space-y-1">
            {nextActions.map((action, i) => (
              <button key={i} onClick={() => { if (i === 0) navigate("/candidate-pipeline"); if (i === 1) navigate("/onboarding"); if (i === 2) navigate("/city-scoring"); if (i === 3) navigate("/teacher-prospects"); }} className="flex w-full items-center gap-3 rounded-xl border-b border-[#eef2f6] px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f8fbff]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: action.bg, color: action.color }}><action.icon size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#26364d]">{action.text}</span><span className="block text-[11px] text-[#526078]">{action.sub}</span></span>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: action.pill, color: action.pillText }}>{action.priority}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#526078]" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d8e2ef" }}>
        <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[#07142f]">Insights at a Glance</h2><p className="text-xs text-[#526078]">Key metrics over time</p></div><Button variant="outline" className="h-8 rounded-lg border-[#d8e2ef] px-3 text-xs font-semibold">Last 6 Months</Button></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {insights.map((item) => (
            <div key={item.title} className="border-r border-[#eef2f6] pr-4 last:border-r-0">
              <p className="text-xs font-semibold text-[#526078]">{item.title}</p>
              <div className="mt-2 flex items-end gap-3"><span className="text-2xl font-black text-[#07142f]">{item.value}</span><span className="flex items-center gap-1 text-xs font-bold text-[#16a34a]"><TrendingUp size={12} /> {item.delta}</span></div>
              <svg viewBox="0 0 120 34" className="mt-2 h-8 w-full text-[#174be8]" fill="none" aria-hidden="true"><path d="M2 26 L18 23 L34 25 L50 18 L66 21 L82 8 L100 15 L118 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
