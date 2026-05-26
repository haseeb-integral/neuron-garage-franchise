## What I found

**Source of truth:** the **table score and selected-market center panel are the correct ones right now**.
- Nashville is showing **99 / Tier A** on the main City Search screen.
- That matches the newer shared score system in `src/lib/marketView.ts` + `src/lib/cityTiers.ts`.

**What “already formatted” meant:**
- The **main table** and **spreadsheet view** were **already using number-format helpers** for dollars, commas, and % signs before the last change.
- So I did **not** change those files for formatting because they were already doing the right display work.

## Root causes of the bugs

### 1) Market Report is using the wrong score path
`src/components/city-scoring/MarketReportModal.tsx`
- It does **not** trust the canonical screen score.
- It rebuilds a `detailScore` by **averaging the 3 pillar display scores**.
- That can disagree with the real city score shown in the table/center panel.
- This is why you saw **Tier C / 75** in the report while the screen showed **Tier A / 99**.

**Conclusion:** the report view is the wrong one.

### 2) Compare modal is reading stale / legacy tier data
`src/lib/cityScoringLiveData.ts`
- Live rows still get `tier` from old `tierFromScore()` raw cutoffs:
  - A >= 80
  - B >= 65
  - C >= 50
- That is the old system.

`src/lib/cityTiers.ts`
- New approved rule says tiers come from the **display score**:
  - A >= 90
  - B >= 80
  - C >= 70
  - D < 70

**Conclusion:** Brett’s newer change is the correct rule. Some surfaces still use older tier assignment.

### 3) Compare modal category scores are blank because they are never populated
`src/components/city-scoring/MarketCompareModal.tsx`
- `scoresByCity` is initialized
- then explicitly set to `{}`
- and never filled with category scores
- so the modal shows `—` for Demand / TAM / Competitive Opportunity

### 4) Compare modal can show more markets than the user thinks they selected
`src/stores/cityScoringStore.ts`
- `selectedForCompare` is persisted in localStorage

`src/pages/CityScoring.tsx`
- compare modal uses `selectedForCompare` from the store directly
- so old checked rows can survive across sessions / screen changes
- that can make the modal open with stale extra cities

## What I will change

### Step 1 — Make one tier system everywhere
Use the approved display-score tier logic everywhere:
- `src/lib/cityTiers.ts`
- `src/lib/cityScoringLiveData.ts`
- `src/components/city-scoring/MarketCompareModal.tsx`
- `src/components/city-scoring/cityColumns.tsx`

Plan:
- stop using old `tierFromScore()` logic for user-facing tiers
- compute tier from the canonical display score / canonical market view
- make spreadsheet, table, compare modal, and report all read the same tier rule

### Step 2 — Make Market Report use the canonical score
Files:
- `src/components/city-scoring/MarketReportModal.tsx`
- `src/pages/CityScoring.tsx`

Plan:
- pass the already-correct selected market score/tier into the report
- remove the local report-only recomputation that averages pillars
- keep pillar bars for display, but stop using them to decide total score/tier

### Step 3 — Fix compare modal category rows
File:
- `src/components/city-scoring/MarketCompareModal.tsx`

Plan:
- build category scores directly from each market’s existing category data using the shared pillar-display path
- remove the dead `scoresByCity` blank-state behavior
- make compare rows show the same calibrated pillar numbers as the main UI

### Step 4 — Fix compare selection truth
Files:
- `src/pages/CityScoring.tsx`
- `src/stores/cityScoringStore.ts`
- possibly `src/components/city-scoring/RankedMarketsList.tsx`

Plan:
- sanitize `selectedForCompare` against the live current market universe
- cap it cleanly at 4
- remove stale ids that no longer exist or are no longer intended
- make the compare count and modal input come from the same cleaned list

## Validation after the fix

I will verify these exact cases:
- Nashville row, center panel, spreadsheet, report, and compare all agree on **score + tier**
- compare modal shows only the cities actually selected
- compare modal category scores are no longer blank
- no old `Tier B / 99` or `Tier C / 75` drift remains

## Technical details

**Correct source of truth now:**
- `src/lib/marketView.ts` for displayed score
- `src/lib/cityTiers.ts` for tier cutoffs

**Wrong / stale paths to remove from user-facing UI:**
- local recomputed report total in `MarketReportModal.tsx`
- legacy raw-cutoff `tierFromScore()` behavior from `cityScoringLiveData.ts`
- empty `scoresByCity` path in `MarketCompareModal.tsx`

Once you approve, I’ll implement only these fixes and then smoke-test them in the preview.