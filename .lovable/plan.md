# City Screen Fix Pass

Five related issues, all in `MarketDetailDrawer.tsx`, `SourceDataPanel.tsx`, `CityScoring.tsx`, and `scoringPresets.ts`. No DB changes.

---

## FIX A — "PROXY" → "Estimated" everywhere user-facing

**Files:** `src/components/city-scoring/MarketDetailDrawer.tsx`

- `STATUS_STYLES` keys stay (`proxy`, `live`, `missing`...) — they're internal types.
- `StatusBadge` component renders the raw status string. Replace with a label map: `live`→"Live", `proxy`→"Estimated", `missing`→"Missing", `blocked`→"Unavailable", `manual`→"Manual".
- Header summary (line 374): change `{proxyCount} proxy` → `{proxyCount} estimated`.
- Result: image-87 will show "ESTIMATED" pill instead of "PROXY"; image-88 will show "15 estimated" instead of "15 proxy".

`SubMetricWeightsDrawer.tsx` already says "Estimated" — no change needed there.

---

## FIX B — Live / Estimated / Missing counts are wrong

**Root cause:** in `getStatus()` (line 106), if `raw_data.status` is missing, the signal silently defaults to `"proxy"`. Many "Not available yet" rows have no `raw_data.status` AND no `value` → they're being counted as Estimated when they should be Missing. That's why your screenshot shows 15 estimated and only 26 missing — inflated proxy count.

**Fix in `getStatus()`:**
- If `signal.value` is null / undefined / empty string / `"—"` / `"Not available yet"` → return `"missing"`.
- Else if `raw_data.status` is set → use it.
- Else default to `"live"` (a row WITH a value but no status flag is genuinely live data).

This will rebalance the header pills to honest numbers per city.

---

## FIX C — Row-level badge formatting (image-87)

**File:** `src/components/city-scoring/MarketDetailDrawer.tsx`, `renderSignalRow` (lines 307–349).

Issues visible in the screenshot:
1. The trailing source name (`COMPUTED`, `APIFY`, `FIRECRAWL`, `ACA`) is plain uppercase text wedged between rounded pills — visually inconsistent.
2. Long labels + 3 badges + source text wrap awkwardly at this drawer width.
3. "INFO ONLY" pill style is too pale vs the colored ones.

**Changes:**
- Wrap source-name in the same rounded-pill style used for other badges (small grey outline pill) so the row reads as a uniform badge strip.
- Add `flex-wrap` to the badge row (currently `flex-nowrap overflow-hidden` truncates badges).
- Bump "INFO ONLY" foreground contrast slightly (#526078 instead of #8794ab).
- Make the metric label clamp to 2 lines max (`line-clamp-2`) so layout stays predictable.

---

## FIX D — Source Data card formatting (image-86)

**File:** `src/components/city-scoring/SourceDataPanel.tsx`, lines 79–104.

Issue: source name truncates aggressively to "BLS (Occupati..." and "U.S. Census Bu..." because every column is in the same flex row. At 1083px viewport the right side has just ~280px width.

**Changes:**
- Restructure each row into two lines: line 1 = source label (full, no truncation) + status pill on the right; line 2 = small muted text "3 rows · 2 days ago" + external link icon.
- This removes the awkward middle truncation and matches the visual density of the rest of the right panel.

---

## FIX E — Sticky bottom buttons overlap content (image-87)

**File:** `src/components/city-scoring/MarketDetailDrawer.tsx`, lines 515–527.

The sticky footer has only `bg-white pt-2` so previous rows show through above the buttons (you can see "INFO ONLY  STATE  MISSING  ACA" bleeding behind the buttons in the screenshot).

**Changes:**
- Add a top border + soft shadow + bottom padding: `border-t border-[#eef2f7] pt-3 pb-3 -mx-6 px-6 shadow-[0_-4px_12px_-6px_rgba(7,20,47,0.08)]`.
- Add `mt-4` so it doesn't flush against the last data card.
- Result: clean visual separator, no bleed-through.

---

## FIX F — Scoring Model dropdown is dummy (image-89)

**File:** `src/pages/CityScoring.tsx`, lines 1032–1041 + `useCityScoringStore` defaults.

Today the dropdown has 3 hardcoded labels (`Affluent Suburbs Model`, `Urban Core Model`, `Emerging Markets Model`) and `setScoringModel` only updates state — nothing applies weights. Earlier work (`scoringPresets.ts`) already defined real presets (`Balanced` / `Demand-Heavy` / `Pricing-Heavy` / `Custom`) but the dropdown was never rewired.

**Changes:**
1. Replace the 3 SelectItem entries with `PRESET_NAMES` from `scoringPresets.ts` (Balanced, Demand-Heavy, Pricing-Heavy, Custom).
2. Default value migrated: if persisted `scoringModel` is one of the old names, fall back to "Balanced" on load (one-line guard in CityScoring before render).
3. `onValueChange` becomes:
   - If preset === "Custom": just set `scoringModel` (don't touch weights).
   - Else: `setScoringModel(name)` + `setWeights(SCORING_PRESETS[name])` + `setAppliedWeights(SCORING_PRESETS[name])`. This immediately re-scores all cities.
4. When the user moves a master slider manually, auto-flip `scoringModel` to "Custom" (one-liner inside the slider's onValueChange).
5. Show a small caption under the dropdown: `PRESET_DESCRIPTIONS[scoringModel]` so users see what the preset actually does.

Persistence to Supabase `scoring_config` already exists via `useScoringConfig` hook — this PR does NOT touch the hook; we only wire the UI to call existing setters. (If you want cross-device persistence wired in this same PR, say so and I'll add the `useDebouncedSaveScoringConfig` call too.)

---

## Risk & undo

- Risk: **Low**. All visual changes + 1 data-mapping fix (status default) + 1 dropdown rewire. No DB migration, no schema change.
- Undo: revert the 4 files. Persisted `scoringModel` string in localStorage stays harmless (guarded by the migration shim).

## Files touched

1. `src/components/city-scoring/MarketDetailDrawer.tsx` — FIX A, B, C, E
2. `src/components/city-scoring/SourceDataPanel.tsx` — FIX D
3. `src/pages/CityScoring.tsx` — FIX F
4. `src/lib/scoringPresets.ts` — no edits needed (already has presets); only consumed.

Approve to build all six fixes in one pass.