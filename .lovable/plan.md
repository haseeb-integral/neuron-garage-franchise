# Day 5.5 — Backend = Drawer (single source of truth for metric coverage)

**Problem:** Drawer currently joins `city_market_signals` to the registry by canonical key and re-derives status client-side. Any time a fetcher writes a non-canonical `signal_key`, or the alias map misses one, the drawer drifts from the backend's coverage numbers.

**Fix:** The edge function already knows every metric's status when it writes the SOW job. Have it persist a per-key map; drawer reads it verbatim.

---

## 1. Edge function — write `metric_status_map`

File: `supabase/functions/fetch-city-market-data-sow/index.ts` (~line 750, inside the `city_fetch_jobs` insert).

Add a new field to `response_summary`:

```ts
metric_status_map: Object.fromEntries(
  signals.map((s) => [
    s.signal_key,                 // already canonical for SOW rows
    {
      status: s.status,           // 'live' | 'proxy' | 'missing' | 'blocked' | 'manual'
      used_in_score: s.used_in_score ?? false,
      value: s.value ?? null,
      source: s.source ?? null,
      source_url: s.source_url ?? null,
      confidence: s.confidence ?? null,
      updated_at: completedAt,
      label: s.label ?? null,
      metric_category: s.metric_category ?? null,
      notes: s.notes ?? null,
    },
  ]),
),
```

Also include it in the JSON response under `coverage.map` so callers can debug without a DB trip.

No DB migration — `response_summary` is JSONB.

## 2. Drawer — consume the map

File: `src/components/city-scoring/MarketDetailDrawer.tsx`.

a. After `latestJob` is loaded, derive:

```ts
const statusMap: Record<string, MetricSnapshot> | null =
  latestJob?.response_summary?.metric_status_map ?? null;
```

b. Replace the `coverageByCategory` builder so it iterates `METRICS_BY_CATEGORY` and, for each metric:

- If `statusMap` exists: use `statusMap[metric.key]` directly for `status`, `value`, `source`, `source_url`, `updated_at`, `used_in_score`. No alias lookup, no `getStatus()` recompute.
- If `statusMap` is absent (legacy job rows from before this deploy): fall back to today's `signalsByCanonical` path so old data still renders.

c. The header chips (`liveCount` / `estimatedCount` / `missingCount` / `blockedCount`) keep the same shape — they just sum the map-derived statuses.

d. Keep `signalsByCanonical` for the **Data Sources** tab (raw signal rows still come from `city_market_signals`), but coverage status no longer flows through it.

e. Drop the `signal && getStatus(signal) !== "missing"` re-check in the registry-iteration block — that's the exact line that caused the 16-metric drift.

## 3. Verify

1. Refresh **Frisco TX**. Drawer chips and per-row badges must match `response_summary.counts` exactly (current target: 25 / 8 / 11 / 2 with 1 custom).
2. Click into 3 previously-misaligned metrics (`elementary_school_count`, `children_5_12_count`, `dual_income_household_pct`) and confirm status badge = backend status.
3. Open an older market (pre-deploy job) — it must still render via the fallback path without throwing.
4. Refresh **Austin TX** as a second city sanity check.

## 4. Files touched

- `supabase/functions/fetch-city-market-data-sow/index.ts` — add `metric_status_map` to `response_summary` and the JSON return.
- `src/components/city-scoring/MarketDetailDrawer.tsx` — prefer map-driven coverage; keep current logic as fallback.
- `.lovable/plan.md` — replace with this Day 5.5 body.

## Risks

- **Legacy jobs lack the map.** Fallback path covers this; once every market is refreshed, fallback becomes dead code (remove in Day 7+).
- **Key mismatch between fetcher output and registry.** If a fetcher emits a non-registry key, that metric simply won't appear in `metric_status_map[metric.key]` and will render as `missing`. That's correct behavior — and now it's loud instead of silently mis-statused.

## Out of scope

- Day 6 metric promotions.
- Removing `LEGACY_TO_CANONICAL` aliases (still needed for the Data Sources tab until fetchers fully migrate).
