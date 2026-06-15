
# Feature 1B — Site Analysis Engine: Build Plan

Source of truth: `.lovable/phase-2/phase-2-sow.md` Item 2 (lines 369–516) plus Claude's calibration notes already merged into `src/data/phase2DemoData.ts` and `src/pages/SASMethodology.tsx`.

Current state: demo-mockup-shipped. Trinity/LeafSpring anchors are sample values, not formula-computed. `SiteAnalysis.tsx`, `useSiteDecisions.ts`, `site_analysis_decisions` table, and the SAS Methodology page all exist. **This plan adds a real engine without touching any of that until the very last step.**

---

## Guiding principle: zero-risk to existing app

Every new piece lands in a parallel lane. The current `/site-analysis` demo page keeps reading from `phase2DemoData.ts` until we flip a single feature flag. Rollback = flip the flag off + drop the new tables. No existing table, RLS policy, edge function, route, or component is modified in steps 1–6.

```text
Demo path (untouched):
  SiteAnalysis.tsx ── reads ──► phase2DemoData.ts (sample SAS values)

New engine path (parallel):
  SiteAnalysisForm ──► invoke('compute-sas') ──► site_analyses table
                          │
                          ├─► isochrone provider (Mapbox or HERE)
                          ├─► Census ACS (existing CENSUS_API_KEY)
                          └─► NCES (public_schools table, already loaded)

Flag SAS_ENGINE_LIVE (default false) decides which path SiteAnalysis.tsx renders.
```

---

## Open decision before build (1 question)

Per `phase-2-status.md`, the isochrone vendor is still TBD between **Mapbox** and **HERE**. I'll ask this as a follow-up question before step 2 — it changes one edge function and one secret name, nothing else. Default recommendation: Mapbox (simpler Isochrone API, free tier covers calibration, easy to swap later because the adapter is isolated).

---

## Step 1 — New database tables (isolated, RLS-locked)

One migration introduces four tables. No existing table is altered.

- `site_analyses` — one row per analysis run
  - `user_id`, `address`, `school_name`, `school_type`, `enrollment`, `grade_band`
  - `lat`, `lng` (geocoded)
  - `sas_score`, `school_profile`, `affluence`, `family_density`, `ecosystem`, `accessibility`
  - `inputs_hash` (for cache hits), `engine_version` (semver string)
  - `status` (`pending` | `ready` | `failed`), `error`
- `site_analysis_isochrones` — raw GeoJSON per (analysis_id, minutes ∈ {10,15})
- `site_analysis_acs_cache` — keyed by GeoJSON hash, holds ACS pulls (median HHI, %>150k, % dual-income, children 5–12, families w/ kids 5–12, total population) so repeat analyses don't re-pay Census
- `site_analysis_ecosystem_cache` — keyed by (lat,lng,radius), counts of elementary / private schools and nearby student pop from `public_schools`

RLS: own-row for `site_analyses` (`auth.uid() = user_id`), staff-read on caches, service_role full. GRANTs in same migration per project rules. Trigger `update_updated_at_column` on `site_analyses`.

**No link to `site_analysis_decisions`.** Decisions stay keyed by `address` exactly as today; only the demo page consumes them. Later we can add an optional FK; not now.

## Step 2 — Isochrone adapter (edge function `compute-isochrone`)

Thin wrapper around Mapbox (or HERE) Isochrone API. Inputs: `{lat, lng, minutes: 10 | 15}`. Output: GeoJSON polygon. Persists to `site_analysis_isochrones`. Uses a new secret `MAPBOX_TOKEN` (or `HERE_API_KEY`) — I'll request via `add_secret` only after you confirm vendor.

## Step 3 — ACS-in-polygon edge function `acs-in-isochrone`

Given a polygon, finds intersecting Census tracts (TIGER tract centroids from a small static dataset we'll seed once into a `census_tracts` reference table — separate from anything that exists), queries ACS 5-year (already-wired `CENSUS_API_KEY`) for the six signals listed in the SOW, area-weights, returns numerics. Result cached in `site_analysis_acs_cache`.

## Step 4 — Ecosystem & accessibility helpers

- `count-schools-in-radius`: reuses existing `public_schools` table; haversine filter; returns elementary count, private count, total enrollment within a 15-min radius (approximated by the 15-min polygon bbox, then refined point-in-polygon).
- `distance-to-road`: simple Mapbox/HERE matrix call for distance to nearest major road and highway. (If we choose HERE, swap helper; the calling code is unchanged.)

## Step 5 — Score orchestrator (edge function `compute-sas`)

Single entrypoint the UI calls.

1. Geocode address (Mapbox/HERE geocode).
2. Fan out (in parallel): isochrones 10+15 → ACS for each → ecosystem counts → road/highway distances.
3. Apply the **exact formulas from `phase-2-sow.md` lines 389–475** and the **10-min × 60% / 15-min × 40% blend** for affluence + family density.
4. School-type table verbatim: Daycare 30, Public elem 70, Charter 75, Montessori 85, Private elem 100, Other K-8 50, Other 30 (note: SOW omits "Daycare = 30" — Claude's review flagged this; I'll include it and call it out as a Brett-confirm item).
5. Round per pillar, compute weighted SAS, write to `site_analyses`, return `{ analysis_id, sas, pillars, inputs }`.

All math lives in `supabase/functions/_shared/sas-math.ts` and is mirrored to `src/lib/sasMath.ts` so the UI can recompute / display the same numbers without a round-trip (matches the "one calibrated number everywhere" core rule).

## Step 6 — Calibration harness (no UI)

A one-shot script `supabase/functions/sas-calibrate/index.ts` that runs three fixed anchors: **Trinity Christian Academy (Addison TX), LeafSpring (Charlotte NC), and a known private elementary control**. Writes results to `site_analyses` tagged `engine_version='calibration-v0.1'`. Gate: Trinity ≥ 80 AND LeafSpring ≤ 50 AND margin ≥ 25 points. If the gate fails, **we do not flip the flag** — we tune weights in `sas-math.ts` and re-run. This is the SOW's acceptance gate (line 509).

## Step 7 — UI wiring behind a flag

Two small, additive frontend changes — no demo code deleted:

- New `src/components/site-analysis/SiteAnalysisRunForm.tsx` — address + school name required, type + enrollment optional, submit → `supabase.functions.invoke('compute-sas')` → polls `site_analyses` row.
- `src/pages/SiteAnalysis.tsx` reads `import.meta.env.VITE_SAS_ENGINE_LIVE` (or a `feature_flags` row). When `false` (default): render exactly what's there today. When `true`: render the new form + live results, demo cards become a "Sample sites" tab.
- Comparison view (up to 4 sites) and per-site PDF generator stay on the demo for now; both already exist via `decisionsExport.ts` and will be re-pointed to live rows in a follow-up ticket once calibration passes.

## Step 8 — Documentation + changelog

Append to `.lovable/phase-2/CHANGELOG.md` after each merged step (per Phase 2 rule). Update `phase-2-status.md` Item 2 status from `demo-mockup-shipped` → `in-progress` at step 1, → `shipped` only after the calibration gate passes and the flag is on.

---

## Rollback plan (one-line each)

| Failure mode | Rollback |
|---|---|
| Edge function errors in production | Flip `SAS_ENGINE_LIVE=false` — UI reverts to demo instantly |
| Bad data in `site_analyses` | `DELETE FROM site_analyses WHERE engine_version = 'x.y'` — caches survive |
| Whole feature needs to disappear | Drop the four new tables + remove the four new edge functions; nothing else references them |
| Vendor swap (Mapbox ↔ HERE) | Replace only `_shared/isochrone-adapter.ts` and the secret — `compute-sas` unchanged |

## What this plan deliberately does NOT do

- Does not touch `phase2DemoData.ts`, `SASMethodology.tsx`, `decisionsExport.ts`, `useSiteDecisions.ts`, `site_analysis_decisions`, `AppSidebar.tsx`, or any other shipped surface.
- Does not change the SAS formula, weights, or score name (`SAS`) already locked in chat.
- Does not auto-flip the flag — you decide when the calibration gate is met.
- Does not build the live PDF or 4-site live compare (separate ticket after gate passes).

## Sequencing & checkpoints

```text
Step 1 (migration)         → review SQL, approve
Step 2 (isochrone)         → vendor secret added, smoke test 1 address
Step 3 (ACS-in-polygon)    → spot-check vs raw ACS for Frisco TX
Step 4 (ecosystem + road)  → spot-check vs Google Maps eyeball
Step 5 (orchestrator)      → end-to-end one address < 10s
Step 6 (calibration)       → Trinity ≥ 80, LeafSpring ≤ 50, margin ≥ 25 ✅
Step 7 (UI behind flag)    → flag stays OFF until you say go
Step 8 (docs + status)     → flip flag, ship
```

## Question to answer before I touch any code

1. **Mapbox or HERE for isochrones + geocoding?** Default Mapbox. If you have no preference, I'll proceed with Mapbox and request the `MAPBOX_TOKEN` secret as the first action of step 2.
