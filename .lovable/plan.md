# Task 8 — Remove "Market Absorption" card from Market Validation

## 1. What we are changing (plain English)

The Market Validation page scores each city using **6 cards** today:

| Card | Weight today |
|---|---|
| Pricing Acceptance | 20% |
| **Market Absorption** | **25%** ← removing |
| Scaled Operator | 20% |
| Enrichment Diversity | 10% |
| Market Depth | 10% |
| Market Balance | 15% |
| **Total** | **100%** |

We will:
1. Hide the Market Absorption card from the screen everywhere.
2. Drop its 25% weight.
3. **Proportional re-normalize** the other 5 cards so they still sum to 100%.

## 2. New weights (proportional)

Each remaining weight is divided by 0.75 (the sum of remaining weights):

| Card | Old | New |
|---|---|---|
| Pricing Acceptance | 20% | **26.67%** |
| Scaled Operator | 20% | **26.67%** |
| Enrichment Diversity | 10% | **13.33%** |
| Market Depth | 10% | **13.33%** |
| Market Balance | 15% | **20.00%** |
| **Total** | 100% | **100%** |

The relative size between cards stays the same — just bumped up to fill the 25% gap.

## 3. Where the change shows up

Places that mention Market Absorption today (found by code search):

**UI / display**
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — the card itself, plus the "week-by-week activity" table that sits under it.
- `src/components/phase2-demo/LiveCitySourcePanels.tsx` — source panel + week activity table.
- `src/components/phase2-demo/ShortlistTable.tsx` — "Absorp." column in the city list table.

**Scoring engine**
- `src/lib/mvs/computeMvs.ts` — `DEFAULT_WEIGHTS`, score function `score2MarketAbsorption`, composite formula.
- `src/lib/mvs/computeMvs.test.ts` — tests for score 2.

**PDF / export / brief**
- `src/lib/mvsBrief/MvsBriefDocument.tsx`, `src/lib/mvsBrief/sampleBriefAdapter.ts` — Market Brief PDF.
- `src/lib/decisionsExport.ts` — CSV export.

**Sample / demo data**
- `src/data/phase2DemoData.ts` — `absorption` numeric field on each sample city + `AbsorptionStatus` type used by week activity.

**Glossary**
- `src/data/glossary.md` — definition entry + the composite-formula sentence.

## 4. Safe phased plan

### Phase A — Scoring engine + tests (1 turn)
- Update `DEFAULT_WEIGHTS` to the 5-card proportional weights above.
- Remove `marketAbsorption` from `MvsSubScores`, `MvsScoreInputs`, the composite sum, and the score-2 function.
- Update `computeMvs.test.ts` (delete score-2 tests, fix composite tests for new weights).
- Update `useScoringConfig` migration / `cityScoringStore` if they persist the old key (will check during build).

### Phase B — UI removal (1 turn)
- Remove the Market Absorption card from `LiveCityDeepDive.tsx`.
- Remove the "Absorp." column from `ShortlistTable.tsx`.
- Remove the week-by-week activity mini-table and source panel.
- Remove sort/filter handling for `absorption`.

### Phase C — Brief, export, glossary (1 turn)
- Remove the Market Absorption page/section from the PDF brief.
- Remove the `absorption` column from CSV decisions export.
- Update glossary: delete "Market Absorption" entry; update the composite-formula sentence with the 5 new weights.

### Phase D — Smoke test (½ turn)
- Manual: open Market Validation, check a few cities, confirm scores look sensible, confirm composite still 0–100, confirm PDF and CSV render without errors.
- `tsgo` build check.

**Estimated total: ~3 turns.**

## 5. Risks and what NOT to touch

- **Risk**: Cities currently in the DB have stored composite scores that include the old 25% Market Absorption weight. Brett's "one calibrated number everywhere" rule means scores must be recomputed from the helper, not read from stale DB columns. The recompute helper in `recomputedPillars.ts` already handles this — we just change its weights and types. No DB migration needed.
- **Risk**: The week-extraction edge function (`mvs-extract-weeks`) currently feeds Market Absorption. After removal it becomes dead code. **Will NOT delete it in this task** — only stop calling it from the UI. Cleanup can be a separate task.
- **Will NOT touch**: Firecrawl pipeline, Site Analysis (1B), Candidate Pipeline, Teacher Search, branding tokens, or any scoring math inside the 5 remaining cards.

## 6. What you should test after Phase D

1. Open Market Validation — Market Absorption card is gone, 5 cards remain.
2. Composite score for a known city changes (expected — weights moved).
3. Shortlist table no longer has "Absorp." column, sorting still works.
4. Open a city's Market Brief PDF — no Market Absorption page, no broken layout.
5. Download the decisions CSV — no `absorption` column, no errors.
6. Glossary page — Market Absorption entry gone, composite sentence reads with 5 cards.

## 7. Confirmation

I will proceed with **proportional re-normalize** (option 1) as you chose. I will stop after Phase A and wait for your green light before Phase B.

**Approve this plan and I will start Phase A.**
