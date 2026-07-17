import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EvidenceProvider = {
  id: string;
  city: string;
  name: string | null;
  url: string | null;
  website_url: string | null;
  source_listing_url: string | null;
  price_min: number | null;
  price_max: number | null;
  category_raw: string | null;
  category_classified: string | null;
  tier: string | null;
  platform: string | null;
  confidence: number | null;
  sources: unknown;
  screenshot_url: string | null;
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
  price_derived_from_brand?: boolean | null;
  price_needs_review?: boolean | null;
  price_derivation_meta?: Record<string, unknown> | null;
  verification_status?: "verified" | "rejected" | "edited" | null;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  price_original_min?: number | null;
  price_original_max?: number | null;
  ai_overview_snippet?: string | null;
  ai_overview_source_url?: string | null;
  price_confidence?: "high" | "medium" | "low" | string | null;
  price_source_url?: string | null;
  price_source_quote?: string | null;
};

export type DroppedPrice = {
  name: string;
  field: string;
  value: number | null;
};

export type QueryDebug = {
  query: string;
  source_type: string;
  firecrawl_endpoint?: string;
  raw_results_returned?: number;
  raw_dollar_amounts_in_source?: number;
  providers_extracted?: number;
  prices_kept?: number;
  top_urls?: string[];
  provider_names?: string[];
  providers?: Array<{
    name: string;
    url?: string | null;
    price_min?: number | null;
    price_max?: number | null;
  }>;
  prices_dropped_by_guard?: DroppedPrice[];
};

export type EvidenceRow = EvidenceProvider & {
  matched_query: QueryDebug | null;
  matched_provider_entry:
    | { name: string; url?: string | null; price_min?: number | null; price_max?: number | null }
    | null;
  guard_drop: DroppedPrice[];
};

export type EvidenceData = {
  rows: EvidenceRow[];
  queries: QueryDebug[];
  runId: string | null;
  runCreatedAt: string | null;
  loading: boolean;
  error: string | null;
  refetch?: () => void;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function useProviderEvidence(cityKey: string): EvidenceData {
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<EvidenceData>({
    rows: [],
    queries: [],
    runId: null,
    runCreatedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setData((d) => ({ ...d, loading: true, error: null }));

    (async () => {
      try {
        const [{ data: providers, error: pErr }, { data: runs, error: rErr }] = await Promise.all([
          supabase
            .from("mvs_providers")
            .select("*")
            .eq("city", cityKey)
            .order("tier", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("mvs_pipeline_runs")
            .select("id, created_at, source_counts")
            .eq("city", cityKey)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        if (cancelled) return;
        if (pErr) throw pErr;
        if (rErr) throw rErr;

        // Find the newest run that actually has google_search_queries debug data.
        let runId: string | null = null;
        let runCreatedAt: string | null = null;
        let queries: QueryDebug[] = [];
        for (const run of (runs ?? []) as Array<{
          id: string;
          created_at: string;
          source_counts: any;
        }>) {
          const q = run?.source_counts?.discover?.google_search_queries;
          if (Array.isArray(q) && q.length > 0 && queries.length === 0) {
            runId = run.id;
            runCreatedAt = run.created_at;
            queries = q as QueryDebug[];
            break;
          }
        }

        // Index providers from queries by normalized name. First match wins (Phase 2
        // query order is the order debug was captured in).
        const nameIndex = new Map<
          string,
          { q: QueryDebug; entry: NonNullable<QueryDebug["providers"]>[number] }
        >();
        const dropIndex = new Map<string, DroppedPrice[]>();
        for (const q of queries) {
          for (const p of q.providers ?? []) {
            const key = norm(p.name);
            if (key && !nameIndex.has(key)) nameIndex.set(key, { q, entry: p });
          }
          for (const d of q.prices_dropped_by_guard ?? []) {
            const key = norm(d.name);
            if (!key) continue;
            const arr = dropIndex.get(key) ?? [];
            arr.push(d);
            dropIndex.set(key, arr);
          }
        }

        const rows: EvidenceRow[] = ((providers ?? []) as EvidenceProvider[]).map((p) => {
          const key = norm(p.name);
          const match = key ? nameIndex.get(key) ?? null : null;
          return {
            ...p,
            matched_query: match?.q ?? null,
            matched_provider_entry: match?.entry ?? null,
            guard_drop: key ? dropIndex.get(key) ?? [] : [],
          };
        });

        setData({ rows, queries, runId, runCreatedAt, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setData({
          rows: [],
          queries: [],
          runId: null,
          runCreatedAt: null,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityKey, nonce]);

  return { ...data, refetch: () => setNonce((n) => n + 1) };
}
