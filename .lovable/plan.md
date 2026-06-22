
## Decision (taken for you)

Doing the full clean-up — page and PDF will show the same number the same way, every count gets its unit, and the page gets the two rows that today only the PDF has. This matches Brett's "one calibrated number everywhere" rule.

---

## What you'll see after the fix

| Where | Before | After |
|---|---|---|
| Kids count on page | `5.3k` | `5.3k children` |
| Kids count in PDF | `5k` | `5.3k children` (same as page) |
| Population on page | `15.2k` | `15.2k people` |
| Population in PDF | `15k` | `15.2k people` |
| Schools / students in PDF | `8` / `3` / `2.3k` | `8 schools` / `3 schools` / `2.3k students` |
| Big median income | `$1200k` | `$1.2M` |
| Missing data on page | `undefined` | `—` |
| Highway distance tooltip | `1.2mi` | `1.2 mi` |
| Distance to nearest road | not on page | shown on page |
| Median income at 15-min drive | not on page | shown on page |

---

## Plan

### Step 1 — One shared formatter file
Create `src/lib/sas/formatters.ts` with the single source of truth:
- `fmtMoney(n)` — `$1.2M` / `$120k` / `$1,250` / `—` for null
- `fmtCount(n, unit?)` — `5.3k children` / `850 people` / `—` for null
- `fmtPct(n)` — `12%` / `—`
- `fmtMi(n)` — `1.2 mi` / `—`
- `fmtScore(n)` — `73/100`

All branches handled (including ≥ $1M). Always returns a string, never `undefined`.

### Step 2 — Switch page to the shared formatter
In `src/pages/SiteAnalysis.tsx`:
- Delete the local `fmtMoney`, `fmtCount`, `fmtPct` helpers at lines 437–452.
- Import from `@/lib/sas/formatters`.
- Pass the right unit word to `fmtCount`: `"children"` for kids tiles, `"people"` for population tile.
- Fix the accessibility tooltip at line 362 to use `fmtMi` (gets the space for free).

### Step 3 — Switch PDF to the shared formatter
In `src/lib/sitePack/copy.ts`:
- Delete the local helpers at lines 23–43.
- Re-export from `@/lib/sas/formatters` so all existing callers keep working.
- In `src/lib/sitePack/SitePackDocument.tsx`, pass unit words to `fmtCount` on lines 591, 592, 593, 602, 603, 604, 615.

### Step 4 — Add the two missing rows to the page
In `src/pages/SiteAnalysis.tsx`, `MetricTiles`:
- Add a tile "Drive to road" using `eco.roadDistanceMi`.
- Add a tile "Median HHI · 15m" using `acs15.medianHhi`.

### Step 5 — Visual check
Open the page in Playwright, screenshot the tiles area, then generate the PDF brief and screenshot a candidate page. Confirm:
- Same number → same text in both places
- No `undefined` anywhere
- Units shown next to counts
- New tiles render without breaking the grid

---

## Files changed
- **New:** `src/lib/sas/formatters.ts`
- **Edited:** `src/pages/SiteAnalysis.tsx` (remove local helpers, add 2 tiles, pass units)
- **Edited:** `src/lib/sitePack/copy.ts` (re-export from shared)
- **Edited:** `src/lib/sitePack/SitePackDocument.tsx` (pass units)

## Not changed
- Pillar score math
- PDF layout / styling
- Database, edge functions
