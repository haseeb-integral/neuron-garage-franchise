## What's wrong today

`MarketReportModal` is a relic from when `city_market_signals` existed. That table was severed on 2026-05-21. The modal now:

- Invents a **"Live / Proxy / Missing"** coverage framework that has no meaning — every row is hardcoded to `proxy` from the seeded fallback.
- Shows a **"SOW Coverage Status"** block (`0 LIVE · 5 PROXY · 0 MISSING`) that is pure theatre.
- Renders a **boilerplate "Market Summary"** (`"This report preview uses the live SOW metric registry…"`) that has nothing to do with the actual AI Executive Summary the user already sees on screen.
- Lists only **5 fields** as "Key Market Signals", a different and smaller set than the 12 the right-hand "Key Market Signals" panel actually displays.
- Ends with a **canned "Recommendation"** paragraph that is the same generic prose for every city.

Three buttons open it:
1. `CityTopBar` → **Market Report** button.
2. Right-column **"Generate PDF Report"** card (auto-downloads PDF).
3. `MarketDetailDrawer` → **Generate Report**.

## What to build

Replace the modal contents with the exact same data the user sees on screen — nothing invented. Apply the same change to the PDF builder.

### Sections in the new modal (in order)

1. **Header** — `{City}, {ST} — Market Research Report` (drop "SOW … Preview" wording).
2. **Total Score card** — `score / 100` + tier label + verdict (high/moderate/low-opportunity). Same source as `ExecutiveSummaryPanel`.
3. **Category Scores** — Demand, TAM Teachers, Competitive Opportunity bars using `buildPillarView(detailCategoryScores)`. Keep this; it's already correct.
4. **AI Executive Summary** — pulled via `useCityNarrative` (the same hook the on-screen Executive Summary uses, cached). Shows `narrative.executive_summary`, then the four expanded sections when available: Market Snapshot, Demand-Side Read, Supply & Competitive Read, Recommended Next Move. Loading + retry states copied from `ExecutiveSummaryPanel`.
5. **Key Market Signals** — render the same `sigRows` array (12 metrics) the right-column panel renders, with the same source label, value, and tone-coloured benchmark pill (good / mid / bad). One-liner from `SIGNAL_EXPLAIN` when a tone is present. No "live/proxy/missing", no "✓ Counts / Info", no geography pill.
6. **Footer actions** — `Download Source CSV`, `Download PDF Report`, `Close` (unchanged behaviour).

### Sections to DELETE outright

- "Market Summary" boilerplate paragraph.
- "SOW Coverage Status" 3-tile block (Live / Proxy / Missing counters).
- "SOW Category Coverage" rows ("0 live · 3 proxy · 0 missing").
- "Recommendation" paragraph.
- Status / Counts / geography pills on each signal row.

### Data plumbing

- `MarketReportModal` needs `sigRows: SigRow[]` and `cityId` as new props. `CityScoring.tsx` already computes both — pass them through the three call sites:
  - `setReportOpen(true)` from `CityTopBar` (line 1331)
  - `setReportAutoPdf(true); setReportOpen(true)` from the right-column card (line 1740)
  - `onGenerateReport` from `MarketDetailDrawer` (line 1811)
- Drop `buildSeededFallbackSignals` and the `liveSignals` state — no more fetching pretend evidence.
- `useCityNarrative` is already idempotent and caches per `weightsHash`, so opening the modal will reuse the narrative the right-column panel already loaded.

### CSV export

Keep the button but emit a useful CSV based on `sigRows`:

```
Metric, Value, Source, Benchmark
```

Drop the Geography / Counts Toward Score / Status / Confidence / Notes columns — they were derived from the dead live-signal model.

### PDF rewrite

`src/components/city-scoring/market-report/marketReportPdf.ts` currently mirrors the modal section-for-section. Update it to the same five sections (Total Score, Category Scores, AI Executive Summary, Key Market Signals, no Recommendation). Pass `narrative` and `sigRows` into `buildMarketReportPdf` instead of the live-signal types. Filename stays `{slug}-{st}-market-report-{date}.pdf`.

### Files touched

- `src/components/city-scoring/MarketReportModal.tsx` — full rewrite (≈150 lines down from 326).
- `src/components/city-scoring/market-report/marketReportPdf.ts` — rewrite renderer; same call signature shape but inputs change.
- `src/components/city-scoring/market-report/marketReportTypes.ts` — drop `LiveSignal` / `MetricStatus` types if nothing else uses them (check first).
- `src/pages/CityScoring.tsx` — pass `sigRows` and `cityId` into `MarketReportModal`; no other logic changes.
- `src/components/city-scoring/MarketDetailDrawer.tsx` — no change (already calls `onGenerateReport`).

### Out of scope

- The CityTopBar button label/placement (not requested here).
- Adding new buttons that open the modal elsewhere.
- Re-enabling or replacing `city_market_signals` ingestion.

### Risk

Low. The narrative + sigRows are already rendered live on the same page; we're just mirroring them into the modal/PDF instead of fetching dead data. No DB / RLS / edge-function changes.
