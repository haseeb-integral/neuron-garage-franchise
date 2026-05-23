import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Database,
  FlaskConical,
  Kanban,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dashboard — pre-launch "what should I do today?" home screen
 * for Sam and Kaylie. Live counts for City Search, Teacher Search,
 * and Email Outreach. The Candidate Pipeline tile is clearly labeled
 * as demo data because real candidates are weeks away.
 */

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const YELLOW = "#FFD400";
const INK = "#0b1a36";
const MUTED = "#526078";
const BORDER = "#eef2f7";

// ---------- Live data hooks ------------------------------------------------

function useCitySearchSummary() {
  return useQuery({
    queryKey: ["dashboard", "city-summary"],
    staleTime: 60_000,
    queryFn: async () => {
      const [scored, states] = await Promise.all([
        supabase.from("us_cities_scored").select("id", { count: "exact", head: true }),
        supabase.from("us_cities_scored").select("state"),
      ]);
      const uniqueStates = new Set(
        ((states.data ?? []) as { state: string | null }[])
          .map((r) => r.state)
          .filter((s): s is string => !!s),
      );
      return {
        total: scored.count ?? 0,
        states: uniqueStates.size,
      };
    },
  });
}

function useTeacherSearchSummary() {
  return useQuery({
    queryKey: ["dashboard", "teacher-summary"],
    staleTime: 60_000,
    queryFn: async () => {
      const [total, verified] = await Promise.all([
        supabase.from("teacher_prospects").select("id", { count: "exact", head: true }),
        supabase
          .from("teacher_prospects")
          .select("id", { count: "exact", head: true })
          .eq("verification_status", "valid"),
      ]);
      return {
        total: total.count ?? 0,
        verified: verified.count ?? 0,
      };
    },
  });
}

function useEmailOutreachSummary() {
  return useQuery({
    queryKey: ["dashboard", "outreach-summary"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_cache")
        .select("id, status")
        .neq("id", "smartlead_analytics_overview");
      if (error) return { campaigns: 0, active: 0 };
      const campaigns = data?.length ?? 0;
      const active =
        data?.filter((c) => /active|start/i.test(String(c.status ?? ""))).length ?? 0;
      return { campaigns, active };
    },
  });
}

// ---------- Static framing (intentionally not from DB) --------------------

const PRE_LAUNCH_CHECKLIST = [
  {
    id: "cities",
    done: false,
    title: "Lock in this month's target cities",
    body: "Score, compare, and mark Tier A markets you want to work first.",
    cta: "Open City Search",
    href: "/city-scoring",
    icon: MapPin,
    accent: "#0d7a5f",
    bg: "#dcf5e6",
  },
  {
    id: "teachers",
    done: false,
    title: "Grow the Master Teacher Database",
    body: "Import, verify, and tag teachers in your locked cities. Quality > quantity.",
    cta: "Open Teacher Search",
    href: "/teacher-prospects",
    icon: Users,
    accent: BLUE,
    bg: "#eef4ff",
  },
  {
    id: "outreach",
    done: false,
    title: "Confirm SmartLead mailbox health",
    body: "Mailboxes are in WARM-UP. Check reputation and daily sends — live teacher outreach starts after warm-up clears.",
    cta: "Open Email Outreach",
    href: "/email-outreach",
    icon: Mail,
    accent: "#b88a00",
    bg: "#fff8d6",
  },
  {
    id: "pipeline",
    done: false,
    title: "Walk through the Candidate Pipeline",
    body: "The Kanban is live and ready. Real candidates land here once warm-up completes and first replies come in.",
    cta: "Open Candidate Pipeline",
    href: "/candidate-pipeline",
    icon: Kanban,
    accent: "#7a4dff",
    bg: "#f0ecff",
  },
] as const;

// Demo pipeline shape — clearly labeled in the UI as sample data.
const DEMO_PIPELINE = [
  { stage: "New Lead", count: 0 },
  { stage: "Initial Qual", count: 0 },
  { stage: "Business Overview", count: 0 },
  { stage: "FDD Review", count: 0 },
  { stage: "Immersion", count: 0 },
  { stage: "Confirmation", count: 0 },
  { stage: "Signing", count: 0 },
];

// ---------- Small UI primitives -------------------------------------------

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
      {label}
    </p>
    <p className="mt-1 text-[26px] font-black leading-none" style={{ color: INK }}>
      {value}
    </p>
    {hint && (
      <p className="mt-1 text-[11.5px]" style={{ color: MUTED }}>
        {hint}
      </p>
    )}
  </div>
);

const fmt = (n: number | undefined) =>
  typeof n === "number" ? n.toLocaleString("en-US") : "—";

// ---------- Page -----------------------------------------------------------

const Dashboard = () => {
  const navigate = useNavigate();

  const cities = useCitySearchSummary();
  const teachers = useTeacherSearchSummary();
  const outreach = useEmailOutreachSummary();

  const totalDemo = DEMO_PIPELINE.reduce((s, p) => s + p.count, 0);
  const maxDemo = Math.max(1, ...DEMO_PIPELINE.map((p) => p.count));

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4">
      <PageHeader
        title="Welcome to Neuron Garage"
        subtitle="Pre-launch console for Sam and Kaylie — lock the cities, stack the teachers, get the mailboxes warm. Real outreach starts the day warm-up clears."
      />

      {/* Pre-launch status banner — the single most important message */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 md:p-6"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
          color: "white",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: YELLOW, color: INK }}
            >
              <FlaskConical size={20} />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: YELLOW }}>
                Pre-launch · Mailbox warm-up in progress
              </div>
              <h2 className="mt-1 text-[20px] font-black leading-tight">
                We are not emailing real teachers yet.
              </h2>
              <p className="mt-1 max-w-[640px] text-[13.5px] leading-relaxed text-white/85">
                The three sending mailboxes are seasoning with internal staff and the SmartLead warm-up pool. Use
                this window to finish picking cities and to keep the teacher database growing — so the day we go
                live, every send hits a verified inbox in a market we actually want.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/email-outreach")}
            className="inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-[13px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ color: NAVY }}
          >
            Check warm-up status
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Four live feature tiles */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* City Search — LIVE */}
        <button
          onClick={() => navigate("/city-scoring")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#dcf5e6", color: "#0d7a5f" }}
            >
              <MapPin size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#0d7a5f" }}>
              Live data
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>
            City Search
          </h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>
            Where should we open next?
          </p>
          <div className="mt-4">
            <Stat
              label="Cities scored"
              value={cities.isLoading ? "…" : fmt(cities.data?.total)}
              hint={
                cities.isLoading
                  ? " "
                  : `Across ${fmt(cities.data?.states)} states`
              }
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Rank markets <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        {/* Teacher Search — LIVE */}
        <button
          onClick={() => navigate("/teacher-prospects")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#eef4ff", color: BLUE }}
            >
              <Users size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: BLUE }}>
              Live data
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>
            Teacher Search
          </h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>
            Who in those cities should we talk to?
          </p>
          <div className="mt-4">
            <Stat
              label="Teachers in master DB"
              value={teachers.isLoading ? "…" : fmt(teachers.data?.total)}
              hint={
                teachers.isLoading
                  ? " "
                  : `${fmt(teachers.data?.verified)} with verified email`
              }
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Find prospects <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        {/* Email Outreach — LIVE + warm-up callout */}
        <button
          onClick={() => navigate("/email-outreach")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#fff8d6", color: "#b88a00" }}
            >
              <Send size={20} />
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "#fff8d6", color: "#7a5c00" }}
            >
              Warm-up
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>
            Email Outreach
          </h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>
            How do we start the conversation?
          </p>
          <div className="mt-4">
            <Stat
              label="SmartLead campaigns"
              value={outreach.isLoading ? "…" : fmt(outreach.data?.campaigns)}
              hint={
                outreach.isLoading
                  ? " "
                  : `${fmt(outreach.data?.active)} active · mailboxes seasoning`
              }
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Review campaigns <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        {/* Candidate Pipeline — DEMO data tile */}
        <button
          onClick={() => navigate("/candidate-pipeline")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#f0ecff", color: "#7a4dff" }}
            >
              <Kanban size={20} />
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "#f3f5f9", color: MUTED }}
            >
              Demo data
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>
            Candidate Pipeline
          </h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>
            Who's getting close to signing?
          </p>
          <div className="mt-4">
            <Stat
              label="Sample candidates"
              value="0"
              hint="Real candidates land here after first replies"
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Tour the board <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* Two-column: Pre-launch checklist + Pipeline (demo) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
        {/* Checklist */}
        <section
          className="rounded-2xl bg-white p-5"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} style={{ color: BLUE }} />
            <h2 className="text-[16px] font-black" style={{ color: INK }}>
              What to do this week
            </h2>
          </div>
          <ul className="space-y-2">
            {PRE_LAUNCH_CHECKLIST.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.href)}
                  className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[#f8fbff]"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: item.bg, color: item.accent }}
                  >
                    <item.icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 size={14} style={{ color: "#0d7a5f" }} />
                      ) : (
                        <Circle size={14} style={{ color: "#cbd5e1" }} />
                      )}
                      <span className="text-[13.5px] font-bold" style={{ color: INK }}>
                        {item.title}
                      </span>
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
                      {item.body}
                    </span>
                  </span>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 self-center rounded-full px-3 py-1 text-[11.5px] font-bold transition-transform group-hover:translate-x-0.5"
                    style={{ background: "#f3f7ff", color: NAVY }}
                  >
                    {item.cta}
                    <ArrowRight size={11} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Pipeline snapshot — demo */}
        <section
          className="rounded-2xl bg-white p-5"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-black" style={{ color: INK }}>
                Pipeline Snapshot
              </h2>
              <p className="text-[12px]" style={{ color: MUTED }}>
                Candidates by stage
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "#f3f5f9", color: MUTED }}
            >
              <Database size={11} /> Demo · empty until first promotions
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {DEMO_PIPELINE.map((p) => (
              <div
                key={p.stage}
                className="grid grid-cols-[130px_1fr_36px] items-center gap-3 text-[12px]"
              >
                <span className="font-semibold" style={{ color: "#26364d" }}>
                  {p.stage}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "#edf1f6" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.count / maxDemo) * 100}%`, background: BLUE }}
                  />
                </div>
                <span className="text-right font-bold" style={{ color: INK }}>
                  {p.count}
                </span>
              </div>
            ))}
            <div
              className="mt-3 flex items-center justify-between border-t pt-3 text-[13px] font-black"
              style={{ borderColor: "#eef2f6", color: INK }}
            >
              <span>Total Candidates</span>
              <span>{totalDemo}</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/candidate-pipeline")}
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold transition-transform hover:translate-x-0.5"
            style={{ color: NAVY }}
          >
            Open Candidate Pipeline <ArrowRight size={12} />
          </button>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
