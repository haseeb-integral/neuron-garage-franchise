## Goal
Apply the approved Pricing Acceptance 3-section layout (Result → Evidence → Trust → Weight preview → Formula/Sources) to the other 4 Market Validation cards: **Scaled Operator**, **Enrichment Diversity**, **Program Depth**, and **Demand Balance**.

## Scope
File: `src/components/phase2-demo/LiveCityDeepDive.tsx` only.

No changes to: scoring math, weights, slider logic, popovers, freshness pills, backend, edge functions, Firecrawl, Supabase, saved data, or the other pages.

## What changes per card

For each of the 4 cards, the body becomes:

1. **Result** — one plain-English sentence based on the score band (Weak / Mixed / Strong), pillar-specific.
2. **Evidence** — the existing input rows (with their proof popovers and freshness pills), grouped under an "Evidence" label.
3. **Trust** — two lines:
   - Line 1: confidence level (e.g., "Medium confidence")
   - Line 2: pillar-specific detail (e.g., "3 of 19 providers are national operators.") + the `Data: …` chip
4. **Weight (preview)** slider — moved below Trust.
5. Formula + Sources collapsibles — unchanged, stay at the bottom.

Remove the old "Why" line and the global confidence paragraph for these 4 cards (same as Pricing).

## Plain-English result sentences (draft)

**Scaled Operator Presence**
- Weak: "Almost no national or multi-site operators are active in this city yet."
- Mixed: "A few national or multi-site operators are present, but the market is not crowded."
- Strong: "Several national or multi-site operators are already competing here."

**Enrichment Diversity**
- Weak: "Families here have very few enrichment options outside daycare."
- Mixed: "There is a moderate mix of enrichment categories for families."
- Strong: "Families here have a wide range of enrichment options to choose from."

**Program Depth**
- Weak: "Most providers here run short or shallow programs."
- Mixed: "Programs here are a mix of short and full-depth offerings."
- Strong: "Most providers here run deep, full-week programs."

**Demand Balance**
- Weak: "Demand and supply look poorly matched in this city."
- Mixed: "Demand and supply are roughly balanced, with some gaps."
- Strong: "Demand and supply look well matched for new premium supply."

(I will confirm exact wording against existing band helpers; you can tweak any line after you see it live.)

## Trust detail lines per card (using existing data)
- **Scaled Operator**: "{nNational} of {nTotal} providers are national or multi-site operators."
- **Enrichment Diversity**: "{nCategories} enrichment categories detected across {nTotal} providers."
- **Program Depth**: "{nDeep} of {nTotal} providers offer full-depth programs."
- **Demand Balance**: "Based on ACS children 5–12 and coverage ratio for this metro."

Confidence level continues to come from the existing pillar-specific `confidenceFor` helper.

## Phases & turns

- **Phase 1 (1 turn)**: Add 4 result-sentence helpers + 4 trust-detail helpers next to the existing `pricingResultSentence`.
- **Phase 2 (1 turn)**: Refactor the card render block so the 3-section layout applies to all 5 pillar keys (not just `pricingAcceptance`). Move Weight slider below Trust for all 5. Keep collapsibles at the bottom.
- **Phase 3 (smoke test, same turn as Phase 2)**: Playwright check on Austin + Boston to confirm all 5 cards render the new layout, popovers still work, sliders still adjust, and no other page is affected.

Total: ~2 turns.

## Risks
Low. Pure UI restructuring inside one file. Main risk is missing a pillar-specific input variable name — mitigated by reading the current input rows for each card before editing.

## What stays untouched
Scoring math, weight slider math, popover data, freshness logic, ConfidenceStamp, Known limitations panel, Formula/Sources collapsibles, all other pages, all backend.
