import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, CalendarClock, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fromDbStage } from "@/lib/stageDbMapping";
import { PORTAL_STEPS, stageToStep, stepState, type PortalStep, type StepState } from "@/lib/portalPath";
import logo from "@/assets/neuron-garage-logo.png";

interface PathData {
  first_name: string | null;
  stage: string;
  step_dates: Record<string, string>;
  next_call: { starts_at: string; duration_minutes: number; all_day: boolean; title: string; host: string | null } | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export default function PortalHome() {
  const { session, user, loading, accessChecked, role, portalCandidateId, signOut } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (portalCandidateId) supabase.rpc("portal_mark_activated").then(() => {});
  }, [portalCandidateId]);

  const path = useQuery({
    queryKey: ["portal-path", portalCandidateId],
    enabled: !!portalCandidateId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_my_path");
      if (error) throw error;
      return data as unknown as PathData | null;
    },
  });
  const ticks = useQuery({
    queryKey: ["portal-ticks", portalCandidateId],
    enabled: !!portalCandidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_portal_checklist").select("step_num, item_key").eq("candidate_id", portalCandidateId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => `${r.step_num}:${r.item_key}`));
    },
  });

  const toggle = async (step: number, key: string, label: string, on: boolean) => {
    if (!portalCandidateId || !user) return;
    if (on) {
      await supabase.from("candidate_portal_checklist").insert({
        candidate_id: portalCandidateId, step_num: step, item_key: key, item_label: label, done_by: user.id,
      });
    } else {
      await supabase.from("candidate_portal_checklist").delete()
        .eq("candidate_id", portalCandidateId).eq("step_num", step).eq("item_key", key);
    }
    qc.invalidateQueries({ queryKey: ["portal-ticks", portalCandidateId] });
  };

  if (loading || (session && !accessChecked)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!session) return <Navigate to="/auth" replace state={{ from: "/portal" }} />;
  if (!portalCandidateId) return <Navigate to={role ? "/" : "/auth"} replace />;

  const data = path.data;
  const current = data ? stageToStep(fromDbStage(data.stage)) : null;
  const closed = data && current === null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-portal-navy text-portal-navy-foreground">
        <div className="mx-auto max-w-5xl px-5 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Neuron Garage" className="h-10 w-auto rounded bg-background p-1" />
            <div>
              <div className="text-sm opacity-80">Neuron Garage</div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-wide">YOUR PATH TO OWNERSHIP</h1>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => signOut()}>Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 space-y-8">
        {data?.first_name && <p className="text-lg font-semibold">Welcome, {data.first_name}!</p>}
        <p className="text-muted-foreground">
          Our process is five conversations, designed so that you and we can both make an informed decision.
          After each call, you’ll have a few things to do before the next one.
        </p>

        {path.isLoading && <p className="text-sm text-muted-foreground">Loading your path…</p>}
        {path.isError && <p className="text-sm text-destructive">We couldn’t load your path. Please refresh the page.</p>}

        {closed && (
          <div className="rounded-xl border p-6 text-center space-y-2">
            <h2 className="text-lg font-semibold">This process is closed</h2>
            <p className="text-sm text-muted-foreground">
              Thank you for your time and interest in Neuron Garage. Your application process is now closed.
              If you have questions, please reach out to Skyler Bossen at 512-593-2750.
            </p>
          </div>
        )}

        {data && current !== null && (
          <>
            <NextCallCard call={data.next_call} />
            <ol className="relative">
              {PORTAL_STEPS.map((s, i) => (
                <StepRow
                  key={s.num}
                  step={s}
                  state={stepState(s.num, current)}
                  last={i === PORTAL_STEPS.length - 1}
                  date={data.step_dates?.[String(s.num)]}
                  ticked={ticks.data ?? new Set()}
                  onToggle={toggle}
                />
              ))}
            </ol>
            <p className="text-center text-xl font-bold text-portal-navy">Welcome to Neuron Garage!</p>
          </>
        )}
      </main>

      <footer className="border-t mt-8">
        <div className="mx-auto max-w-5xl px-5 py-5 flex flex-col md:flex-row gap-2 justify-between text-xs text-muted-foreground">
          <span>Neuron Garage Franchise Support, LLC · neurongaragefranchise.com · Franchise@NeuronGarage.com</span>
          <span className="font-medium">Questions? Skyler Bossen · 512-593-2750</span>
        </div>
      </footer>
    </div>
  );
}

function NextCallCard({ call }: { call: PathData["next_call"] }) {
  return (
    <section className="rounded-xl bg-portal-navy text-portal-navy-foreground p-5 flex items-start gap-4">
      <CalendarClock className="h-7 w-7 shrink-0 text-portal-yellow" />
      {call ? (
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider opacity-80">Your next call</div>
          <div className="text-lg font-bold">{call.title}</div>
          <div className="text-sm">
            {fmtDate(call.starts_at)}
            {!call.all_day && <> · {fmtTime(call.starts_at)}</>}
            {call.duration_minutes ? <> · {call.duration_minutes} minutes</> : null}
          </div>
          {call.host && <div className="text-sm opacity-90">With {call.host}</div>}
        </div>
      ) : (
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">Your next call</div>
          <div className="text-sm mt-1">No call is scheduled yet. We’ll reach out to set one up.</div>
        </div>
      )}
    </section>
  );
}

function StepRow({ step, state, last, date, ticked, onToggle }: {
  step: PortalStep; state: StepState; last: boolean; date?: string;
  ticked: Set<string>; onToggle: (s: number, k: string, l: string, on: boolean) => void;
}) {
  const locked = state === "locked";
  const circle =
    state === "current"
      ? "bg-portal-yellow text-portal-yellow-foreground ring-4 ring-portal-yellow/30"
      : state === "done"
        ? "bg-portal-navy text-portal-navy-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <li className="relative flex gap-4 pb-8">
      {!last && <span aria-hidden className="absolute left-6 top-12 bottom-0 border-l-2 border-dotted border-portal-navy/40" />}
      <div className={`relative z-10 h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-lg font-extrabold ${circle}`}>
        {state === "done" ? <Check className="h-6 w-6" /> : locked ? <Lock className="h-5 w-5" /> : step.num}
      </div>
      <div className={`flex-1 grid gap-4 md:grid-cols-[1.3fr_1fr] ${locked ? "opacity-60" : ""}`}>
        <div className={`rounded-xl border p-5 ${state === "current" ? "border-portal-yellow shadow-md" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold uppercase tracking-wide text-portal-navy">{step.title}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-portal-yellow/20 px-2.5 py-0.5 text-xs font-medium">
              <Clock className="h-3 w-3" /> {step.time}
            </span>
            {state === "done" && <span className="text-xs font-semibold text-muted-foreground">Completed</span>}
            {locked && <span className="text-xs text-muted-foreground">Unlocks later</span>}
          </div>
          {!locked && <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>}
          <p className="mt-3 text-sm"><span className="font-semibold">Date scheduled:</span>{" "}
            {date ? fmtDate(date) : <span className="text-muted-foreground">—</span>}
          </p>
        </div>
        {!locked && (
          <div className="rounded-xl bg-muted/50 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-portal-navy mb-3">{step.afterLabel}</div>
            <ul className="space-y-2.5">
              {step.items.map((it) => {
                const id = `${step.num}:${it.key}`;
                const on = ticked.has(id);
                return (
                  <li key={it.key} className="flex items-start gap-2.5">
                    <Checkbox id={id} checked={on} onCheckedChange={(v) => onToggle(step.num, it.key, it.label, !!v)} className="mt-0.5" />
                    <label htmlFor={id} className={`text-sm cursor-pointer ${on ? "line-through text-muted-foreground" : ""}`}>{it.label}</label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}
