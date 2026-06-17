## What

In `src/pages/MarketValidation.tsx` the **sample-data** "Export PDF" button (the one in your screenshot, sitting next to the "78 — Tier: Strong" hero) is currently grayed out, disabled, and carries a "Week 3" badge. Make it:

1. Remove the "Week 3" badge text + chip entirely.
2. Restyle to match City Search's primary blue CTA: solid `bg-[#174be8]` background, white text, `hover:bg-[#1240c9]`, no border.
3. Wire it to actually generate the same branded MVS brief PDF we built in Phase 6.1/6.2 — but using the demo data (`sanAntonioMarketValidationDemo` + the active shortlist row) instead of live pipeline data. Per your answer: works for all cities, sample or live.

The **live** city download button inside `LiveCityDeepDive.tsx` (a separate button that only shows for Austin) also gets the same blue-solid restyle so the two paths look identical to Brett.

## How (technical)

**New file** `src/lib/mvsBrief/sampleBriefAdapter.ts`
- One exported function `buildSampleBriefArgs(row: ShortlistRow, demo: MarketValidationDemo)` that returns a `MvsBriefArgs` object by:
  - Synthesizing a minimal `MvsResult` from `demo.subScores` (the six pillar values 0–100) and `demo.composite`, using `DEFAULT_WEIGHTS` and `MVS_NORMALIZATION_VERSION`.
  - Synthesizing minimal `MvsProviderInput[]` from `demo.providerSample` (premium tier, with price_min/max and category).
  - Synthesizing minimal `MvsWeekInput[]` from `demo.providerSample[].weeks` (status + confidence).
  - Synthesizing a minimal `MvsAcsInput` from `demo.affluence` / `demo.density` (median HHI, household count, etc.).
  - `latestRun: null`, `weeksDetailed: []` (Phase 6.2 appendix stays empty for sample — already handled gracefully).
  - `lowConfidence` from the row's badge.

**Edited** `src/pages/MarketValidation.tsx`
- Import `renderMvsBriefPdfBlob`, `buildSampleBriefArgs`, `useState` for `downloading`.
- Replace the disabled button (lines 442–454) with an active `<button>`:
  ```tsx
  className="inline-flex items-center gap-1.5 rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#1240c9] disabled:opacity-60"
  ```
  Icon stays (`Download` lucide). Label is just `Export PDF` — no "Week 3" chip. While generating, swap label to `Generating…` + spinner.
- `onClick` handler: build args via `buildSampleBriefArgs(activeRow, sanAntonioMarketValidationDemo)`, call `renderMvsBriefPdfBlob`, trigger download with filename `mvs-brief-<slug>-<date>.pdf`, toast on success/error.

**Edited** `src/components/phase2-demo/LiveCityDeepDive.tsx` (lines 254–268)
- Same blue-solid restyle on the live download button so both surfaces match: `bg-[#174be8] text-white hover:bg-[#1240c9]`. Keeps existing handler logic.

## Out of scope

- No changes to PDF content/layout — same 12-section internal brief.
- No changes to the comparator below the hero or to the shortlist table.
- No new Phase number; this is a polish/fix on Phase 6.1.

## Verification

- Playwright: open `/market-validation`, click Export PDF on the default San Antonio row, confirm a PDF blob downloads and visually contains the demo composite (78) and Tier: Strong.
- Click into Austin row, confirm the live deep-dive's blue download button still produces the live PDF with composite 42.0.
