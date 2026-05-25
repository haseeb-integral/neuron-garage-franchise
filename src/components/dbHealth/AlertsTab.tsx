import { useEffect, useState } from "react";
import { Bell, BellOff, Play, RotateCw } from "lucide-react";
import {
  addSubscription,
  fetchHistory,
  fetchIncidents,
  fetchSubscriptions,
  HistoryRow,
  IncidentRow,
  removeSubscription,
  runSnapshotNow,
  Subscription,
} from "@/lib/dbHealth/history";
import { fetchRules, HealthRule } from "@/lib/dbHealth/accuracy";
import { Sparkline } from "./Sparkline";
import { statusColor } from "@/lib/dbHealth/thresholds";

const TRACKED_DOMAINS = [
  "us_cities_scored",
  "us_cities_geo",
  "teacher_prospects",
  "public_schools",
  "candidates",
  "rules",
];

export function AlertsTab() {
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [rules, setRules] = useState<HealthRule[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [busy, setBusy] = useState(false);
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
        TRACKED_DOMAINS.map(async (d) => [d, await fetchHistory(d, 30)] as const),
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
    setBusy(true);
    try {
      await runSnapshotNow();
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
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

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[15px] font-black text-[#0b1a36]">30-day history</h2>
            <p className="text-[12px] text-[#526078]">
              One snapshot every 6 hours. Each tick is green, yellow, or red.
            </p>
          </div>
          <button
            onClick={snapshotNow}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <Play size={11} />
            Snapshot now
          </button>
        </header>
        {error && <div className="text-[11px] text-[#dc2626] mb-2">{error}</div>}
        <ul className="divide-y divide-[#eef2f7]">
          {TRACKED_DOMAINS.map((d) => {
            const rows = history[d] ?? [];
            const last = rows[rows.length - 1];
            return (
              <li key={d} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#0b1a36]">{d}</div>
                  <div className="text-[11px] text-[#526078]">
                    {rows.length} snapshots
                    {last && (
                      <>
                        {" · last "}
                        <span style={{ color: statusColor(last.status) }}>{last.status}</span>
                        {" "}
                        {new Date(last.ts).toLocaleString()}
                      </>
                    )}
                  </div>
                </div>
                <Sparkline rows={rows} />
                <button
                  onClick={() => toggleSub({ domain: d })}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0b1a36] hover:underline"
                  title={isSubscribed({ domain: d }) ? "Unsubscribe" : "Notify me on red"}
                >
                  {isSubscribed({ domain: d }) ? <Bell size={12} /> : <BellOff size={12} />}
                  {isSubscribed({ domain: d }) ? "Subscribed" : "Notify me"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[15px] font-black text-[#0b1a36]">Incidents</h2>
            <p className="text-[12px] text-[#526078]">
              Every period a metric stayed red. Open incidents are at the top.
            </p>
          </div>
          <button
            onClick={loadAll}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <RotateCw size={11} className={busy ? "animate-spin" : ""} />
            Reload
          </button>
        </header>
        {incidents.length === 0 ? (
          <div className="text-[12px] text-[#526078]">No incidents recorded.</div>
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {incidents.map((i) => {
              const ongoing = !i.closed_at;
              return (
                <li key={i.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <div className="min-w-0">
                    <span
                      className="inline-block rounded-full mr-2 align-middle"
                      style={{
                        width: 8,
                        height: 8,
                        background: ongoing ? "#dc2626" : "#94a3b8",
                      }}
                      aria-hidden
                    />
                    <span className="font-bold text-[#0b1a36]">{i.domain}</span>
                    <span className="text-[#526078]"> · {i.metric}</span>
                    {i.notes && <span className="text-[#526078]"> · {i.notes}</span>}
                  </div>
                  <div className="text-[11px] text-[#526078] tabular-nums">
                    {new Date(i.opened_at).toLocaleString()}
                    {i.closed_at && (
                      <> → {new Date(i.closed_at).toLocaleString()}</>
                    )}
                    {ongoing && (
                      <span className="ml-2 text-[#dc2626] font-bold">ongoing</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5">
        <header className="mb-3">
          <h2 className="text-[15px] font-black text-[#0b1a36]">Rule subscriptions</h2>
          <p className="text-[12px] text-[#526078]">
            Get notified when a specific invariant rule starts failing. Email delivery
            requires a Resend API key — until then, subscriptions are recorded but
            not emailed.
          </p>
        </header>
        <ul className="divide-y divide-[#eef2f7]">
          {rules.map((r) => {
            const sub = isSubscribed({ rule_name: r.name });
            return (
              <li
                key={r.name}
                className="py-2 flex flex-wrap items-center justify-between gap-2 text-[12px]"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#0b1a36]">{r.name}</div>
                  <div className="text-[11px] text-[#526078]">{r.description}</div>
                </div>
                <button
                  onClick={() => toggleSub({ rule_name: r.name })}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0b1a36] hover:underline"
                >
                  {sub ? <Bell size={12} /> : <BellOff size={12} />}
                  {sub ? "Subscribed" : "Notify me"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
