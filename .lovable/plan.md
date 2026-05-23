# Self-Run Audit: marketView Refactor

You approve once. I run all 7 phases end-to-end and deliver a single pass/fail report with evidence. No further prompts unless something is broken badly enough to need your call.

---

## Phase 1 — Architecture sanity (static code scan)

- Read `src/lib/marketView.ts` end-to-end. Confirm single `getMarketView()` export and `CompositeScore` branded type.
- `rg` for `composite`, `toFixed`, `Math.round`, `* weight`, `weights[` across `src/pages` and `src/components`. Any score math outside `marketView.ts` is a finding.
- Confirm `CityScoring.tsx` and the ranked-markets table both import from `marketView.ts` and do zero recomputation.
- Output: list of files touched + any leaked math hits.

## Phase 2 — Type safety

- `grep` for `as CompositeScore` casts. Casts outside `marketView.ts` are flagged as smells.
- Read tsc output from the harness. Zero errors required.

## Phase 3 — Runtime drift detector (browser)

- Open preview in dev mode via browser tool.
- Navigate to 5 cities spanning the score range (high/mid-high/mid/low-mid/low — I pick from the live data).
- For each: capture console logs, screenshot the gauge, screenshot the table row. Confirm no red "composite drift" error.

## Phase 4 — Number reconciliation

- For the same 5 cities: read table composite, gauge composite, tier badge bucket. Assert all three agree.
- Open "Show Formula" on the detail page, confirm category sub-scores weight-sum back to the displayed composite (±0.5 for rounding).
- Move a master weight slider, confirm table + gauge update together to the same new value. Reset, confirm both snap back.

## Phase 5 — Docs match reality

- Read AGENTS.md Rule 12, HOW_IT_WORKS.md § 4 score invariant, PROJECT_CONTEXT.md § 5 May 23 entry.
- Confirm each references `src/lib/marketView.ts` and that the file actually exists.

## Phase 6 — Regression sweep

- Ranked Markets loads, sorts, filters.
- Reset filters → market count returns to 817.
- City detail renders all 6 category cards + gauge + tier badge.
- Master sliders auto-rebalance (Rule 5); sub-weights do not.
- "Show Formula" works on every widget I can reach (Rule 1).

## Phase 7 — Destructive test (proves the guard rail works)

- Temporarily edit `CityScoring.tsx` to render a hardcoded wrong composite for one city.
- Reload page, capture console — drift detector MUST fire red error.
- Revert the edit. Confirm console clean again.
- If detector does not fire, that is a P0 finding.

---

## Deliverable

A single report with:
- Phase-by-phase PASS / FAIL / WARN
- Screenshots from Phase 3, 4, 7
- List of any leaked math, suspicious casts, or doc/reality mismatches
- One-line verdict: "ship it" or "these N things need fixing first"

## Stop conditions (I'll wake you)

- Phase 7 destructive test fails (guard rail is fake)
- Phase 4 reconciliation fails on any city (the original bug is back)
- More than 3 findings of leaked score math in components
- Anything that needs a product decision (e.g., the formula itself looks wrong)

Otherwise I run straight through and you get the report.

## Technical notes

- Phase 7 edit will be on a throwaway line, reverted in the same session via `code--line_replace`. No git commits — Lovable autosync is fine because I revert before finishing.
- Browser checks use the `browser--*` tools against the preview URL, not your local session.
- Estimated runtime: 8–12 minutes of tool calls. No cost concerns.
