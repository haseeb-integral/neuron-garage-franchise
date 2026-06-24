# Site Analysis — 3 problems, 1 plan

## Problem 1 — Removed cards come back after refresh

**What you saw:** removed all 4 cards → refresh → Trinity, LeafSpring, Wayside (no score) and one empty slot reappeared.

**Why (three real causes, all in `src/pages/SiteAnalysis.tsx`):**

1. **Race condition on save.** Every click on ✕ writes the full hidden list to the DB on its own. If you click 4 cards fast, 4 writes go out in parallel. The last one to land in the DB wins — and it may be an older, shorter list. So 1–2 of the 4 IDs get dropped.
2. **Wayside seed has no analysis id.** Hydration auto-injects a "Wayside Eden Park" seed card when missing (lines 936–949). It is not a real DB row, so removing it cannot be remembered. Next refresh it is added back automatically.
3. **Empty slots cannot be hidden.** Removing an empty slot just shrinks the array in memory. After refresh the hydration code rebuilds 4 slots again, including the Wayside seed.

**Fix:**
- Replace the per-click DB write with **one debounced write driven by a `useEffect` on `hiddenIds`** (writes after 250 ms of no change → no race).
- **Drop the auto Wayside seed.** If the user wants Wayside, the Saved Sites drawer already has it — one click loads it back. Hydration just shows what is actually in the DB and not hidden.
- Extend `sas_hidden_ids` to also accept `addr:<address>` entries. The remove handler hides by `analysisId` when known, otherwise by `addr:<address>`. Hydration skips a row when either `row.id` or `addr:row.address` is in the set.
- The empty 4th slot needs no DB hide — once we kill the Wayside seed, hydration only produces as many slots as there are real rows (capped at 4).

## Problem 2 — Card score ≠ Saved Sites score for the same address

**What you saw:** Trinity is 48.53 on the card, 48.44 in the drawer. LeafSpring is 60.57 on the card, 44.37 in the drawer.

**Why:** the card and the drawer point to **different `site_analyses` rows for the same address**. Each row is one full run with its own inputs:

- school type (Private elementary vs Daycare/Other)
- enrollment number
- grade band
- and the snapshot of the scoring formulas at the time it ran

The card hydrates the **most recent row** for the address. The drawer shows the **row the user (or Brett) bookmarked earlier**, which had different inputs.

So yes — different inputs and different run date both move the score. Time-of-day alone does nothing; date matters only because the formulas evolve between runs.

**Fix — full transparency, no math change:**
- On every card and every saved-drawer entry, show a small **"computed" stamp** in the same spot:
  `Inputs: Private elementary · K-5/K-6 · enroll 400 · run Jun 22, 7:36 PM`
- When the address on a card also exists in Saved Sites with a **different** input set, show a tiny **"Why different from saved?"** chip on the card. Clicking it opens a popover that lists the differences side-by-side (school type, enrollment, grade band, run date, each pillar score, composite). No re-compute, no API spend — read straight from the rows we already have.
- The card's "school_type · grade · enrollment" line stays where it is but uses the same labels as the inputs stamp so there is one source of truth on screen.

## Problem 3 — User Confidence has no "unset" option

**What you saw:** Strong / High / Medium / Low. Once tapped, you can't go back to "I haven't decided yet."

**Standard pattern** (used by Linear, Notion, GitHub labels, Asana priority, Jira): a nullable single-select chip group has two affordances together:
1. A leading **"Not rated yet"** chip that represents the cleared state.
2. **Click the active chip again to toggle it off** back to "Not rated yet."

This matches what users already expect from filter chips and priority pickers.

**Fix in `src/components/phase2-demo/SiteDecisionControls.tsx`:**
- Add a leading `Not rated yet` chip. Selected when `verdict === "undecided"`.
- Make every chip a toggle — clicking the selected one writes `undecided` (the type already supports it; `useSiteDecisions` already maps it).
- Update the "Add note" prompt copy so it is fine in both states.

No DB migration needed — `verdict = "undecided"` is already the default in `site_analysis_decisions` and the upsert path handles it.

## Phases and turns

| Phase | What | Turns | Risk |
|---|---|---|---|
| A | "Not rated yet" + click-to-clear on confidence chips | 1 | very low — UI only, one file |
| B | Fix soft-hide: debounced write, kill Wayside seed, address-based hide | 1 | low — one file (`SiteAnalysis.tsx`), no schema change |
| C | Transparency: inputs + run-date stamp on card and drawer, "Why different?" popover | 1–2 | low — read-only UI from rows we already fetch |

## What is NOT touched

- Scoring math (`sas-math.ts`, `compute-sas` edge function, `recomputedPillars.ts`).
- DB schema. `profiles.sas_hidden_ids` already exists as `text[]`; we just put a few `addr:...` strings in it alongside the UUIDs.
- Market Validation page, Saved Sites drawer business logic, RLS, calibration anchors.

## What to test after each phase

- **A:** Click Strong → chip turns green. Click Strong again → "Not rated yet" becomes active. Click Medium → switches to Medium. Refresh → state holds.
- **B:** Score 4 sites → ✕ all 4 fast → refresh → all 4 stay gone, no Wayside seed reappears. Load one from drawer → it comes back. Remove an empty slot → nothing weird, refresh still empty.
- **C:** Same-address card and drawer entry show their input stamps; "Why different?" lists the diff. Edit nothing else.

I will wait for approval, then ship **Phase A first**.
