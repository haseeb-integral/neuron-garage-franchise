# Phase 10.1 + 10.3 — Interpretation chips + friendlier collapsible labels

UI/copy only. One file touched: `src/components/phase2-demo/LiveCityDeepDive.tsx`.

## What I will change

1. Add a short caption above the 5-card grid:
   "Each card shows the score, what it means, the inputs used, and where the data came from. Dragging a weight only previews sensitivity; it does not save."

2. Add a small plain-English interpretation chip on each card, under the subtitle, with pillar-specific wording:
   - Pricing Acceptance — Weak / Mixed / Strong / Very strong premium pricing
   - Scaled Operator — Weak / Mixed / Strong / Very strong operator validation
   - Enrichment Diversity — Narrow / Mixed / Broad / Very broad enrichment mix
   - Market Depth — Thin / Moderate / Deep / Very deep provider market
   - Market Balance Index — Underserved / Balanced / Competitive / Saturated (own bands, driven by the existing `coverageRatio` input thresholds already in the formula: ≥350 / 200–349 / 100–199 / <100)

   Score-driven bands for the first four use the 0–100 score already on the card:
   0–39 = tier 1, 40–59 = tier 2, 60–79 = tier 3, 80–100 = tier 4.

   Chip colors follow the existing palette (red/amber/green/blue tints already used elsewhere on the page). If a score is missing, the chip is not rendered.

3. Rename the two collapsible summaries:
   - "Show formula" → "How this score is calculated"
   - "Show sources (N)" → "Where the data comes from (N)"

## What I will NOT touch

- `DEFAULT_WEIGHTS`, `computeMvs`, `useLiveMvs`, sliders, weights, scores.
- Firecrawl, Supabase, edge functions, pipeline, data fetching.
- DataSourcesPanel, NationalOperatorsPanel, Premium providers table.
- Market Absorption and weekly absorption stay removed.

## After this phase

I will stop. Please test on a live city (e.g. Austin):
- Caption appears above the 5 cards.
- Each card has a small colored chip under the subtitle with pillar-specific words.
- Market Balance chip shows Underserved/Balanced/Competitive/Saturated based on coverage ratio.
- Collapsibles read "How this score is calculated" and "Where the data comes from (N)".
- Scores, weights, sliders, tables below are unchanged.

Then I will start Phase 10.2 (Enrichment Diversity category chips).
