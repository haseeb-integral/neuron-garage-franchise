## Phase 11.7 — Remove orphaned QA notice from MVS deep dive

### Why

The QA queue reason **"no registration page found"** is written by the `mvs-extract-weeks` scraper. That scraper feeds **only** the Market Absorption pillar (via the `mvs_weeks` table → `score2MarketAbsorption`). Market Absorption was removed from the composite today (June 24, 2026), so those QA rows no longer affect any visible card or the score.

Showing "12 in QA queue · no registration page found" on the MVS deep dive misleads the reader into thinking it lowers the current score. It does not.

### What changes (UI only)

In `src/components/phase2-demo/LiveCityDeepDive.tsx`:

1. **Filter `qaReasons`** before display: drop any reason that matches the registration-page scraper (`"no registration page found"` and `"no usable page: …"` — both come from `mvs-extract-weeks`).
2. **Recompute the displayed QA count** from the filtered reasons (not from `qaOpenCount` directly).
3. **If filtered count is 0**, remove the Known Limitations QA bullet entirely for that city.
4. **QA pill tooltip** in `LiveCitySourcePanels.tsx` — update wording to say the queue tracks per-provider data issues *that affect current scoring pillars*, and that registration-page issues are no longer counted because Market Absorption was retired.

### What stays the same

- `mvs_qa_queue` table — untouched. The rows stay for historical record.
- `mvs-extract-weeks` edge function — untouched (you may want it back later).
- Scoring math, `computeMvs`, `useLiveMvs` data fetch, weights, providers table, dots, sliders, freshness pills, popovers — all untouched.

### Risk

Very low. UI filter only. No DB writes, no scoring changes.

### Turns

1 turn.

### Test after build

Open Austin. The "12 in QA queue" line should be gone (because all 12 reasons are "no registration page found"). Confidence sentences on each pillar card stay as they are from 11.6.
