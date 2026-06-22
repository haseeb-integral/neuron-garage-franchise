
## Goal
Make every number on the SAS page traceable. A user should be able to tap a number and either see where it came from, or open a real link that proves it. This builds trust.

Status words used everywhere: **Fresh / From cache / Backup source / Missing / You typed it / Heuristic**.

---

## What the page looks like — before vs after

### A) Top of each site card
**Before:** nothing.
**After:** a small row of chips.
```
DATA SOURCES   [● Census 2022 · Fresh]  [● Schools · From cache · 4d old]  [● Roads · Fresh]  [● You typed it]
```
Click any chip → side panel opens with full source detail and verify links.

### B) Every tile gets an ⓘ
**Before:**
```
MEDIAN HHI · 10M
$142k
```
**After:**
```
MEDIAN HHI · 10M                 ⓘ
$142k
```
Hover ⓘ → popup:
```
$142,500 — Median household income, 10-min drive
Source: US Census ACS 5-Year Survey (2022)
Variable: B19013_001E
Tracts used: 47037015800, 47037015900, 47037016000
Fetched: 2 days ago (from cache)

[ 🔗 Open Census API ]  [ 🔗 View on data.census.gov ]  [ 📋 Copy link ]
```

### C) Warning banner when a backup source was used
**Before:** silent fallback.
**After:** yellow strip.
```
⚠ Backup source used: Urban Institute was unreachable on 2026-06-22.
  School counts came from our local schools table.
```

### D) PDF brief — new last page "Sources & methodology"
One row per number with the real URL printed in full so a person reading the printed PDF can type the link in and check.

---

## Verify-with-link table — what each source links to

| Source | Link works? | What "Open source" opens |
|---|---|---|
| **US Census ACS** (income, kids, pop) | ✅ Exact | Live Census API URL with the exact variable + tract IDs. Also a `data.census.gov` page link. |
| **Urban Institute schools** | ✅ Page level | Each school's profile page on `educationdata.urban.org`. |
| **OpenStreetMap roads** | ✅ Exact | Overpass Turbo URL pre-loaded with the same query. User clicks Run, sees the same roads on a map. |
| **Mapbox Directions** (drive time) | ⚠️ Workaround | Mapbox key is private, so we link to a **Google Maps directions URL** between the same two points — different provider, lets a human sanity-check. |
| **User input** | n/a | Popup says "You entered this on [date]". No link needed. |
| **Heuristic estimates** (families × 0.5, partial age bands, 2 sq-mi population spread) | n/a | No link. Popup says clearly: "This is an estimate, not a measurement" and shows the formula. |

---

## What we cannot link to (call-outs)
- **Mapbox drive times** — provider key is private. We use the Google Maps fallback link instead.
- **Our internal database cache row** — internal, not shareable. Popup always links to the **real upstream source**, never our cache.

---

## What is NOT changing
- The score math, pillar weights, or any score number.
- Existing tile / PDF layout outside the new chip strip and new sources page.

---

## Behind the scenes (no UI on its own — supports the UI above)
- Engine tags every number with `{name, year, status, fetchedAt, sourceUrl?, verifyUrl?, note?}`.
- New helper file that builds the verify URLs (Census API URL, data.census.gov URL, Overpass Turbo URL, Urban Institute school page URL, Google Maps directions URL).
- Census cache gets a 1-year expiry so "fetched X days ago" is honest.
- Heuristic numbers carry a `heuristic` flag so the popup tells the truth.

---

## Order of work
1. Engine: tag every number with source + verify URL (1 edge function file + 2 helpers).
2. Build small UI pieces: `SourceChip`, `SourcePopover` (with Open source + Copy link buttons), `DataSourcesStrip`, `DegradedBanner`.
3. Wire ⓘ into every tile + the chip strip on the site card.
4. Add "Sources & methodology" page to the PDF, with full URLs printed.
5. Verify with screenshots: open a real site, force a backup-source case, click an Open-source button, generate the PDF, confirm same numbers + links across all three surfaces.

---

## Files (technical detail — skip if not needed)
**New:** `src/lib/sas/sources.ts` (URL builders), `src/lib/sas/sourcesCopy.ts` (popup text), `src/components/site-analysis/SourceChip.tsx`, `SourcePopover.tsx`, `DataSourcesStrip.tsx`, `DegradedBanner.tsx`, one migration for `expires_at`.
**Edited:** `src/hooks/useSiteScore.ts` (extend `SiteScoreSignals` with `provenance`), `src/pages/SiteAnalysis.tsx`, `src/components/site-analysis/LiveEngineCard.tsx`, `src/lib/sitePack/SitePackDocument.tsx`, `supabase/functions/compute-sas/index.ts`, `supabase/functions/_shared/census.ts`, `supabase/functions/_shared/urban-institute.ts`.
**Not touched:** score math, pillar weights, tile/PDF layout outside additions.
