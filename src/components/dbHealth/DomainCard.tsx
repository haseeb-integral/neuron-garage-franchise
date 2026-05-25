import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { DomainDef, getDomainStatus, MetricRunResult } from "@/lib/dbHealth/queries";
import { useDomainMetrics } from "@/hooks/dbHealth/useDomainMetrics";
import { StatusPill } from "./StatusPill";
import { statusColor, HealthStatus } from "@/lib/dbHealth/thresholds";

export interface DomainIssue {
  domainKey: string;
  domainLabel: string;
  metricLabel: string;
  status: HealthStatus;
  display: string;
  plainEnglish: string;
}

interface Props {
  domain: DomainDef;
  anchorId?: string;
  onStatusChange?: (status: ReturnType<typeof getDomainStatus>) => void;
  onIssuesChange?: (issues: DomainIssue[]) => void;
  onRegisterRefresh?: (key: string, fn: () => Promise<void>) => void;
}

function explain(domainLabel: string, metricLabel: string, status: HealthStatus, display: string): string {
  if (status === "red") {
    if (metricLabel.startsWith("% with")) return `${metricLabel.replace("% with ", "")} is missing on most rows in ${domainLabel}.`;
    if (metricLabel === "Row count") return `${domainLabel} table looks empty or unreachable.`;
    if (metricLabel.startsWith("Oldest")) return `${domainLabel} has not been refreshed in a long time.`;
    return `${domainLabel} — ${metricLabel.toLowerCase()} is failing (${display}).`;
  }
  if (status === "yellow") {
    if (metricLabel.startsWith("% with")) return `${metricLabel.replace("% with ", "")} on ${domainLabel} is below our soft target (${display}).`;
    if (metricLabel === "Row count") return `${domainLabel} row count is below the expected floor (${display}).`;
    if (metricLabel.startsWith("Oldest")) return `${domainLabel} is older than our soft freshness target (${display}).`;
    if (metricLabel.endsWith("range")) return `${domainLabel} values are outside the expected range (${display}).`;
    return `${domainLabel} — ${metricLabel.toLowerCase()} (${display}).`;
  }
  return `${domainLabel} — ${metricLabel} (${display}).`;
}

export function DomainCard({ domain, anchorId, onStatusChange, onIssuesChange, onRegisterRefresh }: Props) {
  const { results, loading, lastRefreshedAt, refresh, refreshMetric } = useDomainMetrics(domain);
  const rolled = getDomainStatus(results);
  const lastStatusRef = useRef<HealthStatus | null>(null);
  const lastIssuesKeyRef = useRef<string>("");

  useEffect(() => {
    if (onStatusChange && lastStatusRef.current !== rolled) {
      lastStatusRef.current = rolled;
      onStatusChange(rolled);
    }
    if (onIssuesChange) {
      const issues: DomainIssue[] = Object.entries(results)
        .filter(([, r]) => r && (r.status === "red" || r.status === "yellow"))
        .map(([, r]) => {
          const m = domain.metrics.find((x) => results[x.key] === r);
          return {
            domainKey: domain.key,
            domainLabel: domain.label,
            metricLabel: m?.label ?? "metric",
            status: r.status,
            display: r.display,
            plainEnglish: explain(domain.label, m?.label ?? "metric", r.status, r.display),
          };
        });
      const key = issues.map((i) => `${i.metricLabel}:${i.status}`).join("|");
      if (lastIssuesKeyRef.current !== key) {
        lastIssuesKeyRef.current = key;
        onIssuesChange(issues);
      }
    }
  });



  return (
    <section
      id={anchorId}
      className="rounded-2xl border border-[#eef2f7] bg-white p-4 md:p-5 scroll-mt-20"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusPill status={rolled} label={domain.label} />
          <span className="text-[12px] text-[#526078] hidden sm:inline">
            {domain.description}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#526078]">
          {lastRefreshedAt && (
            <span>updated {new Date(lastRefreshedAt).toLocaleTimeString()}</span>
          )}
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] px-2 py-1 text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff] disabled:opacity-50"
          >
            <RotateCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <ul className="mt-4 divide-y divide-[#eef2f7]">
        {domain.metrics.map((m) => (
          <MetricRow
            key={m.key}
            label={m.label}
            sql={m.sql}
            result={results[m.key]}
            onRun={() => refreshMetric(m.key)}
            loading={loading && !results[m.key]}
          />
        ))}
      </ul>
    </section>
  );
}

function MetricRow({
  label,
  sql,
  result,
  onRun,
  loading,
}: {
  label: string;
  sql: string;
  result: MetricRunResult | undefined;
  onRun: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const color = statusColor(result?.status ?? "unknown");

  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 inline-block rounded-full shrink-0"
          style={{ width: 8, height: 8, background: color, boxShadow: `0 0 0 3px ${color}22` }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px] font-bold text-[#0b1a36]">{label}</span>
            <span className="text-[13px] text-[#0b1a36] tabular-nums">
              {loading ? "…" : result?.display ?? "—"}
              {result?.ms != null && (
                <span className="ml-2 text-[10px] text-[#94a3b8]">{result.ms}ms</span>
              )}
            </span>
          </div>
          {result?.note && (
            <div className="text-[11px] text-[#526078] mt-0.5">{result.note}</div>
          )}
          {result?.error && (
            <div className="text-[11px] text-[#dc2626] mt-1 break-words">
              error: {result.error}
            </div>
          )}
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
              className="text-[11px] text-[#526078] hover:text-[#0b1a36] hover:underline"
            >
              Run now
            </button>
          </div>
          {open && (
            <pre className="mt-2 max-w-full overflow-x-auto rounded-md bg-[#f7faff] p-2 text-[11px] text-[#0b1a36] whitespace-pre-wrap">
              {sql}
            </pre>
          )}
        </div>
      </div>
    </li>
  );
}
