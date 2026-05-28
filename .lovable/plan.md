# Fix "Show formula" math + rewrite raw/calibrated wording

## The actual bug (Nashville confirms it)

The two screens are telling two different math stories and **one of them is wrong**.

**Edit Config drawer (correct math):**
```
raw Demand 53.3 × 60% master weight = 32.0 pts toward composite
+ raw TAM 44 × 20% = 8.8
+ raw Comp 40 × 20% = 8.0
= raw WCI ~49  →  calibrated to display = 79
```

**"Show formula" popover (wrong math — current code):**
```
display Demand 83 × 60% = 49.8
+ display TAM 73 × 20% = 14.6
+ display Comp 68 × 20% = 13.6
= 78 ≈ 79   ← only coincidentally close
```

It's using the **already-calibrated** pillar numbers and multiplying them by weights, which is **not** how the composite is computed. It looks right today because the calibration curve happens to be near-linear in this range — for a market down at raw 25 the two stories will diverge by 10+ points and the popover will literally not add up to the displayed score. That is the "is this a bug?" feeling you have, and yes, it is one.

Root cause: `src/components/city-scoring/SelectedMarketPanel.tsx` lines 175–211 use `calibratedScore(c.key)` in the breakdown table instead of the raw pillar value.

## Fix 1 — Make the "Show formula" popover tell the real story

Rewrite the popover so it mirrors the drawer math exactly:

```
Nashville, Tennessee — How we got to 79

Category            Weight   Pillar score   Contribution
Demand                60%      53 (math)        31.8
TAM Teachers          20%      44 (math)         8.8
Competitive Opp.      20%      40 (math)         8.0
                                                ─────
                              Math total (WCI):  48.6
                              Display score:       79   ← curve maps 48.6 → 79

Formula: WCI = Σ (weight % × pillar math score); Display = curve(WCI)
```

- Column header changes from "Score" to "Pillar score" with the small "(math)" tag, so it's obvious this is the un-calibrated number that matches the Edit Config drawer.
- Add the **two-row footer**: "Math total (WCI)" and "Display score", with a one-line note that the curve is monotonic so rankings don't change.
- Source the raw pillar value from `buildPillarView(detailCategoryScores)[key].raw` (already on the panel — `pillars` is built on line 79). Stop using `calibratedScore` in this table.

Result: the popover's numbers will reconcile 1:1 with the Sub-Metric Weights drawer for every city, every weight setting.

## Fix 2 — Rewrite the raw/calibrated wording in plain English

Drop "school-grade" and "calibrated" from user-facing copy. They were grade-8 explainers in chat — they don't belong in the UI chrome.

**File:** `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx`

| Where | Today | New |
|---|---|---|
| Subtitle under big composite | `Calibrated school-grade scale · raw WCI 49` | `Display score 0–100 · math score 49` |
| Tier label "Worth a closer look" | (kept) | (kept) |
| Tiny line under each pillar bar | `raw 53 ⓘ` | `math 53 ⓘ` |
| Tooltip body | `"Raw" is this pillar's re-weighted 0–100 score before the school-grade curve. The big number above is the same score, calibrated so 90s = A, 80s = B, etc.` | **Two numbers, one truth.** The big number (83) is the **display score** — easy to read on a 0–100 scale. The small number (53) is the **math score** — the actual weighted average of this pillar's inputs, used to rank cities. The display score bends the math score so top markets land in the 80s–90s. Rankings are identical either way. |

Also add a single one-liner above the three pillar bars (next to "Pillar Scores" if there's a header, or as a faint caption): `Each pillar shows two numbers: the big display score, and the smaller math score it came from.` — so the dual-number layout is self-explanatory without hovering.

## Fix 3 — Same wording cleanup in the Selected Market panel

**File:** `src/components/city-scoring/SelectedMarketPanel.tsx`

- The "Category Scores" bars on the right panel currently show only the display value (83 / 73 / 68). Add a faint `math 53` underneath each, identical to the drawer, so the user sees the same two-number pair everywhere. Same `buildPillarView` is already there.
- Change popover title from `Overall Score breakdown` → `How we got to {composite}` (matches the new narrative).

## Why this is safe

- Pure presentation fix — no scoring, weighting, ranking, tier, or DB logic changes.
- The composite number itself doesn't move (79 stays 79). Only the popover's explanation of how 79 was reached becomes truthful.
- The "math" label is consistent vocabulary with the Edit Config drawer's "Step 2 / Step 3" breakdown, so the two surfaces finally agree.

## Files touched

1. `src/components/city-scoring/SelectedMarketPanel.tsx` — popover table uses `pillars[key].raw`, adds WCI→Display footer, retitles.
2. `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx` — rewrite subtitle, change "raw N" → "math N", rewrite tooltip, add caption above pillar bars.
3. (Optional, same panel as #1) Add small `math N` under each Category Scores bar.

No backend, no migrations, no tests broken (no test asserts on the popover copy or "raw" string).
