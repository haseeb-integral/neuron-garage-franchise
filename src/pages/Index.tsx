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
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { calibrateCompositeForDisplay } from "@/lib/marketView";

/**
 * Dashboard — pre-launch console for Sam and Kaylie.
 *
 * Three real-data features (City Search, Teacher Search, Email Outreach) get
 * rich, live widgets. Candidate Pipeline stays demo because real candidates
 * are still weeks away (mailbox warm-up in progress).
 */

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const YELLOW = "#FFD400";
const INK = "#0b1a36";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";

// ---------- Live data hooks ------------------------------------------------

function useCitySearchSummary() {
  return useQuery({
    queryKey: ["dashboard", "city-summary"],
    staleTime: 60_000,
    queryFn: async () => {
      const [scored, registration, states] = await Promise.all([
        supabase.from("us_cities_scored").select("id", { count: "exact", head: true }),
        supabase
          .from("us_cities_scored")
          .select("id", { count: "exact", head: true })
          .eq("is_registration_state", true),
        supabase.from("us_cities_scored").select("state_abbr"),
      ]);
      const uniqueStates = new Set((states.data ?? []).map((r) => r.state_abbr));
      return {
        total: scored.count ?? 0,
        registration: registration.count ?? 0,
        states: uniqueStates.size,
      };
    },
  });
}

function useTopCities() {
  return useQuery({
    queryKey: ["dashboard", "top-cities"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("us_cities_scored")
        .select("id, city_name, state_abbr, composite_score_default, is_registration_state")
        .not("composite_score_default", "is", null)
        .order("composite_score_default", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
}

function useTeacherSearchSummary() {
  return useQuery({
    queryKey: ["dashboard", "teacher-summary"],
    staleTime: 60_000,
    queryFn: async () => {
      const [total, verified, needs] = await Promise.all([
        supabase.from("teacher_prospects").select("id", { count: "exact", head: true }),
        supabase
          .from("teacher_prospects")
          .select("id", { count: "exact", head: true })
          .eq("verification_status", "valid"),
        supabase
          .from("teacher_prospects")
          .select("id", { count: "exact", head: true })
          .eq("needs_email_enrichment", true),
      ]);
      const t = total.count ?? 0;
      const v = verified.count ?? 0;
      const n = needs.count ?? 0;
      const other = Math.max(0, t - v - n);
      return { total: t, verified: v, needs: n, other };
    },
  });
}

function useTopTeacherCities() {
  return useQuery({
    queryKey: ["dashboard", "top-teacher-cities"],
    staleTime: 60_000,
    queryFn: async () => {
      // Pull a sample and aggregate client-side (cap 1000 default is fine for top-N display).
      const { data } = await supabase
        .from("teacher_prospects")
        .select("city, state")
        .not("city", "is", null)
        .limit(1000);
      const counts = new Map<string, { city: string; state: string; n: number }>();
      (data ?? []).forEach((r) => {
        const key = `${r.city}|${r.state}`;
        const prev = counts.get(key);
        if (prev) prev.n += 1;
        else counts.set(key, { city: r.city, state: r.state, n: 1 });
      });
      return Array.from(counts.values())
        .sort((a, b) => b.n - a.n)
        .slice(0, 6);
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
        .select("id, name, status")
        .neq("id", "smartlead_analytics_overview");
      if (error) return { campaigns: 0, active: 0, list: [] as Array<{ id: string; name: string | null; status: string | null }> };
      const list = (data ?? []) as Array<{ id: string; name: string | null; status: string | null }>;
      const active = list.filter((c) => /active|start/i.test(String(c.status ?? ""))).length;
      return { campaigns: list.length, active, list };
    },
  });
}

// ---------- Static framing -------------------------------------------------

const PRE_LAUNCH_CHECKLIST = [
  {
    id: "cities",
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
    title: "Confirm SmartLead mailbox health",
    body: "Mailboxes are in WARM-UP. Check reputation and daily sends before live teacher outreach begins.",
    cta: "Open Email Outreach",
    href: "/email-outreach",
    icon: Mail,
    accent: "#b88a00",
    bg: "#fff8d6",
  },
  {
    id: "pipeline",
    title: "Walk through the Candidate Pipeline",
    body: "The Kanban is live and ready. Real candidates land here once first replies come in.",
    cta: "Open Candidate Pipeline",
    href: "/candidate-pipeline",
    icon: Kanban,
    accent: "#7a4dff",
    bg: "#f0ecff",
  },
] as const;

// Demo pipeline shape — clearly labeled as sample data.
const DEMO_PIPELINE = [
  { stage: "New Lead", count: 12 },
  { stage: "Initial Qual", count: 7 },
  { stage: "Business Overview", count: 4 },
  { stage: "FDD Review", count: 3 },
  { stage: "Immersion", count: 2 },
  { stage: "Confirmation", count: 1 },
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

const WidgetCard = ({
  title,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  href,
  cta,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof MapPin;
  iconBg: string;
  iconColor: string;
  badge?: { label: string; bg: string; color: string };
  href?: string;
  cta?: string;
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  return (
    <section
      className="flex flex-col rounded-2xl bg-white p-5"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: iconBg, color: iconColor }}
          >
            <Icon size={17} />
          </span>
          <div>
            <h3 className="text-[14px] font-black leading-tight" style={{ color: INK }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11.5px]" style={{ color: MUTED }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {badge && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {href && cta && (
        <button
          onClick={() => navigate(href)}
          className="mt-4 inline-flex items-center gap-1.5 self-start text-[12px] font-bold transition-transform hover:translate-x-0.5"
          style={{ color: NAVY }}
        >
          {cta} <ArrowRight size={12} />
        </button>
      )}
    </section>
  );
};

const SkeletonRows = ({ n = 5 }: { n?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="h-7 animate-pulse rounded-md" style={{ background: SOFT }} />
    ))}
  </div>
);

// ---------- Page -----------------------------------------------------------

const Dashboard = () => {
  const navigate = useNavigate();

  const cities = useCitySearchSummary();
  const topCities = useTopCities();
  const teachers = useTeacherSearchSummary();
  const topTeacherCities = useTopTeacherCities();
  const outreach = useEmailOutreachSummary();

  const totalDemo = DEMO_PIPELINE.reduce((s, p) => s + p.count, 0);
  const maxDemo = Math.max(1, ...DEMO_PIPELINE.map((p) => p.count));
  const maxTopCity = Math.max(1, ...(topCities.data ?? []).map((c) => c.composite_score_default ?? 0));
  const maxTeacherCity = Math.max(1, ...(topTeacherCities.data ?? []).map((c) => c.n));

  const tTotal = teachers.data?.total ?? 0;
  const tVerified = teachers.data?.verified ?? 0;
  const tNeeds = teachers.data?.needs ?? 0;
  const tOther = teachers.data?.other ?? 0;
  const pct = (n: number) => (tTotal > 0 ? Math.round((n / tTotal) * 100) : 0);

  const statusStyle = (status: string | null | undefined) => {
    const s = String(status ?? "").toLowerCase();
    if (/active|start/.test(s)) return { bg: "#dcf5e6", color: "#0d7a5f", label: "Active" };
    if (/paus/.test(s)) return { bg: "#fff1d6", color: "#9a6a00", label: "Paused" };
    if (/stop/.test(s)) return { bg: "#fde2e2", color: "#a83232", label: "Stopped" };
    if (/draft/.test(s)) return { bg: "#eef4ff", color: BLUE, label: "Draft" };
    return { bg: "#f3f5f9", color: MUTED, label: status || "—" };
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-4">
      <PageHeader
        title="Welcome to Neuron Garage"
        subtitle="Pre-launch console for Sam and Kaylie — lock the cities, stack the teachers, get the mailboxes warm. Real outreach starts the day warm-up clears."
      />

      {/* Pre-launch banner */}
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
                Sending mailboxes are seasoning with internal staff and the SmartLead warm-up pool. Use this window
                to finish picking cities and to keep the teacher database growing — so the day we go live, every
                send hits a verified inbox in a market we actually want.
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

      {/* Four KPI feature tiles */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          onClick={() => navigate("/city-scoring")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#dcf5e6", color: "#0d7a5f" }}>
              <MapPin size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#0d7a5f" }}>
              Live data
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>City Search</h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>Where should we open next?</p>
          <div className="mt-4">
            <Stat
              label="Cities scored"
              value={cities.isLoading ? "…" : fmt(cities.data?.total)}
              hint={cities.isLoading ? " " : `${fmt(cities.data?.states)} states · ${fmt(cities.data?.registration)} in registration states`}
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Rank markets <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          onClick={() => navigate("/teacher-prospects")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#eef4ff", color: BLUE }}>
              <Users size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: BLUE }}>
              Live data
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>Teacher Search</h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>Who in those cities should we talk to?</p>
          <div className="mt-4">
            <Stat
              label="Teachers in master DB"
              value={teachers.isLoading ? "…" : fmt(teachers.data?.total)}
              hint={teachers.isLoading ? " " : `${fmt(teachers.data?.verified)} verified · ${fmt(teachers.data?.needs)} need enrichment`}
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Find prospects <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          onClick={() => navigate("/email-outreach")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#fff8d6", color: "#b88a00" }}>
              <Send size={20} />
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ background: "#fff8d6", color: "#7a5c00" }}>
              Warm-up
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>Email Outreach</h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>How do we start the conversation?</p>
          <div className="mt-4">
            <Stat
              label="SmartLead campaigns"
              value={outreach.isLoading ? "…" : fmt(outreach.data?.campaigns)}
              hint={outreach.isLoading ? " " : `${fmt(outreach.data?.active)} active · mailboxes seasoning`}
            />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Review campaigns <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          onClick={() => navigate("/candidate-pipeline")}
          className="group rounded-2xl bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#f0ecff", color: "#7a4dff" }}>
              <Kanban size={20} />
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ background: "#f3f5f9", color: MUTED }}>
              Demo data
            </span>
          </div>
          <h3 className="mt-4 text-[14px] font-black" style={{ color: INK }}>Candidate Pipeline</h3>
          <p className="mt-0.5 text-[12px] italic" style={{ color: MUTED }}>Who's getting close to signing?</p>
          <div className="mt-4">
            <Stat label="Sample candidates" value={String(totalDemo)} hint="Real candidates arrive after first replies" />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
            Tour the board <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* LIVE SIGNALS — three real-data widgets */}
      <div className="flex items-center gap-2 pt-1">
        <Sparkles size={15} style={{ color: BLUE }} />
        <h2 className="text-[15px] font-black" style={{ color: INK }}>Live signals</h2>
        <span className="text-[11.5px]" style={{ color: MUTED }}>real data, refreshed every minute</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Top scored cities */}
        <WidgetCard
          title="Top scored cities"
          subtitle="Composite Score / 100"
          icon={Trophy}
          iconBg="#fff8d6"
          iconColor="#b88a00"
          badge={{ label: "Live", bg: "#dcf5e6", color: "#0d7a5f" }}
          href="/city-scoring"
          cta="See full ranking"
        >
          {topCities.isLoading ? (
            <SkeletonRows />
          ) : (topCities.data ?? []).length === 0 ? (
            <p className="text-[12.5px]" style={{ color: MUTED }}>No scored cities yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {topCities.data!.map((c, i) => {
                const score = Math.round(calibrateCompositeForDisplay(c.composite_score_default ?? 0));
                return (
                  <li key={c.id} className="grid grid-cols-[18px_1fr_auto] items-center gap-2.5">
                    <span className="text-[11px] font-black" style={{ color: MUTED }}>{i + 1}.</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-bold" style={{ color: INK }}>
                          {c.city_name}
                        </span>
                        <span className="text-[11px]" style={{ color: MUTED }}>{c.state_abbr}</span>
                        {c.is_registration_state && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: "#dcf5e6", color: "#0d7a5f" }}
                          >
                            Reg
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "#eef2f7" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(score / maxTopCity) * 100}%`,
                            background: `linear-gradient(90deg, ${BLUE}, ${NAVY})`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="tabular-nums text-[13px] font-black" style={{ color: NAVY }}>{score}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </WidgetCard>

        {/* Teacher cities */}
        <WidgetCard
          title="Master DB · Top cities"
          subtitle="Teachers by city"
          icon={Users}
          iconBg="#eef4ff"
          iconColor={BLUE}
          badge={{ label: "Live", bg: "#dcf5e6", color: "#0d7a5f" }}
          href="/teacher-prospects"
          cta="Open Teacher Search"
        >
          {topTeacherCities.isLoading ? (
            <SkeletonRows />
          ) : (topTeacherCities.data ?? []).length === 0 ? (
            <p className="text-[12.5px]" style={{ color: MUTED }}>No teachers imported yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {topTeacherCities.data!.map((c) => (
                <li key={`${c.city}-${c.state}`} className="grid grid-cols-[1fr_auto] items-center gap-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-bold" style={{ color: INK }}>{c.city}</span>
                      <span className="text-[11px]" style={{ color: MUTED }}>{c.state}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "#eef2f7" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.n / maxTeacherCity) * 100}%`,
                          background: `linear-gradient(90deg, ${BLUE}, #7a4dff)`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="tabular-nums text-[13px] font-black" style={{ color: NAVY }}>{fmt(c.n)}</span>
                </li>
              ))}
            </ol>
          )}
        </WidgetCard>

        {/* Email enrichment quality */}
        <WidgetCard
          title="Email enrichment quality"
          subtitle="Master DB breakdown"
          icon={ShieldCheck}
          iconBg="#dcf5e6"
          iconColor="#0d7a5f"
          badge={{ label: "Live", bg: "#dcf5e6", color: "#0d7a5f" }}
          href="/teacher-prospects"
          cta="Triage prospects"
        >
          {teachers.isLoading ? (
            <SkeletonRows n={3} />
          ) : tTotal === 0 ? (
            <p className="text-[12.5px]" style={{ color: MUTED }}>No teachers in the master DB yet.</p>
          ) : (
            <div>
              {/* Stacked bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: "#eef2f7" }}>
                <div style={{ width: `${pct(tVerified)}%`, background: "#0d7a5f" }} />
                <div style={{ width: `${pct(tNeeds)}%`, background: "#e8a23a" }} />
                <div style={{ width: `${pct(tOther)}%`, background: "#cbd5e1" }} />
              </div>
              <ul className="mt-4 space-y-2 text-[12.5px]">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#0d7a5f" }} />
                    <span style={{ color: INK }}>Verified email</span>
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: INK }}>
                    {fmt(tVerified)} <span style={{ color: MUTED }}>· {pct(tVerified)}%</span>
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e8a23a" }} />
                    <span style={{ color: INK }}>Needs enrichment</span>
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: INK }}>
                    {fmt(tNeeds)} <span style={{ color: MUTED }}>· {pct(tNeeds)}%</span>
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#cbd5e1" }} />
                    <span style={{ color: INK }}>Other / unverified</span>
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: INK }}>
                    {fmt(tOther)} <span style={{ color: MUTED }}>· {pct(tOther)}%</span>
                  </span>
                </li>
              </ul>
              <div className="mt-3 flex items-center gap-1.5 text-[11.5px]" style={{ color: MUTED }}>
                <TrendingUp size={12} /> {fmt(tTotal)} total teachers tracked
              </div>
            </div>
          )}
        </WidgetCard>
      </div>

      {/* Checklist + SmartLead campaigns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl bg-white p-5" style={{ border: `1px solid ${BORDER}` }}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} style={{ color: BLUE }} />
            <h2 className="text-[16px] font-black" style={{ color: INK }}>What to do this week</h2>
          </div>
          <ul className="space-y-2">
            {PRE_LAUNCH_CHECKLIST.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.href)}
                  className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[#f8fbff]"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: item.bg, color: item.accent }}>
                    <item.icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <Circle size={14} style={{ color: "#cbd5e1" }} />
                      <span className="text-[13.5px] font-bold" style={{ color: INK }}>{item.title}</span>
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed" style={{ color: MUTED }}>{item.body}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full px-3 py-1 text-[11.5px] font-bold transition-transform group-hover:translate-x-0.5" style={{ background: "#f3f7ff", color: NAVY }}>
                    {item.cta}
                    <ArrowRight size={11} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <WidgetCard
          title="SmartLead campaigns"
          subtitle="Synced from SmartLead"
          icon={Send}
          iconBg="#fff8d6"
          iconColor="#b88a00"
          badge={{ label: "Live", bg: "#dcf5e6", color: "#0d7a5f" }}
          href="/email-outreach"
          cta="Open Email Outreach"
        >
          {outreach.isLoading ? (
            <SkeletonRows n={6} />
          ) : (outreach.data?.list ?? []).length === 0 ? (
            <p className="text-[12.5px]" style={{ color: MUTED }}>No campaigns synced yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {outreach.data!.list.slice(0, 6).map((c) => {
                const s = statusStyle(c.status);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
                    style={{ background: SOFT }}
                  >
                    <span className="min-w-0 truncate text-[12.5px] font-semibold" style={{ color: INK }}>
                      {c.name || `Campaign ${c.id}`}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </WidgetCard>
      </div>

      {/* Pipeline Snapshot — DEMO only */}
      <section className="rounded-2xl bg-white p-5" style={{ border: `1px solid ${BORDER}` }}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#f0ecff", color: "#7a4dff" }}>
              <Kanban size={17} />
            </span>
            <div>
              <h2 className="text-[15px] font-black" style={{ color: INK }}>Pipeline Snapshot</h2>
              <p className="text-[11.5px]" style={{ color: MUTED }}>Candidates by stage — demo numbers while we wait for first replies</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ background: "#f3f5f9", color: MUTED }}>
            <Database size={11} /> Demo data
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-4 xl:grid-cols-7">
          {DEMO_PIPELINE.map((p) => (
            <div key={p.stage}>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{p.stage}</span>
                <span className="tabular-nums text-[14px] font-black" style={{ color: INK }}>{p.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: "#edf1f6" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(p.count / maxDemo) * 100}%`,
                    background: `linear-gradient(90deg, #7a4dff, ${BLUE})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3 text-[12.5px]" style={{ borderColor: "#eef2f6" }}>
          <span style={{ color: MUTED }}>
            <span className="font-bold" style={{ color: INK }}>{totalDemo}</span> sample candidates across 7 stages
          </span>
          <button
            onClick={() => navigate("/candidate-pipeline")}
            className="inline-flex items-center gap-1.5 font-bold transition-transform hover:translate-x-0.5"
            style={{ color: NAVY }}
          >
            Open Candidate Pipeline <ArrowRight size={12} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
