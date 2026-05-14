## Problem

Last turn I made the Data Sources drawer worse:

1. **Jargon**: header says "of 17 SOW metrics" — "SOW" is internal shorthand the user shouldn't have to decode.
2. **Wrong denominator**: counter shows 17 (only the metrics enabled in scoring). The other ~28 metrics from the spec are hidden inside per-category collapsibles, so the user can't see all 46.
3. **Wrong word**: header chip says "proxy" — the agreed user-facing label is **Estimated** (already used in row badges via `STATUS_LABEL`).
4. **Hidden per-category rows**: every metric with `enabled: false` was tucked under a "Not in current scoring model" toggle. Demand visibly shows 7 of 12, Pricing Power 2 of 7, etc.
5. **Custom rows silently lumped into "proxy"** — that's why 4 + 10 + 4 ≠ 17.

## Registry count discrepancy — needs your call

`SOW_METRIC_REGISTRY` in `src/lib/sowMetricRegistry.ts` currently has **45 entries**, not 46:
- Demand: 12 · Pricing Power: 7 · Competitive Landscape: 8 · Franchisee Supply: 6 · Ease of Operations: 5 · Parent Mindset: 7 = **45**

I'll wire the header to read from `SOW_METRIC_REGISTRY.length` so the number stays truthful no matter what. **Tell me which metric is missing from the registry vs. the spec and I'll add the 46th entry in the same edit** — I won't make one up.

## Fix (UI-only, one file)

### A. Header strings — drop "SOW", use "Estimated"
- Subtitle: `Source-of-truth audit for the SOW metric coverage powering this market's score.`
  → `Source-of-truth audit for every metric powering this market's score.`
- Coverage chip: `4 live · 10 proxy · 4 missing · of 17 SOW metrics`
  → `{live} Live · {estimated} Estimated · {missing} Missing · {blocked} Blocked · of {SOW_METRIC_REGISTRY.length} metrics` (and a separate `· {n} Custom` chip when n > 0).

### B. Count all metrics in the header chip
In `MarketDetailDrawer.tsx`, change `coverageCounts` to walk **both** `enabled` and `disabled` buckets in `coverageByCategory`. Denominator becomes `SOW_METRIC_REGISTRY.length` (45 today, 46 once you tell me what's missing), not `enabledRegistryTotal`.

### C. Show every metric inline per category (no toggle)
Remove the `showDisabled` collapsible. Render `enabled` rows first, then `disabled` rows directly below them, separated only by a thin label row `Not in current scoring model · {n}` (visual divider, no click). Disabled rows keep `opacity-70` and the "Info only" badge so it's clear they don't affect the score.

Per-category coverage chip becomes `{wired}/{totalIncludingDisabled} wired · {custom} custom`.

### D. Custom metrics out of "proxy"
Custom rows still render in their category, and get their own `· {n} Custom` chip in the header. They stop being silently merged into the Estimated count.

## Files touched

- `src/components/city-scoring/MarketDetailDrawer.tsx` only — header strings, counter math (lines ~340-391), remove `showDisabled` toggle, render disabled rows inline.
- `src/lib/sowMetricRegistry.ts` — add the 46th metric **only after you tell me which one**.

## Out of scope

- Renaming fetcher signal keys (Phase 2 from earlier plan).
- Scoring math changes.
- Adding new fetchers for missing data.
- Overview tab, Compare modal, CSV export, "Refresh school data" button.

## Risk

Low. Frontend-only. No DB, no scoring, no fetcher edits. Composite scores unchanged.

## Verification

Open Data Sources for Frisco, TX after the fix:
- Header reads e.g. `13 Live · 5 Estimated · 26 Missing · 1 Blocked · 1 Custom · of 46 metrics`. No "SOW" anywhere. No "proxy" anywhere.
- Demand category shows all 12 rows inline (7 enabled bright + 5 disabled dimmed) with no clicks.
- Custom row appears in its category and in its own chip — not folded into Estimated.
