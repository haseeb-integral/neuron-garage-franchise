# Restore the rich card UI on /site-analysis (live-data version)

## Why this is needed

When I rebuilt the candidate cards as live-engine inputs last turn, I dropped four pieces that were on the demo card:

1. One-liner summary (e.g. "Strong site. Affluent, dense, accessible…")
2. Drive-time schematic with "10 · 15 min drive" badge
3. Six metric tiles (Median HHI, HH >$150k, Kids 5-12, Drive to Hwy, Parking, Pop 15m)
4. "Show all formulas" toggle on Sub-scores

That was a scoping miss. Most of the data behind those tiles is already returned by `compute-sas` — I just wasn't exposing it. This plan puts them back, all reading from the live engine, no demo numbers.

## What the restored card will look like

```text
┌─ Trinity Christian Academy  [Positive anchor]      51 ┐
│  3901 Bee Caves Rd, Austin, TX           Worth a look │
│                                          auto from score│
│  [School name input] [Address input]                   │
│  [School type ▾] [Grade band ▾] [Enroll]   [Analyze]   │
│                                                        │
│  Affluent, dense neighborhood. Ecosystem average.      │  ← one-liner (auto from live pillars)
│                                                        │
│  10-min 60% · 15-min 40%               [Drive-time]    │
│  ┌──────────────────────────────────────────────────┐  │
│  │       ◦──────────◦                       MAP     │  │  ← schematic SVG (concentric rings)
│  │      ◦            ◦                              │  │     using live lat/lng
│  │       ◦──────────◦                               │  │
│  │  10 · 15 min drive                               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  MEDIAN HHI · 10M   HH >$150K · 10M   KIDS 5-12 · 10M │  ← live from signals.acs10
│  $178k              44%                9,420           │
│                                                        │
│  DRIVE TO HWY       PARKING            POP · 15M       │
│  —                  —                  412k            │  ← Hwy & Parking show "—" (not yet wired)
│                                                        │     Pop · 15M live from signals.acs15
│  SUB-SCORES                       [Show all formulas]  │  ← toggle
│  School Profile (25%)                          85      │
│  ████████████████░░░░                                  │
│    └ when toggle on: 0.25 × 85 = 21.3 pts              │
│  …                                                     │
│                                                        │
│  BRETT'S DECISION                          [★ Winner]  │
│  [Recommend] [Worth a look] [Don't recommend]          │
└────────────────────────────────────────────────────────┘
```

## What each piece reads from

| Piece | Live source | If missing |
|---|---|---|
| One-liner summary | Derived from live pillar scores (any pillar ≥80 → "strong", ≤50 → "weak") | "Run Analyze to see summary." |
| Drive-time schematic | Concentric SVG rings; label uses live `result.place` if present | Hidden until first analyze |
| Median HHI · 10M | `signals.acs10.medianHhi` | "—" |
| HH >$150k · 10M | `signals.acs10.pctAbove150k` | "—" |
| Kids 5-12 · 10M | `signals.acs10.children5to12` | "—" |
| Drive to Hwy | Not yet returned by engine (`accessibilityScore` uses null stub) | "—" with tooltip "v0.2 — not yet wired" |
| Parking | No data source yet | "—" with tooltip "manual field — not yet wired" |
| Pop · 15M | `signals.acs15.totalPop` | "—" |
| Sub-scores | `recomputeSiteScores(result.pillars)` (unchanged) | hidden |
| Show all formulas | Per-pillar expander showing `weight × value = contribution` | — |

No fake numbers. The two stubs (Hwy, Parking) explicitly render "—" with a tooltip — Brett can see at a glance which tiles are pending vs live.

## Files touched

1. **`src/hooks/useSiteScore.ts`** — extend the returned `result` to also expose `signals` (already in the edge function response, just not surfaced) and keep `place`. No behavior change.

2. **`src/pages/SiteAnalysis.tsx`** (CandidateCard body) — insert four new blocks between the input form and the Sub-scores section:
   - `<CandidateSummary pillars={recomputed.pillars} />` — one-liner generator
   - `<DriveTimeSchematic place={result.place} />` — concentric SVG
   - `<MetricTiles signals={result.signals} />` — 6-tile grid
   - "Show all formulas" toggle added to the existing Sub-scores header; expands each `PillarBar` to show `weight × value = contribution`

3. No new files; everything lives as local components in `SiteAnalysis.tsx` to keep the diff small.

## Out of scope

- Real Mapbox tile rendering with the isochrone polygon overlaid. The schematic SVG matches what the demo showed. Real tiles can be a follow-up once Brett confirms the look.
- Wiring `Drive to Hwy` and `Parking` — those need new engine signals (highway distance API, manual parking input). Currently shown as "—".
- Changing pillar formulas, weights, or the calibration logic. This is pure UI restoration.

## Status / logging

- Append a row to `.lovable/phase-2/CHANGELOG.md` for the restore.
- Update the `Feature1BStatus` checklist on the page: tick "Rich card UI restored (summary, map, tiles, formula toggle)", note Hwy/Parking still pending.

## Test plan

1. Hard-refresh `/site-analysis`. Trinity + LeafSpring auto-run. Each card shows summary line, schematic map, 4 live tiles + 2 "—" tiles, sub-scores.
2. Click "Show all formulas" → each pillar row expands to show its weighted contribution; they sum to the composite shown in the header.
3. Add a new candidate, analyze → same layout populates with that site's live numbers.
4. Hover the "—" tiles → tooltip explains why they're empty.

Approve and I'll build it.
