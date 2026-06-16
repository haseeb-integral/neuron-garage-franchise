## Scope (your picks A + D)

Two chunks, sequenced. A is small and clears the calibration question. D is the bigger surface — real map, parking tile, persistence, polish.

---

## A. Calibration gate (item #2) — qualitative, per Sam brief

The numeric ≥20 / ≥25 gate has already been retracted in code + memory. What's left is the actual calibration *evidence* on the page so Brett/Sam can see it.

1. **Re-run the 5–10 known anchors** through live `compute-sas` from `LiveEngineCard` presets — Trinity Episcopal (Westlake), LeafSpring Plano, Wayside Eden Park, St. Francis, Telluride Mountain School + add ~3 more named in chat if you paste them.
2. **Capture results** in a small static `calibration-runs.ts` (school name, address, composite, 5 pillars, run date) — no DB writes.
3. **Render in `Feature1BStatus.tsx`** as a table: anchor / type (positive/negative) / composite / Δ vs Trinity. Show Sam's qualitative criterion ("LeafSpring scores materially lower than Trinity") as the pass/fail line — no numeric threshold.
4. **Status pill** stays amber until Brett marks it green in chat ("calibration accepted"). No automated gate.

---

## D. Map + persistence + polish (items #4 partial, #6, parking v0.2, real Mapbox)

### D1. Real Mapbox map + isochrone overlay (replaces schematic)
- Replace the schematic SVG in `LiveEngineCard` / SiteAnalysis selected-slot panel with `mapbox-gl` map centered on geocoded lat/lng.
- Draw 10-min + 15-min drive isochrones returned by `compute-sas` (already computed; just plumb the GeoJSON back in the response and render as two filled polygons w/ different opacity).
- Pin the candidate site. Use `MAPBOX_TOKEN` secret via a tiny `get-mapbox-token` edge function (don't ship the secret to client). Cache token client-side per session.

### D2. Parking tile — engine v0.2
- Today parking is a stub. v0.2: add a `parking` signal computed in `sas-math.ts` from Mapbox `tilequery` against the `mapbox.mapbox-streets-v8` `parking` layer within a 150m radius of the pin → count + estimated capacity bucket (none / street-only / small lot / large lot).
- Surface as the 6th metric tile with a "v0.2 — Mapbox tilequery" badge. Does NOT enter composite weight yet (Sam-pinned weights are locked); shown as informational.

### D3. Persist analyzed slots across reloads
- On compute success, upsert to existing `site_analyses` table (row per user+address) — store inputs + raw signals + version tag, never the composite (Brett's rule: recompute at display).
- On page mount, load this user's recent `site_analyses` rows into `slots` state. Cap at 4 (per the page banner).
- "Remove card" deletes the row; "Save as winner" flips `is_winner` via `site_analysis_decisions` (existing trigger enforces single winner).

### D4. Polish + QA (item #6)
- Skeleton loaders on each pillar tile during `compute-sas` invoke (replace current spinner-only).
- Bad-address error path: when geocode returns 0 hits, show inline "Address not found — try a more specific street address" instead of generic toast.
- Mapbox / Census 429 fallback: detect rate-limit error in edge function response → show amber "Upstream rate-limited, retry in ~60s" banner with countdown; auto-retry once.
- Side-by-side compare: enable the existing 2–4 slot compare modal trigger (currently disabled); render pillar rows for each selected slot pulled from the same recompute helper.

---

## Out of scope (deferred, listed for clarity)

- **#3 "one calibrated number everywhere"** beyond the slots panel (table rows / RowScorePopover / exports) — that's a Tier 1 sweep across Market Validation surfaces, plan separately.
- **#7 Accessibility v0.2** (real Mapbox road/highway distance) and **#8 ACS polygon intersect v0.2** — post-1B per your checklist.
- No change to client-locked SAS weights or sub-signals.

---

## Files touched (preview)

- `src/pages/SiteAnalysis.tsx` — slot persistence load/save, compare modal wiring, skeletons.
- `src/components/site-analysis/LiveEngineCard.tsx` — Mapbox map, isochrone overlay, parking tile, error states.
- `src/components/site-analysis/CalibrationRunsTable.tsx` *(new)* + `src/data/calibration-runs.ts` *(new)*.
- `src/components/phase2-demo/Feature1BStatus.tsx` — embed calibration table.
- `supabase/functions/compute-sas/index.ts` + `_shared/sas-math.ts` + `_shared/mapbox.ts` — return isochrone GeoJSON, add parking signal via tilequery.
- `supabase/functions/get-mapbox-token/index.ts` *(new)* — issues short-lived public token to client.
- No schema changes (uses existing `site_analyses` + `site_analysis_decisions`).

## Suggested order

1. A (calibration table) — ~1 pass, unblocks Sam review.
2. D3 (persistence) — small, high value.
3. D1 (real Mapbox + isochrone) — biggest visual change.
4. D2 (parking v0.2).
5. D4 (polish + compare).
