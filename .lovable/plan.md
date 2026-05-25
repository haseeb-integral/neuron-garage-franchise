## What I'm doing (and what I'm NOT)

**NOT doing:**
- Not renaming any internal key (`franchiseeSupply`, `competitiveLandscape`, `demand` all stay).
- Not changing scoring math, database columns, types, or JSON tool schemas.
- Not overriding any Brett decision. The friendly labels **are** Brett's standard — `cityScoringPageHelpers.ts:95–97` is the source of truth, and 10+ files already use them. Three edge functions just never got the memo.
- Not deleting `_ARCHIVED_DO_NOT_USE/` (only `README.md` references it; deferring per your decision).
- Not building a global top-bar Ask AI (deferred per your decision).

**Doing:**
1. Stop Ask AI from showing internal keys to the user.
2. Fix "0 markets found" after Ask AI sets a tier filter.
3. Start a Haseeb→Brett changelog file at repo root.

---

## 1. Stop Ask AI from leaking internal keys

### Files
- `supabase/functions/ai-city-query/index.ts`
- `supabase/functions/ask-city/index.ts`
- `supabase/functions/city-analyst/index.ts`

### Change
In each function:
- Add a `USER_FACING_LABELS = { demand: "Demand", franchiseeSupply: "TAM Teachers", competitiveLandscape: "Competitive Opportunity" }` map.
- Add a rule to the system prompt: *"In any prose written to the user (summary, reasoning_steps, dataGaps), always use the friendly labels. The JSON tool-call fields keep the original keys — do NOT change those."*
- After the model returns, post-process `summary`, every `reasoning_steps[i]`, and `dataGaps[]` with a string replace from internal key → friendly label as a safety net.

`AiAnswerCard.tsx` already maps chips correctly — no change there.

### Verification
- Re-run the screenshot query. Expect reasoning to read "increase **TAM Teachers** and decrease **Competitive Opportunity**" instead of the raw keys.
- Sanity check: log the raw JSON response in dev console; confirm `weightAdjustments.franchiseeSupply` is still present (proves we didn't touch the contract).

### Risk
Low. Reversible by reverting the three function files.

---

## 2. Fix "0 markets found" after AI tier filter

### Files (read first, then surgical edit)
- `src/hooks/citySearch/useCityRanking.ts` (filter block)
- `src/pages/CityScoring.tsx` (where `aiResult.filters.tier` is applied)

### Root cause (to confirm by reading)
AI sets `filters.tier = "A"` based on pre-reweight tiers. Page re-ranks under new weights, only 5 cities are now Tier A. Filter likely compares against the stale base-tier field on the row, so 0 matches. Weighting Preview ribbon correctly shows the 5 cities → data exists.

### Change
- Make the tier filter read the **re-ranked** tier (the one computed from the new composite), not the base tier.
- When the combined filter returns 0 rows, render an inline notice in the table:
  *"Your filter `tier: A` matches 0 cities under these weights — showing Tier A + B instead."*
  and widen automatically. No silent empty grid.

### Verification
- Same screenshot query → table populates with the 5 Tier A cities from the preview ribbon.
- Unit test for the re-tier filter case.

### Risk
Low–medium. Filter logic only, no scoring math.

---

## 3. Haseeb → Brett changelog

### File
- `CHANGELOG_HASEEB.md` at repo root (new file).

### Format
Reverse-chronological. One entry per change with: date · what · why · files touched · risk · how to revert. First two entries today: this fix + the dashboard hint fix from earlier.

### Why this and not adding to README
- Keeps Brett's README clean.
- Single discoverable file Brett can scan in 30 seconds.
- Not in `_ARCHIVED_DO_NOT_USE/`; doesn't conflict with the memory rule (you explicitly asked for it).

### Risk
Zero. Pure documentation.

---

## Order of operations
1. Create `CHANGELOG_HASEEB.md` with today's two entries.
2. Patch the three edge functions + deploy.
3. Read the two ranking files, fix the tier filter + add empty-state notice.
4. Live-test in the preview with the exact screenshot query and report back what changed.
