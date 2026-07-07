## Goal

On the Site Analysis result card, show two new numbers next to the existing `HH >$150k · 10m` tile:

- **HH >$200k · 10m** — percent of households above $200K within the 10-min drive
- **HH >$200k · 10m (count)** — number of households above $200K within the 10-min drive

Labeled clearly as **$200K+** (ACS's top clean bracket). Sam wanted $250K+; per Brett path A we ship exact $200K+ now and can add an estimated $250K+ later.

The existing `HH >$150k · 10m` tile stays exactly as-is. Scoring / SAS composite / weights are **not** changed — these are display-only.

## What changes

1. **ACS aggregator (`supabase/functions/_shared/census.ts`)**
   - Already reads `B19001_017E` (the "$200,000 or more" bucket). Today it's folded into `above150`.
   - Add two new fields on the aggregate: `pctAbove200k` (percent) and `hhAbove200k` (raw count of households in the isochrone sample). Existing `pctAbove150k` stays untouched.

2. **Cache table `site_analysis_acs_cache`** (migration)
   - Add nullable columns `pct_hh_above_200k numeric` and `hh_above_200k numeric`.
   - Old cached rows without these columns are treated as a cache miss for the new fields (compute-sas will recompute for them on next run; no backfill required).

3. **Edge function `supabase/functions/compute-sas/index.ts`**
   - Read/write the two new cache columns alongside `pct_hh_above_150k`.
   - Pass `pctAbove200k` and `hhAbove200k` through into `signals.acs10` (and acs15 for symmetry, though we only render acs10).

4. **Frontend types (`src/hooks/useSiteScore.ts`)**
   - Add `pctAbove200k?: number` and `hhAbove200k?: number` to `SiteScoreSignals.acs10` / `acs15`.

5. **Card render (`src/pages/SiteAnalysis.tsx`, line ~660)**
   - Add two `<Tile>` entries immediately after the existing `HH >$150k · 10m` tile, in the same Affluence row:
     - `HH >$200k · 10m` — `fmtPct(acs10.pctAbove200k)`
     - `HH >$200k · 10m (count)` — `fmtCount(acs10.hhAbove200k)`
   - Both use the existing affluence `source` provenance chip so the "verify source" link works.
   - Add matching entries in `src/lib/sas/sources.ts` label map so the source popover recognizes them.

6. **Do NOT touch**
   - SAS composite formula, pillar weights, calibration.
   - The existing `HH >$150k · 10m` tile.
   - LiveEngineCard (separate demo surface).
   - Site Pack PDF (out of scope for this ask; can add later if requested).

## Phases

- **Phase 1 (1 turn)** — Migration: add `pct_hh_above_200k` and `hh_above_200k` columns to `site_analysis_acs_cache`.
- **Phase 2 (1 turn)** — Edge function + shared census: emit and cache the two new numbers.
- **Phase 3 (1 turn)** — Frontend types + two new `<Tile>` entries on the site card + label map.

## Risks & testing

- **Risk:** stale cached rows will show `—` for the new tiles until a fresh compute run. Safe fallback — no error.
- **Risk:** cache-miss recompute costs a Census call. Acceptable — same code path as first-time analyses.
- **Test manually:** Run the 5 preset schools (Trinity, Wayside, St. Francis, Telluride, LeafSpring). Confirm the new tiles show a percent and count, and the old `HH >$150k` tile is unchanged. Confirm the composite SAS number does not move.

## Follow-up (not in this plan)

If Sam still wants a $250K+ number, we add a second row later using IRS SOI ZIP-level data, clearly labeled as an estimate (path B).
