## Goal
Swap the positive anchor from **Trinity Christian Academy (Addison, TX)** to **Trinity Episcopal School (Westlake, Austin, TX)** — the canonical positive anchor from the SAS methodology Section 6 — so the calibration gap opens past the 20-point gate without touching engine weights.

## Why
The v0.3 engine math is now correct, but the current DFW anchor pair is demographically mismatched (Addison $91k median vs West Plano $138k), so the "good site" actually scores lower on Affluence and Family Density than the "bad site." The SAS doc calibrated against Westlake Austin, which is genuinely affluent and family-dense. Using the doc's actual anchor is the lowest-risk move.

## Changes

1. **Update the seeded positive anchor row** in `site_analyses` (and any related `site_analysis_decisions` / cache rows tied to the old Trinity record):
   - Name: `Trinity Episcopal School`
   - Address: `4011 Bee Caves Rd, Austin, TX 78746`
   - Re-geocode lat/lon via Mapbox on next compute
   - Clear cached `signals`, `pillars`, `composite`, ACS cache keyed to old coords, isochrone cache, ecosystem cache for the old point

2. **Re-run compute-sas** for the new Trinity Episcopal anchor and for LeafSpring Plano (unchanged) under `engine_version = sas-v0.3`.

3. **Verify the gap.** Read both rows back and confirm:
   - Trinity Episcopal Affluence ≫ LeafSpring Affluence
   - Trinity Episcopal Family Density ≥ LeafSpring Family Density
   - Composite SAS gap ≥ 20 points (target: ~40+ per SAS doc Section 6 reference)

4. **If gap ≥ 20:** done. Log the calibration result to `.lovable/phase-2/CHANGELOG.md` and mark Tier 1 calibration green in `.lovable/plan.md`.

5. **If gap < 20 even with Westlake:** stop and report — do NOT silently fall through to Lever B reweight. That's a separate decision.

## Out of scope (this turn)
- No pillar weight changes (Lever B stays on the shelf).
- No engine math changes — v0.3 stands.
- No UI changes beyond what's already shipped (LiveEngineCard enrollment-required fix is already in).
- No changes to LeafSpring anchor.

## Technical details
- File to edit: likely a seed migration or a direct row update in `site_analyses` where the original Trinity Addison anchor was inserted. Will locate via `rg "Trinity Christian" supabase/migrations src` before writing the migration.
- Cache invalidation: delete rows in `site_analysis_acs_cache`, `site_analysis_ecosystem_cache`, `site_analysis_isochrones` keyed to the old Addison lat/lon (or to the old site_analysis_id) so compute-sas re-fetches fresh data for Westlake.
- Re-compute trigger: invoke `compute-sas` edge function for the updated anchor row after migration approval.
- Source-of-truth log: append entry to `.lovable/phase-2/CHANGELOG.md` (date, anchor swap, before/after gap).

## Verification
- `SELECT name, pillars, composite FROM site_analyses WHERE engine_version='sas-v0.3'` shows the new pair with gap ≥ 20.
- Visual check of both LiveEngineCards in the preview.
