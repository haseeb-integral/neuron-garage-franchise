# Phase 11.6 — fix the misleading QA suffix on every card

## What is wrong now

Every card's confidence line ends with `· 12 in QA queue.` That suffix is **not about the pillar's own inputs**. It is a city-wide count of broken registration pages. Stuffing it onto each pillar's sentence makes readers think e.g. "14 had a price but 12 are still broken" — which is not what the numbers mean.

In Austin's data, all 12 QA items have reason "no registration page found". Most of those 12 providers still have a price scraped from another source, so they are counted inside "14 with price". The two numbers overlap.

## What changes

### 1. Remove the QA suffix from the per-pillar confidence sentence
Each card's sentence will only describe **that pillar's own data**.

Examples (Austin):
- Pricing Acceptance → "Based on 14 of 19 providers with a readable price."
- Enrichment Diversity → "Based on 7 categories across 19 classified providers."
- Market Depth → "Based on 19 premium providers discovered."
- Market Balance → "Based on coverage ratio 3907 across 19 providers."
- Scaled Operator → "Matched against 15 national brands." (no change)

No QA count inside these sentences.

### 2. Move the QA count to one honest city-wide line
Show it **once** in the Known Limitations panel (already exists) with the real reason text from the queue, e.g.:
- "12 of 19 premium provider pages are flagged in the QA queue. Reason breakdown: 'no registration page found' (12). They still contribute to scoring if other data (price, category) was scraped from another source."

The Data Sources strip at the top can keep the small "QA open: 12" pill as a quick at-a-glance signal (no wording change).

### 3. Tooltip on the QA pill that explains what QA tracks
Hovering the "QA open: N" pill in the Data Sources strip will show:
*"QA queue tracks per-provider data-quality issues (mostly broken registration pages). A provider in QA may still have a valid price and category from other sources."*

## What I will NOT touch

- Scoring math, weights, `computeMvs`, `useLiveMvs`.
- Firecrawl, Supabase, edge functions, pipeline.
- The QA queue itself or how items get flagged/resolved.
- The 5-card layout, sliders, popovers, freshness pills, dots.

## Risk

Very low. Pure text/copy change in `LiveCityDeepDive.tsx` (and one tooltip in `LiveCitySourcePanels.tsx` if needed).

## Effort

1 turn.

Approve to build?
