import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Play, RefreshCw, Dice5 } from "lucide-react";
import {
  fetchOutliers,
  fetchRandomCity,
  fetchRules,
  HealthRule,
  OUTLIER_COLUMNS,
  OutlierColumn,
  RuleResult,
  runRule,
} from "@/lib/dbHealth/accuracy";
import { HealthStatus, statusColor } from "@/lib/dbHealth/thresholds";
import { StatusPill } from "./StatusPill";

/** Roll a single rule result up to a status. */
function ruleStatus(rule: HealthRule, result: RuleResult | undefined): HealthStatus {
  if (!result) return "unknown";
  const isPass = rule.expected_zero ? result.count === 0 : result.count > 0;
  if (isPass) return "green";
  return rule.severity === "critical" ? "red" : "yellow";
}

export function AccuracyTab() {
  const [rules, setRules] = useState<HealthRule[]>([]);
  const [results, setResults] = useState<Record<string, RuleResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [loadingRules, setLoadingRules] = useState(true);

  const reload = async () => {
    setLoadingRules(true);
    try {
      const r = await fetchRules();
      setRules(r);
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, __load: String(e?.message ?? e) }));
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const runOne = async (name: string) => {
    setRunning((p) => ({ ...p, [name]: true }));
    setErrors((p) => ({ ...p, [name]: "" }));
    try {
      const r = await runRule(name);
      setResults((p) => ({ ...p, [name]: r }));
    } catch (e: any) {
      setErrors((p) => ({ ...p, [name]: String(e?.message ?? e) }));
    } finally {
      setRunning((p) => ({ ...p, [name]: false }));
    }
  };

  const runAll = async () => {
    await Promise.all(rules.map((r) => runOne(r.name)));
  };

  return (
    <div className="grid gap-4">
      <InvariantsPanel
        rules={rules}
        results={results}
        errors={errors}
        running={running}
        loading={loadingRules}
        onRunOne={runOne}
        onRunAll={runAll}
        onReload={reload}
      />
      <SampleInspector />
      <OutliersPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

function InvariantsPanel(props: {
  rules: HealthRule[];
  results: Record<string, RuleResult>;
  errors: Record<string, string>;
  running: Record<string, boolean>;
  loading: boolean;
  onRunOne: (name: string) => void;
  onRunAll: () => void;
  onReload: () => void;
}) {
  const { rules, results, errors, running, loading, onRunOne, onRunAll, onReload } = props;

  const summary = rules.reduce(
    (acc, r) => {
      const s = ruleStatus(r, results[r.name]);
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<HealthStatus, number>,
  );

  return (
    <section className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] font-black text-[#0b1a36]">Invariants</h2>
          <p className="text-[12px] text-[#526078]">
            Rules that should always be true. A rule passes when its query returns
            zero violating rows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["green", "yellow", "red", "unknown"] as HealthStatus[]).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[11px] text-[#526078]"
            >
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: statusColor(s) }}
                aria-hidden
              />
              {summary[s] ?? 0}
            </span>
          ))}
          <button
            onClick={onRunAll}
            disabled={loading || rules.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <Play size={11} />
            Run all
          </button>
          <button
            onClick={onReload}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <RefreshCw size={11} />
            Reload rules
          </button>
        </div>
      </header>

      {loading && <div className="text-[12px] text-[#526078]">Loading rules…</div>}
      {!loading && rules.length === 0 && (
        <div className="text-[12px] text-[#526078]">No rules defined.</div>
      )}

      <ul className="divide-y divide-[#eef2f7]">
        {rules.map((r) => (
          <RuleRow
            key={r.name}
            rule={r}
            result={results[r.name]}
            error={errors[r.name]}
            running={!!running[r.name]}
            onRun={() => onRunOne(r.name)}
          />
        ))}
      </ul>
    </section>
  );
}

function RuleRow({
  rule,
  result,
  error,
  running,
  onRun,
}: {
  rule: HealthRule;
  result: RuleResult | undefined;
  error?: string;
  running: boolean;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(false);
  const status = ruleStatus(rule, result);
  const color = statusColor(status);

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 inline-block rounded-full shrink-0"
          style={{ width: 8, height: 8, background: color, boxShadow: `0 0 0 3px ${color}22` }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[13px] font-bold text-[#0b1a36]">{rule.name}</span>
              <span className="ml-2 text-[10px] uppercase tracking-wide text-[#526078]">
                {rule.severity}
              </span>
            </div>
            <span className="text-[12px] text-[#0b1a36] tabular-nums">
              {result
                ? `${result.count} violation${result.count === 1 ? "" : "s"}`
                : "not yet run"}
            </span>
          </div>
          <p className="text-[12px] text-[#526078] mt-0.5">{rule.description}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-[11px] text-[#0757ff] hover:underline"
            >
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Show query
            </button>
            <button
              onClick={onRun}
              disabled={running}
              className="text-[11px] text-[#526078] hover:text-[#0b1a36] hover:underline disabled:opacity-50"
            >
              {running ? "Running…" : "Run"}
            </button>
          </div>
          {open && (
            <pre className="mt-2 max-w-full overflow-x-auto rounded-md bg-[#f7faff] p-2 text-[11px] text-[#0b1a36] whitespace-pre-wrap">
              {rule.sql}
            </pre>
          )}
          {error && (
            <div className="text-[11px] text-[#dc2626] mt-1 break-words">error: {error}</div>
          )}
          {result && result.count > 0 && result.rows.length > 0 && (
            <details className="mt-2">
              <summary className="text-[11px] text-[#0757ff] cursor-pointer hover:underline">
                Show {Math.min(result.rows.length, 10)} of {result.count} violating rows
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-[#f7faff] p-2 text-[10px] text-[#0b1a36]">
                {JSON.stringify(result.rows.slice(0, 10), null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sample inspector
// ---------------------------------------------------------------------------

function SampleInspector() {
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchRandomCity();
      setRow(r);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] font-black text-[#0b1a36]">Sample inspector</h2>
          <p className="text-[12px] text-[#526078]">
            Pull one random scored city with every raw column. Use this to eyeball
            data quality.
          </p>
        </div>
        <button
          onClick={roll}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
        >
          <Dice5 size={12} />
          {loading ? "Rolling…" : row ? "Roll again" : "Pick a random city"}
        </button>
      </header>
      {error && <div className="text-[11px] text-[#dc2626]">{error}</div>}
      {row && (
        <div>
          <div className="text-[13px] font-bold text-[#0b1a36] mb-2">
            {String(row.city_name ?? "—")}, {String(row.state_abbr ?? "—")}{" "}
            <span className="ml-1 text-[11px] font-normal text-[#526078]">
              composite {String(row.composite_score_default ?? "—")}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            {Object.entries(row)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-[#f1f5fb] py-0.5">
                  <span className="text-[#526078] truncate">{k}</span>
                  <span className="text-[#0b1a36] tabular-nums truncate max-w-[60%] text-right">
                    {v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Outliers
// ---------------------------------------------------------------------------

function OutliersPanel() {
  const [column, setColumn] = useState<OutlierColumn>("composite_score_default");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchOutliers(column);
      setRows(r.rows);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] font-black text-[#0b1a36]">Outliers (&gt;3σ)</h2>
          <p className="text-[12px] text-[#526078]">
            Cities more than 3 standard deviations from the national mean on the
            chosen column.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={column}
            onChange={(e) => setColumn(e.target.value as OutlierColumn)}
            className="rounded-md border border-[#eef2f7] bg-white px-2 py-1 text-[11px] text-[#0b1a36]"
          >
            {OUTLIER_COLUMNS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <Play size={11} />
            {loading ? "Running…" : "Find outliers"}
          </button>
        </div>
      </header>
      {error && <div className="text-[11px] text-[#dc2626]">{error}</div>}
      {rows.length === 0 && !loading && (
        <div className="text-[12px] text-[#526078]">No outliers found (or not run).</div>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-[#eef2f7]">
          {rows.map((r, i) => (
            <li key={i} className="py-1.5 flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-[#0b1a36] truncate">
                {String(r.city_name ?? "—")}, {String(r.state_abbr ?? "—")}
              </span>
              <span className="tabular-nums text-[#526078]">
                value {String(r.val ?? "—")} · z={Number(r.z ?? 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
