
# Plan — MBI rebuild, Market Depth tightening, thin-market consolidation

Goal: three related changes to the MVS scoring. Low risk. Reversible. Nothing outside the MVS composite / Market Validation UI is touched.

## What we are changing and why

The Market Balance Index (MBI) today rewards near-empty markets because "higher ratio = better" saturates at 100 for cities that actually have unproven camp culture. It also contradicts Market Depth (Depth loves providers, Balance punishes them). Market Depth's 4–40 normalization keeps handing out points past the point of proof. Thin-market messaging is duplicated on two cards.

We will:
1. Rebuild MBI as a **zero-weight, two-sided review flag** (Saturated / Healthy / Unproven). Keep the card visible; drop its sub-score and its 20% weight; redistribute that weight to Enrichment Diversity.
2. Tighten **Market Depth** normalization from 4–40 to 4–15 so it saturates once camp culture is proven.
3. Remove the "Thin provider market" badge from Market Depth. Keep the "Thin market — low confidence" flag only on Enrichment Diversity.

## Pages / components / files affected

- `src/lib/mvs/computeMvs.ts` — weights, `score5MarketDepth`, `score6MarketBalance`, add `marketBalanceRatio` + status enum, add thresholds.
- `src/lib/mvs/computeMvs.test.ts` — update numeric expectations.
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — MBI card: swap sub-score gauge for status badge + label change; Market Depth card: remove thin badge, update RESULT bands; ratio label rename.
- `src/pages/MVSMethodology.tsx`, `src/pages/MVSSpec.tsx` — text/formula updates.
- `src/pages/MarketValidation.tsx` — small copy touch where "market balance band" is referenced.
- **New**: `src/pages/MvsCalibration.tsx` (admin-only distribution readout for calibrating thresholds) + a route entry in `src/App.tsx`.
- No database migration. No RLS change. No edge function change. No schema change.

## How it fits without breaking existing features

- `computeMvs()` keeps the same signature and same `MvsResult` shape. `scores.marketBalance` stays in the type but is always `null` (its weight is 0, so the composite ignores it). This preserves any code path that reads the field.
- `inputs.marketBalance` gains a new optional `marketBalanceRatio: number | null` and a `status: "saturated" | "healthy" | "unproven" | null` alongside the legacy `coverageRatio` (kept, mirrors the same number, so old readers do not crash).
- Weight redistribution: MBI's 0.20 → Enrichment Diversity, giving 0.1333 + 0.20 = 0.3333. Others unchanged. Sum stays 1.0. `DEFAULT_WEIGHTS.marketBalance` stays as a key with value `0` so callers passing overrides don't crash.
- Thresholds are **named constants** with a `// PLACEHOLDER — calibrate from live distribution` comment: `MBI_LOW_THRESHOLD = 200`, `MBI_HIGH_THRESHOLD = 8000`. Change in one place after we see the distribution.
- Unwind plan: every change is behind a small number of constants and one card's JSX. Reverting is one commit — no data has moved.

## Risks / do-not-touch / test

Risks:
- Any exporter or brief that reads `scores.marketBalance` will now see `null`. We must scan for those and make them treat null as "not scored" (already the pattern elsewhere). I will grep and patch as part of Phase 1.
- MVS totals for every city will shift because 20% of weight moved to Diversity. This is intentional but user-visible — I will show 3 before/after totals in the Phase 1 summary.

Do not touch: Demand pillar math, CSI, City Scoring composite, candidate pipeline, teacher prospects, site analysis, any edge function. UI changes stay inside the Market Validation surface.

Manual smoke test after each phase (I'll list the exact clicks in the summary).

## Phases

**Phase 1 — Core math + types (1 turn).**
- Edit `computeMvs.ts`: add `MBI_LOW_THRESHOLD` / `MBI_HIGH_THRESHOLD` constants; rewrite `score6MarketBalance` to return `score: null`, `inputs: { marketBalanceRatio, status, coverageRatio (mirror), affluentDualIncomeFamilyCount, premiumProviderCount }`; retighten `score5MarketDepth` to 4–15; move MBI's 20% into `enrichmentDiversity` in `DEFAULT_WEIGHTS`.
- Update `computeMvs.test.ts` expected numbers.
- Grep for any `scores.marketBalance` consumer and confirm null-safe.

**Phase 2 — Live City Deep Dive UI (1 turn).**
- Market Balance card: drop the 0–100 gauge; show ratio (formatted with thousands separator), the two evidence values, and a status badge ("Healthy" = no badge, "Saturated — review", "Unproven camp culture — review"). Rename the ratio label to "Affluent families per premium provider". Update the RESULT sentence. Replace the "High confidence / Data: strong" trust line with "Review recommended" when a flag is shown.
- Market Depth card: remove the "Thin provider market" badge, update the RESULT bands (<8 / 8–14 / 15+), update the "How this score is calculated" text.
- Enrichment Diversity card: keep the "Thin market — low confidence" flag as-is with an explanatory comment.

**Phase 3 — Docs + calibration readout (1 turn).**
- Update `MVSMethodology.tsx` and `MVSSpec.tsx` formulas and status labels.
- Small copy fix in `MarketValidation.tsx`.
- Add `src/pages/MvsCalibration.tsx`: fetches every scored city, computes the MBI ratio client-side via `computeMvs`, renders a sortable table + simple histogram, and highlights Austin. Reachable at `/mvs-calibration` (admin-visible route entry; no auth gate change — same access pattern as other admin pages in this app).

## Verification I will deliver at the end

- Screenshot / description of the MBI card for the 12-provider, 54,553-affluent-families city: ratio ≈ 4,546, "Healthy", no sub-score, no composite contribution.
- Screenshot of the calibration readout with Austin highlighted.
- Two synthetic cases (ratio = 100 → Saturated; ratio = 20,000 → Unproven) with badge + RESULT sentence.
- MVS composite for 3 cities before/after, showing weights sum to 1.0 with MBI at 0.
- Market Depth for a 12-provider city (≈ 72.7) and a 20-provider city (100.0), no thin-market badge.

## Technical details

- `marketBalanceRatio = affluent_dual_income_family_count / premiumProviderCount`. Note: the existing field name `affluent_dual_income_family_count` is already the B19131-derived "affluent families with children" number in this codebase (see `src/lib/mvs/useLiveMvs.ts` — dual-working × affluent × families-with-children). We keep the field name to avoid a rename ripple; the display label becomes "Affluent families per premium provider".
- If `premiumProviderCount === 0`: return `marketBalanceRatio: null`, `status: "unproven"`, message "No premium providers found".
- Status logic: `ratio < LOW → "saturated"`, `ratio > HIGH → "unproven"`, else `"healthy"`.
- `DEFAULT_WEIGHTS` after change: `pricingAcceptance 0.2667, scaledOperator 0.2667, enrichmentDiversity 0.3333, marketDepth 0.1333, marketBalance 0, marketAbsorption 0`. Sum = 1.0000.
- Market Depth: `normalize(clamp(premiumProviderCount, 4, 15), 4, 15) * 100`.
- Thin-market flag stays on Enrichment Diversity only; guard: `premiumProviderCount < MVS_ENRICHMENT_THIN_MARKET_THRESHOLD (4)`.

Waiting for your approval before I start Phase 1. I will implement one phase per turn and pause for you after each with a summary + smoke-test list.
