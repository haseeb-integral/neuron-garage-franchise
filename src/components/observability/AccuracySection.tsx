// ============================================================================
// Tier 2 — Accuracy & Rules. Friendly, Ive-style wrappers around the existing
// db_health_rules + RPCs. Used inside /observability.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Dice5, Play, Plus, RefreshCw, Sparkles, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  fetchOutliers, fetchRandomCity, fetchRules, HealthRule, OUTLIER_COLUMNS,
  OutlierColumn, RuleResult, runRule,
} from "@/lib/dbHealth/accuracy";
import { supabase } from "@/integrations/supabase/client";
import { HealthStatus, statusColor } from "@/lib/dbHealth/thresholds";
import { friendlyError } from "@/lib/dbHealth/friendlyError";
import { InfoHint, FriendlyErrorPanel } from "@/components/observability/InfoHint";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function ruleStatus(rule: HealthRule, result?: RuleResult): HealthStatus {
  if (!result) return "unknown";
  const pass = rule.expected_zero ? result.count === 0 : result.count > 0;
  if (pass) return "green";
  return rule.severity === "critical" ? "red" : "yellow";
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

import { AskAiButton } from "@/components/observability/ObservabilityAi";

export function AccuracySection() {
  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-black tracking-tight text-[#07142f]">Accuracy &amp; Rules</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[#526078]">
            Status &amp; Structure tells you the data is there. This asks: is it correct? Each rule below is a single
            sentence that should always be true. If it isn't, we tell you exactly which rows broke it.
          </p>
        </div>
        <AskAiButton
          section="accuracy"
          sectionLabel="Accuracy & Rules"
          suggestions={[
            "Run every invariant and summarize what's failing",
            "Which critical rules are red?",
            "Find outliers in composite_score_default",
            "Pull a random scored city so I can sanity-check it",
          ]}
        />
      </header>
      <RulesBoard />
      <div className="grid gap-6 md:grid-cols-2">
        <SampleInspector />
        <OutlierFinder />
      </div>
    </div>
  );
}



// -----------------------------------------------------------------------------
// Rules board
// -----------------------------------------------------------------------------

function RulesBoard() {
  const [rules, setRules] = useState<HealthRule[]>([]);
  const [results, setResults] = useState<Record<string, RuleResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setRules(await fetchRules());
    } catch (e: any) {
      setErrors((p) => ({ ...p, __load: String(e?.message ?? e) }));
    } finally {
      setLoading(false);
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

  // Group by severity (critical → warning → info) — that's the natural priority.
  const groups = useMemo(() => {
    const order = ["critical", "warning", "info"];
    const by: Record<string, HealthRule[]> = {};
    for (const r of rules) (by[r.severity] ||= []).push(r);
    return order.filter((k) => by[k]?.length).map((k) => ({ severity: k, rules: by[k] }));
  }, [rules]);

  const summary = useMemo(() => {
    const s: Record<HealthStatus, number> = { green: 0, yellow: 0, red: 0, unknown: 0 };
    rules.forEach((r) => (s[ruleStatus(r, results[r.name])] += 1));
    return s;
  }, [rules, results]);

  return (
    <section className="rounded-3xl border border-[#eef2f7] bg-white p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[16px] font-black text-[#0b1a36]">Invariants</h3>
            <InfoHint title="What's an invariant?">
              A sentence about your data that should <strong>always</strong> be true — e.g. "every city has a non-negative
              population." We turn each one into a SQL query that looks for rows breaking the rule. <strong>Zero
              violating rows = pass.</strong> Run them whenever you suspect bad data, or before a demo.
            </InfoHint>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[#526078]">
            Each rule is a question we ask the database. A rule passes when the answer
            is "zero rows broke it". Click <strong>Show query</strong> to see the SQL.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SummaryDots summary={summary} />
          <button
            onClick={runAll}
            disabled={loading || rules.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <Play size={11} /> Run all rules
          </button>
          <button
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
            title="Reload the rules list"
          >
            <RefreshCw size={11} />
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0757ff] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#0445d6]"
          >
            <Plus size={12} /> Add rule
          </button>
        </div>
      </header>

      {loading && <div className="mt-4 text-[12px] text-[#526078]">Loading rules…</div>}
      {!loading && rules.length === 0 && (
        <div className="mt-4 rounded-xl bg-[#f7faff] p-4 text-[12px] text-[#526078]">
          No rules defined yet. Press <strong>Add rule</strong> to create the first one.
        </div>
      )}

      <div className="mt-5 grid gap-6">
        {groups.map((g) => (
          <div key={g.severity}>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#94a3b8]">
              {SEVERITY_LABEL[g.severity] ?? g.severity}
            </h4>
            <ul className="divide-y divide-[#eef2f7] rounded-2xl border border-[#eef2f7]">
              {g.rules.map((r) => (
                <RuleRow
                  key={r.name}
                  rule={r}
                  result={results[r.name]}
                  error={errors[r.name]}
                  running={!!running[r.name]}
                  onRun={() => runOne(r.name)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {addOpen && <AddRuleDialog onClose={() => setAddOpen(false)} onSaved={reload} />}
    </section>
  );
}

function SummaryDots({ summary }: { summary: Record<HealthStatus, number> }) {
  const items: { key: HealthStatus; label: string }[] = [
    { key: "green", label: "passing" },
    { key: "yellow", label: "warning" },
    { key: "red", label: "failing" },
    { key: "unknown", label: "not run" },
  ];
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-[#eef2f7] bg-[#f7faff] px-3 py-1.5 text-[11px] text-[#526078]">
      {items.map((it) => (
        <span key={it.key} className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: statusColor(it.key) }}
            aria-hidden
          />
          <span className="tabular-nums font-bold text-[#0b1a36]">{summary[it.key]}</span>
          <span>{it.label}</span>
        </span>
      ))}
    </div>
  );
}

function RuleRow({
  rule, result, error, running, onRun,
}: {
  rule: HealthRule;
  result?: RuleResult;
  error?: string;
  running: boolean;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(false);
  const status = ruleStatus(rule, result);
  const color = statusColor(status);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 inline-block shrink-0 rounded-full"
          style={{ width: 9, height: 9, background: color, boxShadow: `0 0 0 3px ${color}22` }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px] font-bold text-[#0b1a36]">{rule.name}</span>
            <span className="text-[12px] tabular-nums text-[#0b1a36]">
              {result
                ? result.count === 0
                  ? <span className="inline-flex items-center gap-1 text-[#16a34a]"><CheckCircle2 size={12}/> passing</span>
                  : <span className="inline-flex items-center gap-1 text-[#dc2626]"><AlertTriangle size={12}/> {result.count} violation{result.count === 1 ? "" : "s"}</span>
                : <span className="text-[#94a3b8]">not yet run</span>}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#526078]">{rule.description}</p>
          <div className="mt-1.5 flex items-center gap-3">
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
              {running ? "Running…" : "Run now"}
            </button>
          </div>
          {open && (
            <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-[#f7faff] p-3 text-[11px] text-[#0b1a36]">
              {rule.sql}
            </pre>
          )}
          {error && (() => { const f = friendlyError(error); return <FriendlyErrorPanel message={f.message} hint={f.hint} onRetry={onRun} />; })()}
          {result && result.count > 0 && result.rows.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-[#0757ff] hover:underline">
                Show {Math.min(result.rows.length, 10)} of {result.count} violating rows
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-[#f7faff] p-3 text-[10px] text-[#0b1a36]">
                {JSON.stringify(result.rows.slice(0, 10), null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

// -----------------------------------------------------------------------------
// Sample Inspector
// -----------------------------------------------------------------------------

function SampleInspector() {
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = async () => {
    setLoading(true);
    setError(null);
    try {
      setRow(await fetchRandomCity());
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#eef2f7] bg-white p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[16px] font-black text-[#0b1a36]">Sample inspector</h3>
            <InfoHint title="How to use this">
              Click <strong>Roll again</strong> and we pull one random scored city with every column. Skim the values
              and look for anything that feels obviously wrong (e.g. population of 7, score of 999, blanks where there
              shouldn't be any). It's a 5-second sanity check — way faster than writing SQL.
            </InfoHint>
          </div>
          <p className="mt-1 max-w-md text-[12px] leading-relaxed text-[#526078]">
            Pull one random scored city, with every column visible. The fastest way
            to spot weird values without writing SQL.
          </p>
        </div>
        <button
          onClick={roll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
        >
          <Dice5 size={12} />
          {loading ? "Rolling…" : row ? "Roll again" : "Pick a random city"}
        </button>
      </header>
      {error && (() => { const f = friendlyError(error); return <FriendlyErrorPanel message={f.message} hint={f.hint} onRetry={roll} />; })()}
      {row && (
        <div className="mt-4">
          <div className="mb-2 text-[14px] font-bold text-[#0b1a36]">
            {String(row.city_name ?? "—")}, {String(row.state_abbr ?? "—")}
            <span className="ml-2 text-[11px] font-normal text-[#526078]">
              composite {String(row.composite_score_default ?? "—")}
            </span>
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-[#eef2f7]">
            <div className="grid grid-cols-1 gap-x-4 p-3 text-[11px] sm:grid-cols-2">
              {Object.entries(row)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-[#f1f5fb] py-1 last:border-0">
                    <span className="truncate text-[#526078]">{k}</span>
                    <span className="max-w-[60%] truncate text-right tabular-nums text-[#0b1a36]">
                      {v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {!row && !loading && !error && (
        <div className="mt-4 rounded-xl bg-[#f7faff] p-4 text-[12px] text-[#526078]">
          Press the button to pull a random row.
        </div>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Outlier Finder
// -----------------------------------------------------------------------------

const COLUMN_LABEL: Record<string, string> = {
  composite_score_default: "Composite score",
  population: "Population",
  median_household_income: "Median household income",
  cost_of_living_index: "Cost of living index",
  col_salary_index: "COL-adjusted salary index",
  population_density: "Population density",
  public_elementary_teacher_count: "Public elementary teachers",
  csi_score: "CSI score",
};

function OutlierFinder() {
  const [column, setColumn] = useState<OutlierColumn>("composite_score_default");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchOutliers(column);
      setRows(r.rows);
      setHasRun(true);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#eef2f7] bg-white p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[16px] font-black text-[#0b1a36]">Outlier finder</h3>
            <InfoHint title="What's an outlier?">
              A value that's unusually far from the average. We use "more than 3 standard deviations" — a statistics
              shorthand that means roughly "would happen by chance less than 1 time in 300." Pick a column, hit
              <strong> Find outliers</strong>, and we list the most extreme cities. Real cities sometimes show up here
              (NYC for density), but unfamiliar surprises are often data bugs worth checking.
            </InfoHint>
          </div>
          <p className="mt-1 max-w-md text-[12px] leading-relaxed text-[#526078]">
            Surfaces cities more than 3 standard deviations from the national mean
            on the chosen column. Outliers are usually either bugs or interesting
            edge cases worth checking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={column}
            onChange={(e) => { setColumn(e.target.value as OutlierColumn); setHasRun(false); setRows([]); }}
            className="rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] text-[#0b1a36]"
          >
            {OUTLIER_COLUMNS.map((c) => (
              <option key={c} value={c}>{COLUMN_LABEL[c] ?? c}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <Sparkles size={12} />
            {loading ? "Scanning…" : "Find outliers"}
          </button>
        </div>
      </header>
      {error && (() => { const f = friendlyError(error); return <FriendlyErrorPanel message={f.message} hint={f.hint} onRetry={run} />; })()}
      {!hasRun && !loading && (
        <div className="mt-4 rounded-xl bg-[#f7faff] p-4 text-[12px] text-[#526078]">
          Pick a column and press <strong>Find outliers</strong>.
        </div>
      )}
      {hasRun && rows.length === 0 && !loading && (
        <div className="mt-4 rounded-xl bg-[#f7faff] p-4 text-[12px] text-[#526078]">
          No outliers beyond 3σ on <strong>{COLUMN_LABEL[column] ?? column}</strong>. The data looks well-behaved.
        </div>
      )}
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-[#eef2f7] rounded-xl border border-[#eef2f7]">
          {rows.map((r, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 px-4 py-2 text-[12px]">
              <span className="truncate text-[#0b1a36]">
                {String(r.city_name ?? "—")}, {String(r.state_abbr ?? "—")}
              </span>
              <span className="tabular-nums text-[#526078]">
                value <strong className="text-[#0b1a36]">{String(r.val ?? "—")}</strong> · z={Number(r.z ?? 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Add-a-rule dialog (manager only — page-level gate already enforces this)
// -----------------------------------------------------------------------------

function AddRuleDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sql, setSql] = useState("SELECT id FROM public.us_cities_scored WHERE /* condition that should never be true */ LIMIT 100");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("warning");
  const [expectedZero, setExpectedZero] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && description.trim().length > 0 && sql.trim().length > 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Client-side defense: server also validates.
      const head = sql.trim().toLowerCase();
      if (!/^(select|with)\b/.test(head)) {
        throw new Error("SQL must start with SELECT or WITH.");
      }
      const { error } = await supabase
        .from("db_health_rules" as any)
        .insert({
          name: name.trim(),
          description: description.trim(),
          sql: sql.trim(),
          severity,
          expected_zero: expectedZero,
        });
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1a36]/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-black text-[#0b1a36]">New invariant</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[#526078]">
          Define a rule that should always be true. Write a <code>SELECT</code> that
          returns the rows that <em>break</em> it. If it returns zero rows, the rule passes.
        </p>

        <div className="mt-5 grid gap-3">
          <Field label="Name" hint="Short, snake_case identifier (e.g. teacher_email_lowercase).">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="no_negative_population"
              className="w-full rounded-lg border border-[#eef2f7] px-3 py-2 text-[13px] text-[#0b1a36] focus:border-[#0757ff] focus:outline-none"
            />
          </Field>
          <Field label="Plain-English description" hint="One sentence anyone on the team can understand.">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Every city has a non-negative population."
              className="w-full rounded-lg border border-[#eef2f7] px-3 py-2 text-[13px] text-[#0b1a36] focus:border-[#0757ff] focus:outline-none"
            />
          </Field>
          <Field label="SQL (returns the violating rows)" hint="Read-only. Must start with SELECT or WITH.">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-[#eef2f7] px-3 py-2 font-mono text-[12px] text-[#0b1a36] focus:border-[#0757ff] focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full rounded-lg border border-[#eef2f7] bg-white px-3 py-2 text-[13px] text-[#0b1a36]"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Pass when…">
              <select
                value={expectedZero ? "zero" : "any"}
                onChange={(e) => setExpectedZero(e.target.value === "zero")}
                className="w-full rounded-lg border border-[#eef2f7] bg-white px-3 py-2 text-[13px] text-[#0b1a36]"
              >
                <option value="zero">Query returns zero rows</option>
                <option value="any">Query returns one or more rows</option>
              </select>
            </Field>
          </div>
        </div>

        {error && <div className="mt-3 break-words text-[12px] text-[#dc2626]">{error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-[#eef2f7] bg-white px-4 py-2 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-full bg-[#0757ff] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#0445d6] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">{label}</div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#94a3b8]">{hint}</p>}
    </label>
  );
}
