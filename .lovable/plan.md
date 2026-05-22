# City Scoring Upgrades — Locked Plan (Middle Option)

## Core principle (the rule that prevents most bugs)
**Anything visible in the table or map = last Apply. Anything labeled "preview" or "→ after Apply" = pending.**
Sliders move freely → preview updates live → Apply commits to table + map together. Never split.

---

## Step 1 — Central scoring hook (foundation, invisible)
Create `useWeightedCities(rawCities, weights)` returning `{ cities, tierCounts, byId }`.
Two instances used:
- `committed` = fed by applied weights, drives table + map + popover + CSV
- `preview` = fed by live slider values, drives only the preview badge + tier projection

Both call the same scoring function. Identical math, different commit timing. Prevents Risk 3 (preview/Apply drift) at the architectural level.

## Step 2 — "Why this tier?" popover
Click a row → side panel showing 6 category scores, active master weights, multiplication, composite, tier boundary. Missing categories shown as "— (no data, excluded)".
If preview ≠ committed when popover opens, footer shows: *"Pending weights would change composite to 84 (Tier A → B)."* — honest, doesn't pretend preview is real.

## Step 3 — Live tier counts bar
Above the table. Format adapts to state:
- Clean state: `Tier A: 23 · B: 117 · C: 402 · D: 275`
- Pending state: `Tier A: 23 (→ 31 after Apply) · B: 117 (→ 109 after Apply) · ...`
Reads `committed` for the main number, `preview` for the arrow projection.

## Step 4 — Apply Weights gate behavior (NEW — the middle option core)
- When `slider values === last applied`, Apply button is calm (disabled or muted).
- When `slider values !== last applied`, Apply button **pulses gently + highlighted color** and a stale banner appears above the table: **"Showing previous results — click Apply Weights to update."**
- First-time pulse triggers a one-time tooltip on Apply: *"Click to commit slider changes to the table."*

## Step 5 — Live preview badge next to Apply button
Small badge: **"Preview: 31 Tier A · 109 Tier B"** (or similar). Updates live as sliders drag. Calculates tier counts only (no sort, no render of rows) — cheap on 817 cities. Debounced 150ms only if measurement shows it lags.

## Step 6 — CSV export
Exports `committed` state only. Header line records committed weights + timestamp.
If there are uncommitted slider changes, button shows a small warning indicator with tooltip: *"Export reflects last applied weights. Click Apply to update."* Button stays enabled (don't block the user, just inform).

## Step 7 — Type-in numeric input next to each slider
Number box beside each slider. Clamp 0–100 on blur. Reject NaN silently. Typing a value puts the system into pending state (same as dragging).

## Step 8 — Reset to defaults button
Sets sliders to defaults **AND auto-applies immediately.** One clean state, no half-reset. Defaults stored in one frozen constant in `src/lib/scoring/defaults.ts`.

## Step 9 — Preset strategy buttons (3–4: e.g. Demand-led, Avoid Competition, Balanced, Custom)
Presets **only move the sliders.** User still clicks Apply. Keeps the model consistent. Defined in `src/lib/scoring/presets.ts` with a `// REVIEW WHEN DEFAULT_WEIGHTS CHANGES` comment.

## Step 10 — Tier-colored map markers
Tier A = green, B = blue, C/D = small low-opacity gray. "Show only A/B" toggle on the map. Markers reflect `committed` state only.

## Step 11 — Hover row → pulse map marker
Hovering a row toggles a CSS class on the corresponding marker. CSS animation, no JS loop. Operates on committed state.

## Step 12 — Click map marker → scroll table to row
`scrollIntoView({ block: 'center', behavior: 'smooth' })` + row highlight. Operates on committed state.
Code comment: `// BREAKS IF TABLE VIRTUALIZED — switch to scrollToIndex`.

---

## Risks already mitigated (recap)
| # | Risk | Mitigation in plan |
|---|------|---|
| 1 | Two-state confusion | Step 4: stale banner + pulsing Apply button |
| 2 | Users forget Apply | Step 4 + Step 6 CSV warning indicator |
| 3 | Preview vs Apply math drift | Step 1: both call same scoring function |
| 4 | Preview performance | Step 5: counts only, no sort/render, optional 150ms debounce |
| 5 | Reset ambiguity | Step 8: reset auto-applies |
| 6 | Preset ambiguity | Step 9: presets move sliders only, user clicks Apply |
| 7 | Tier bar two-state | Step 3: "→ after Apply" arrow notation |
| 8 | Popover two-state | Step 2: shows committed + pending footer |

## Gotchas prevented
- **A (Map ↔ preview disagree):** Map only ever reflects committed state. Preview lives only in badge + tier bar.
- **B (Hover/click sync):** Both operate on committed state, which moves with the table — no possible split.
- **C (Future URL state):** Code comment to encode committed weights only.
- **D (New user confusion):** First-time tooltip on pulsing Apply + plain-English stale banner.

## Out of scope (deferred)
- Sensitivity hints (Step 3 from original list — needs scoring product decision)
- Data completeness badge (needs coverage policy decision)
- Freshness indicator (needs reliable `last_scored_at` column)
- URL state / shareable links
- Table virtualization

## Files likely touched
- `src/pages/CityScoring.tsx` (read first to confirm current Apply-Weights structure before editing)
- `src/components/city-scoring/MarketsMap.tsx`
- New: `src/hooks/useWeightedCities.ts`
- New: `src/components/city-scoring/WhyThisTierPopover.tsx`
- New: `src/components/city-scoring/TierCountsBar.tsx`
- New: `src/components/city-scoring/PreviewBadge.tsx`
- New: `src/lib/scoring/defaults.ts`
- New: `src/lib/scoring/presets.ts`

## Verification after each step
Refresh preview, exercise the feature, confirm:
1. Committed numbers in popover/tier bar/CSV all match the table.
2. Preview numbers update live, are clearly labeled "→ after Apply."
3. Clicking Apply transfers preview → committed; map + table + popover all update together.

## Doc-sync (per AGENTS.md Mode A)
After build: draft one-line updates to PROJECT_CONTEXT.md + OPEN_TASKS.md and wait for explicit "go."

## Estimated unmitigated risk
~5%. The remaining risk is mostly first-use confusion before users learn the pending/committed model — addressed by Step 4 tooltip but can't be fully eliminated until they use it once.
