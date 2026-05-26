import { ExternalLink } from "lucide-react";
import type { SowMetricEntry } from "@/lib/sowMetricRegistry";

export type MetricStatus = "live" | "proxy" | "missing" | "blocked" | "manual";

export type LiveSignal = {
  signal_key?: string;
  label?: string;
  value?: string | number | null;
  source?: string | null;
  source_url?: string | null;
  updated_at?: string | null;
  raw_data?: {
    status?: MetricStatus;
    used_in_score?: boolean;
    notes?: string | null;
    [key: string]: unknown;
  } | null;
};

function formatByKey(key: string | undefined, num: number): string {
  const k = (key ?? "").toLowerCase();
  // Percentages: keys containing "pct", "percent", or "rate"
  if (/(pct|percent|rate)\b|_pct$|_percent$/.test(k)) {
    // If value already looks like a fraction (0-1), convert; otherwise treat as %
    const pct = Math.abs(num) <= 1 ? num * 100 : num;
    return `${pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  }
  // Currency: income, spend, capital, price, revenue, cost
  if (/(income|spend|capital|price|revenue|cost|earnings|wage)/.test(k)) {
    return `$${Math.round(num).toLocaleString()}`;
  }
  // Plain integer with thousands separators
  if (Number.isInteger(num)) return num.toLocaleString();
  // Decimal — keep up to 2 dp with separators
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function displayValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (typeof value !== "boolean" && Number.isFinite(num) && String(value).trim() !== "") {
    return formatByKey(key, num);
  }
  return String(value);
}

interface Props {
  metric: SowMetricEntry;
  signal: LiveSignal | null;
  status: MetricStatus;
}

export function MetricRow({ metric, signal, status }: Props) {
  const value = signal && status !== "missing" ? displayValue(signal.value) : "—";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#f1f4f9] px-2 py-1 last:border-0">
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium text-[#07142f] truncate" title={metric.label}>
          {metric.label}
        </p>
        <p className="text-[10px] text-[#8794ab] truncate" title={metric.source}>
          {metric.source}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <p className="text-[11.5px] font-bold text-[#07142f] tabular-nums">{value}</p>
        {signal?.source_url ? (
          <a
            href={signal.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-[#174be8] hover:text-[#1240c9]"
            title="Open source"
          >
            <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
