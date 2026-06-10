
# Plan — Close 9 SOW gaps on the two demo pages

All UI-only. No backend, no routing, no schema. Demo data only. Same visual system already in place (CHIP style, fixed-height bands, scrollable formula drawer).

## Market Validation (`src/pages/MarketValidation.tsx` + `src/data/phase2DemoData.ts`)

### 1A-LOV-1 — Human-QA queue link
- Add a small "QA queue · 4 flagged" chip in the page header, right of the scrape date. Tooltip: "Records with extraction confidence <0.7 route here for 4-button review per SOW Item 1."
- Non-functional anchor (`<button>`). Add 1 sentence to `LowConfidenceBadge` tooltip pointing to the queue.

### 1A-LOV-2 — Re-weightable sliders (visual only)
- Inside each sub-score card, under the existing weight chip, render a disabled `Slider` (shadcn) preset to the SOW weight with a 5–40% range and a tiny "Static for v1 — re-weightable in v1.1" caption.
- All 6 sub-score cards get the slider. Sliders are `disabled` so they read as a preview affordance.

### 1A-LOV-3 — Scaled Operator two-number diagnostic
- Extend `scaledOperator.signals` so the card shows two numbers side-by-side at the top:
  - "Operator Validation: 5 / 8" (positive signal)
  - "Direct Competitor Load: 2.1 / 10k kids" (saturation signal)
- Small caption: "Validation lifts score; load suppresses it (see formula)."

### 1A-LOV-4 — Market Balance band chip
- On the Market Balance card, replace the plain "Underserved (≥350)" signal row with a colored band chip rendered above signals:
  - Underserved (green) · Balanced (blue) · Competitive (amber) · Saturated (red)
- Show the 4-band legend inline beneath the chip in the same CHIP style. Active band uses solid fill, others muted.

### 1A-LOV-5 — Sellout curve / scrape cadence
- Add a 5-dot horizontal timeline below the composite header: Jan / Mar / Jun / Sep / Nov dots, current scrape (Mar) highlighted. Label: "Scrape cadence — 5x/yr per SOW."
- Add a tiny inline "sellout curve" sparkline on the Market Absorption card: 5 ticks across `Wk1–Wk5` showing % sold_out+waitlist from `friscoMarketValidationDemo.premiumProviders` (computed inline, no new data).

## Site Analysis (`src/pages/SiteAnalysis.tsx` + `src/data/phase2DemoData.ts`)

### 1B-LOV-1 — Static input form
- Add a collapsed `Card` above the compare strip titled "Analyze a site" with 4 inputs (School Name, Address, School Type select, Enrollment number) and a disabled "Analyze" button. Helper text: "Demo — inputs not wired. Trinity vs LeafSpring shown below as calibration anchors."

### 1B-LOV-2 — Isochrone weighting note
- On each site card, above the isochrone placeholder, add a single-line meta row: "10-min weighted 60% · 15-min weighted 40%" using the CHIP style. Tooltip cites SOW Item 2.

### 1B-LOV-3 — School Profile factor table in Show Formula
- Expand the School Profile sub-score's formula drawer to render a small 3-row table after the formula string:
  - school_type_factor → Private elem 1.0 · Charter 0.85 · Public 0.75 · Montessori 0.9 · Other 0.5
  - enrollment normalize range: 150–800
  - grade_alignment_factor → matches NG 5–12: 1.0 · partial: 0.6 · misaligned: 0.2
- Pull values from a new `SCHOOL_PROFILE_FACTORS` constant in `phase2DemoData.ts`.

### 1B-LOV-4 — Accessibility callouts
- Swap the third isochrone callout cell on each site card from a demographics repeat to accessibility data: "Drive to highway", "Parking spaces (est.)", "Pop reachable 15-min". Add `accessibilityCallouts` to each demo site (Trinity strong, LeafSpring weak).

## Technical notes

- Reuse the existing `CHIP` constant and fixed-height band layout. No new design tokens.
- All new chips use existing semantic colors (`bg-muted`, `bg-emerald-100`, `bg-amber-100`, `bg-rose-100`, `bg-sky-100` via Tailwind defaults already in use).
- Slider import: `@/components/ui/slider` (already in project).
- Add 2 small constants to `phase2DemoData.ts` (`SCHOOL_PROFILE_FACTORS`, `accessibilityCallouts` per site, `qaQueueCount = 4`, `scrapeCadence` array). No shape-breaking changes to existing exports.
- Update `.lovable/phase-2/CHANGELOG.md` and `phase-2-status.md` flipping the 9 LOV items from "gap" to "demo-stub present".

## Out of scope

- No real input wiring, no PDF generation, no map tiles, no Supabase, no new routes.
- No restyle of pages beyond the additions above.

## Verification

- Type-check clean.
- Visual pass at 1920 / 1366 / 971 widths: cards stay aligned, formula drawers still scroll internally, header row doesn't wrap.
