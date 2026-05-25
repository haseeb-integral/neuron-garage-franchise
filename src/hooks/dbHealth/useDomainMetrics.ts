// ============================================================================
// Runs every metric in a domain, returns a keyed map of results plus loading
// and refresh handles. One React Query per metric for independent retries.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { DomainDef, MetricRunResult } from "@/lib/dbHealth/queries";

export interface DomainMetricsState {
  results: Record<string, MetricRunResult>;
  loading: boolean;
  lastRefreshedAt: number | null;
  refresh: () => Promise<void>;
  refreshMetric: (metricKey: string) => Promise<void>;
}

export function useDomainMetrics(domain: DomainDef): DomainMetricsState {
  const [results, setResults] = useState<Record<string, MetricRunResult>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  const runOne = useCallback(
    async (metricKey: string) => {
      const metric = domain.metrics.find((m) => m.key === metricKey);
      if (!metric) return;
      try {
        const r = await metric.run();
        setResults((prev) => ({ ...prev, [metricKey]: r }));
      } catch (e: any) {
        setResults((prev) => ({
          ...prev,
          [metricKey]: {
            raw: null,
            display: "error",
            status: "red",
            ms: 0,
            error: String(e?.message ?? e),
          },
        }));
      }
    },
    [domain],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all(domain.metrics.map((m) => runOne(m.key)));
    setLastRefreshedAt(Date.now());
    setLoading(false);
  }, [domain, runOne]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all(domain.metrics.map((m) => runOne(m.key)));
      if (!cancelled) {
        setLastRefreshedAt(Date.now());
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.key]);

  return { results, loading, lastRefreshedAt, refresh, refreshMetric: runOne };
}
