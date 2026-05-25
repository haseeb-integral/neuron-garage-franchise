import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { DomainDef, getDomainStatus, MetricRunResult } from "@/lib/dbHealth/queries";
import { useDomainMetrics } from "@/hooks/dbHealth/useDomainMetrics";
import { StatusPill } from "./StatusPill";
import { statusColor } from "@/lib/dbHealth/thresholds";

interface Props {
  domain: DomainDef;
  /** Scroll anchor id, used by the top status row. */
  anchorId?: string;
  /** Surface the rolled-up status to the parent for the top status row. */
  onStatusChange?: (status: ReturnType<typeof getDomainStatus>) => void;
}

export function DomainCard({ domain, anchorId, onStatusChange }: Props) {
  const { results, loading, lastRefreshedAt, refresh, refreshMetric } = useDomainMetrics(domain);
  const rolled = getDomainStatus(results);

  // Notify parent — done in render is fine, parent uses functional setState.
  // We use a microtask to avoid setState-during-render warnings.
  if (onStatusChange) queueMicrotask(() => onStatusChange(rolled));

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
