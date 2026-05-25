// ============================================================================
// Tier 3 — Alerts & History. Polished wrapper around existing history,
// incidents, and subscription primitives. Used inside /observability.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Play, RotateCw, Activity, AlertOctagon, CheckCircle2 } from "lucide-react";
import {
  addSubscription, fetchHistory, fetchIncidents, fetchSubscriptions,
  HistoryRow, IncidentRow, removeSubscription, runSnapshotNow, Subscription,
} from "@/lib/dbHealth/history";
import { fetchRules, HealthRule } from "@/lib/dbHealth/accuracy";
import { statusColor } from "@/lib/dbHealth/thresholds";
import { Sparkline } from "@/components/dbHealth/Sparkline";
import { AskAiButton } from "@/components/observability/ObservabilityAi";
import { InfoHint, FriendlyErrorPanel } from "@/components/observability/InfoHint";
import { friendlyError } from "@/lib/dbHealth/friendlyError";


const TRACKED_DOMAINS: { key: string; label: string }[] = [
  { key: "us_cities_scored", label: "City Scores" },
  { key: "us_cities_geo", label: "City Geo Reference" },
  { key: "teacher_prospects", label: "Teachers" },
  { key: "public_schools", label: "Public Schools" },
  { key: "candidates", label: "Candidates" },
  { key: "rules", label: "Invariant Rules" },
];

export function AlertsSection() {
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [rules, setRules] = useState<HealthRule[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [busy, setBusy] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const [inc, sb, rl] = await Promise.all([
        fetchIncidents(),
        fetchSubscriptions(),
        fetchRules(),
      ]);
      setIncidents(inc);
      setSubs(sb);
      setRules(rl);
      const histEntries = await Promise.all(
        TRACKED_DOMAINS.map(async (d) => [d.key, await fetchHistory(d.key, 30)] as const),
      );
      setHistory(Object.fromEntries(histEntries));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const snapshotNow = async () => {
    setSnapshotting(true);
    try {
      await runSnapshotNow();
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSnapshotting(false);
    }
  };

  const isSubscribed = (opts: { rule_name?: string; domain?: string }) =>
    subs.find(
      (s) =>
        (s.rule_name ?? null) === (opts.rule_name ?? null) &&
        (s.domain ?? null) === (opts.domain ?? null),
    );

  const toggleSub = async (opts: { rule_name?: string; domain?: string }) => {
    const existing = isSubscribed(opts);
    try {
      if (existing) await removeSubscription(existing.id);
      else await addSubscription(opts);
      setSubs(await fetchSubscriptions());
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const openIncidents = useMemo(() => incidents.filter((i) => !i.closed_at), [incidents]);

  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-black tracking-tight text-[#07142f]">Alerts &amp; History</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[#526078]">
            Status &amp; Accuracy tell you about <em>now</em>. This remembers the past and asks to be told about the
            future. Snapshots run automatically every six hours; subscribe to anything you want to be notified about.
          </p>
        </div>
        <AskAiButton
          section="alerts"
          sectionLabel="Alerts & History"
          suggestions={[
            "How many incidents opened in the last 7 days?",
            "Which incidents are still open?",
            "Show the 30-day trend for teacher_prospects",
            "What am I subscribed to?",
          ]}
        />
      </header>



      {error && (() => {
        const f = friendlyError(error);
        return <FriendlyErrorPanel message={f.message} hint={f.hint} onRetry={loadAll} />;
      })()}

      {/* ── 30-day history ──────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[#eef2f7] bg-white p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[16px] font-black text-[#0b1a36]">30-day history</h3>
              <InfoHint title="How to read a sparkline">
                Each tiny tick is one snapshot from a 6-hour interval. Read left-to-right: oldest to newest.
                A flat green line is what you want. A patch of red means a check was failing at that point — hover the
                sparkline for the exact timestamps.
              </InfoHint>
            </div>
            <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-[#526078]">
              One snapshot every six hours. Each tick below is one snapshot, oldest
              on the left. Green is healthy, yellow is a warning, red means at
              least one check failed at that point in time.
            </p>
          </div>
          <button
            onClick={snapshotNow}
            disabled={snapshotting || busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <Play size={11} />
            {snapshotting ? "Snapshotting…" : "Take a snapshot now"}
          </button>
        </header>

        <ul className="mt-5 divide-y divide-[#eef2f7] rounded-2xl border border-[#eef2f7]">
          {TRACKED_DOMAINS.map((d) => {
            const rows = history[d.key] ?? [];
            const last = rows[rows.length - 1];
            const subscribed = isSubscribed({ domain: d.key });
            return (
              <li
                key={d.key}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-[180px]">
                  <div className="text-[13px] font-bold text-[#0b1a36]">{d.label}</div>
                  <div className="mt-0.5 text-[11px] text-[#526078]">
                    {rows.length} snapshot{rows.length === 1 ? "" : "s"}
                    {last && (
                      <>
                        {" · last "}
                        <span style={{ color: statusColor(last.status) }} className="font-bold">
                          {last.status}
                        </span>
                        {" "}
                        {new Date(last.ts).toLocaleString()}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex justify-center min-w-[220px]">
                  <Sparkline rows={rows} />
                </div>
                <button
                  onClick={() => toggleSub({ domain: d.key })}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    subscribed
                      ? "bg-[#0757ff]/10 text-[#0757ff] hover:bg-[#0757ff]/15"
                      : "border border-[#eef2f7] bg-white text-[#0b1a36] hover:bg-[#f7faff]"
                  }`}
                  title={subscribed ? "Stop notifications" : "Notify me when this goes red"}
                >
                  {subscribed ? <Bell size={12} /> : <BellOff size={12} />}
                  {subscribed ? "Subscribed" : "Notify me"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Incidents ───────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[#eef2f7] bg-white p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[16px] font-black text-[#0b1a36]">Incidents</h3>
              <InfoHint title="What counts as an incident?">
                Anything that stayed red for at least one full snapshot (so brief blips don't count). Open incidents
                are still happening; closed ones resolved themselves when the underlying check went green again.
                Use this as your "what was actually broken, and for how long" log.
              </InfoHint>
            </div>
            <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-[#526078]">
              Every time a check stayed red across a snapshot, it's recorded here.
              Open incidents are at the top; they close automatically when the
              underlying check goes green again.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7faff] px-3 py-1 text-[11px] text-[#526078]">
              <AlertOctagon size={12} className="text-[#dc2626]" />
              <strong className="tabular-nums text-[#0b1a36]">{openIncidents.length}</strong> open
            </span>
            <button
              onClick={loadAll}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
            >
              <RotateCw size={11} className={busy ? "animate-spin" : ""} /> Reload
            </button>
          </div>
        </header>

        {incidents.length === 0 ? (
          <div className="mt-5 rounded-xl bg-[#f7faff] p-4 text-[12px] text-[#526078]">
            <CheckCircle2 size={14} className="-mt-0.5 mr-1 inline text-[#16a34a]" />
            No incidents recorded. Everything has been within expected ranges.
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-[#eef2f7] rounded-2xl border border-[#eef2f7]">
            {incidents.map((i) => {
              const ongoing = !i.closed_at;
              return (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px]"
                >
                  <div className="min-w-0">
                    <span
                      className="mr-2 inline-block rounded-full align-middle"
                      style={{
                        width: 8, height: 8,
                        background: ongoing ? "#dc2626" : "#94a3b8",
                        boxShadow: ongoing ? "0 0 0 3px #dc262622" : undefined,
                      }}
                      aria-hidden
                    />
                    <span className="font-bold text-[#0b1a36]">{i.domain}</span>
                    <span className="text-[#526078]"> · {i.metric}</span>
                    {i.notes && <span className="text-[#526078]"> · {i.notes}</span>}
                  </div>
                  <div className="text-[11px] tabular-nums text-[#526078]">
                    {new Date(i.opened_at).toLocaleString()}
                    {i.closed_at && <> → {new Date(i.closed_at).toLocaleString()}</>}
                    {ongoing && (
                      <span className="ml-2 font-bold text-[#dc2626]">ongoing</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Rule subscriptions ──────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[#eef2f7] bg-white p-6">
        <header>
          <h3 className="text-[16px] font-black text-[#0b1a36]">Rule subscriptions</h3>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#526078]">
            Pick the specific invariants you care about. We record your subscription
            now; email delivery turns on as soon as we wire a sender (one short
            follow-up). In the meantime, this is the source of truth for who wants
            to know about what.
          </p>
        </header>
        {rules.length === 0 ? (
          <div className="mt-4 rounded-xl bg-[#f7faff] p-4 text-[12px] text-[#526078]">
            No rules defined yet. Add some in <strong>Tier 2 · Invariants</strong> above.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#eef2f7] rounded-2xl border border-[#eef2f7]">
            {rules.map((r) => {
              const sub = isSubscribed({ rule_name: r.name });
              return (
                <li
                  key={r.name}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[12px]"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[#0b1a36]">{r.name}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-[#526078]">
                      {r.description}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSub({ rule_name: r.name })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                      sub
                        ? "bg-[#0757ff]/10 text-[#0757ff] hover:bg-[#0757ff]/15"
                        : "border border-[#eef2f7] bg-white text-[#0b1a36] hover:bg-[#f7faff]"
                    }`}
                  >
                    {sub ? <Bell size={12} /> : <BellOff size={12} />}
                    {sub ? "Subscribed" : "Notify me"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Cadence footnote ────────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-[#94a3b8]">
        <Activity size={11} className="-mt-0.5 mr-1 inline" />
        Automatic snapshots run every 6 hours. You can also press <strong>Take a
        snapshot now</strong> above at any time.
      </p>
    </div>
  );
}
