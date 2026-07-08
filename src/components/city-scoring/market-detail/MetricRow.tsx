import { ExternalLink } from "lucide-react";
import type { SowMetricEntry } from "@/lib/sowMetricRegistry";
import { formatMetric } from "@/lib/numberFormat";

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

interface Props {
  metric: SowMetricEntry;
  signal: LiveSignal | null;
  status: MetricStatus;
}

export function MetricRow({ metric, signal, status }: Props) {
  const displayOverride = signal?.raw_data && typeof (signal.raw_data as any).display_value === "string"
    ? ((signal.raw_data as any).display_value as string)
    : null;
  const value =
    signal && status !== "missing"
      ? (displayOverride ?? formatMetric(signal.value, signal.signal_key ?? metric.key))
      : "—";

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
