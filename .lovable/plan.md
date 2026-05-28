## Where the raw scores live in the backend

Table: **`public.us_cities_scored`** — three integer columns per city:

| UI pillar | DB column | Nashville value |
|---|---|---|
| Demand | `score_demand` | 100 |
| TAM Teachers | `score_tam_teachers` | 49 |
| Competitive Opp | `score_csi` (flipped to `100 − csi`) | 60 → opp 40 |
| Overall | `composite_score_default` | 73 |

The "raw 53 / 44 / 40" you see in the drawer is **not** read directly from those columns. After the Nashville unification fix, every surface (table, panel, drawer, compare) runs the stored signals through `buildRecomputedPillarScores()` in `src/lib/recomputedPillars.ts` using the **current applied weights/sub-weights**. That re-weighting is why drawer Demand raw=53 even though `score_demand=100` in the DB — the live weights pull it down.

The "raw N" footnote = re-weighted score on the 0–100 unfriendly scale. The big number = same value bent through the school-grade calibration curve in `src/lib/marketView.ts`.

## What I'll change in the UI

One file: `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx`

- Wrap the existing `raw {n}` line in a shadcn `Tooltip` (already used elsewhere in the project) with an inline `ⓘ` icon (lucide `Info`, 10px).
- Tooltip copy (one sentence, plain English):
  > "Raw" is this pillar's re-weighted 0–100 score before the school-grade curve. The big number above is the same score, calibrated so 90s = A, 80s = B, etc.

No business logic touched. No DB changes. No other surfaces touched.

## Verification

- Hover the ⓘ on Nashville's Demand pillar → tooltip appears with the sentence.
- Big number (83) and raw (53) remain unchanged.
- Lighthouse/a11y: tooltip uses the existing Radix primitive (keyboard + screen-reader friendly).
