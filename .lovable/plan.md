# Enrichment Diversity — Simplify to Category Count Only

## What we are changing and why

Right now the Enrichment Diversity sub-score mixes two things:
- Category Count (how many distinct enrichment types are present) — weight 70%
- Diversity Ratio (categories ÷ premium providers) — weight 30%

The ratio quietly punishes big healthy markets (more providers = smaller ratio). The "narrow market" case it was meant to catch (e.g. 10 robotics camps and nothing else) is already handled by a low category count.

**New formula (single line):**
```
MIN_CATEGORIES = 2
MAX_CATEGORIES = 10
enrichmentDiversityScore = normalize(clamp(categoryCount, 2, 10), 2, 10) * 100
```

Plus a **display-only** "Thin market — low confidence" label anywhere the score is shown, when the city has fewer than 4 premium providers total. The math does not change based on this flag.

## Why this is low risk

- The change is inside one pure function: `score4EnrichmentDiversity` in `src/lib/mvs/computeMvs.ts`. No DB writes, no schema changes, no edge function changes required for the math.
- The MVS composite weight for Enrichment Diversity (0.1333) stays the same, so overall MVS numbers shift only slightly — only for cities where the ratio was pulling the sub-score up or down.
- `premiumProviderCount` field stays in the `inputs.enrichmentDiversity` payload (still returned, still displayable) so no other reader breaks.
- Easy to unwind: revert one function + one constant block + remove the flag prop. No data migration to undo.

## Pages / files that may be touched

Math (must change):
- `src/lib/mvs/computeMvs.ts` — replace `score4EnrichmentDiversity` body, add named constants, update comment.
- `src/lib/mvs/computeMvs.test.ts` — update the diversity test cases to the new formula.

Display (thin-market flag only, no math):
- `src/pages/MarketValidation.tsx` — where the Enrichment Diversity card/score is rendered, add the "Thin market — low confidence" pill when `premiumProviderCount < 4`.
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — same flag next to the same score if it renders there.
- `src/lib/mvsBrief/MvsBriefDocument.tsx` and `src/pages/MarketBrief.tsx` — same flag in the printed brief.

Docs (text only, so numbers in docs match the code):
- `src/pages/MVSMethodology.tsx`
- `src/pages/MVSSpec.tsx`
- `src/data/userGuideMarkdown.ts`
- `src/data/glossary.md`
- `docs/feature-1a-mvs-v1-spec.md`

Not touched:
- `mvs-classify-tier` edge function (only reads the sub-score, doesn't compute it).
- Any weights, other pillars, DB tables, or `premiumProviderCount` field itself.

## Thin-market flag rule (display only)

- Condition: `inputs.enrichmentDiversity.premiumProviderCount < 4`
- Label: `Thin market — low confidence`
- Placement: small pill next to the Enrichment Diversity score wherever it appears (card, deep-dive, brief).
- Does **not** change the score, does **not** change MVS, does **not** change tier.

## Phases

**Phase 1 — Math + tests (1 turn)**
- Update `score4EnrichmentDiversity` in `computeMvs.ts` to the new one-line formula.
- Add `MVS_ENRICHMENT_MIN_CATEGORIES = 2` and `MVS_ENRICHMENT_MAX_CATEGORIES = 10` constants.
- Add the code comment: "measures enrichment breadth; deep-but-narrow markets floor automatically via low category count."
- Update `computeMvs.test.ts` diversity cases.
- Run vitest to confirm green.
- Verify 3 sample cases and paste the numbers back to you:
  - ~9 categories, many providers → expect ~87.5
  - 3 categories → expect ~12.5
  - 1 category (clamped to 2) → expect 0.0, plus thin-market flag

**Phase 2 — Thin-market flag on UI surfaces (1 turn)**
- Add the pill in `MarketValidation.tsx`, `LiveCityDeepDive.tsx`, `MvsBriefDocument.tsx`, `MarketBrief.tsx`.
- Pure JSX, no state changes.

**Phase 3 — Doc text refresh (1 turn)**
- Update the 5 doc files listed above so the written formula matches the code.

## Risks / what NOT to touch

- Do not change the 0.1333 composite weight.
- Do not remove `premiumProviderCount` from the returned `inputs` — other cards read it.
- Do not touch other sub-scores or the Market Depth score (which still uses premium count on purpose).
- Cities near a tier boundary may nudge a tier up or down after the math change — expected.

## What to test after Phase 1

- Open Market Validation, pick a big-market city (San Diego / Bellevue) — Enrichment Diversity should not drop just because there are lots of providers.
- Pick a small city with 1–2 provider types — Enrichment Diversity should be at/near 0 and the thin-market flag should show after Phase 2.

Waiting for approval before Phase 1.
