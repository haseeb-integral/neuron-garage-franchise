# Site Analysis — School Profile calibration tweaks

## What we're changing and why
Right now every Montessori school gets 85 for the school-type factor. Many Montessori sites are pre-schools, which are a bad fit for Neuron Garage's K–6 camp. We will split Montessori into two options so the user tells us which one it is:

- **Montessori elementary** → 85 (unchanged, good fit)
- **Montessori pre-school** → 30 (bad fit, same tier as daycare)

We are also punishing unknown grade bands harder. Under grade_alignment_factor, **Other** drops from **50 → 20**. A site with an unclear grade band should not sit in the middle — it should score near the bottom.

## Where it shows up
- Site Analysis page dropdown (school type picker)
- Live SAS engine math (edge function) — score changes for these types
- UI copy of the same math (must stay in lockstep)
- SAS Methodology page (the factor table on the /sas-methodology screen the user just screenshotted)
- Any place that renders a friendly label for the school type

## Files touched
1. `supabase/functions/_shared/sas-math.ts` — add `montessori_elementary` + `montessori_preschool` to `SchoolType`, remove `montessori`. Factors: 85 and 30. Change grade `other` from 50 → 20.
2. `src/lib/sasMath.ts` — mirror the exact same change (must stay byte-identical to the engine).
3. `src/lib/sas/config.ts` — update the documented `SCHOOL_PROFILE_FACTORS.schoolType` table.
4. `src/pages/SASMethodology.tsx` — verify it renders from `SCHOOL_PROFILE_FACTORS` (if it hard-codes numbers, update them too).
5. `src/components/site-analysis/LiveEngineCard.tsx` — replace the single `<option value="montessori">Montessori</option>` with two options; update `getEnrollmentTooltipLine` and the default demo cards that use `"montessori"` (if any).
6. `src/pages/SiteAnalysis.tsx` — update `SCHOOL_TYPE_LABEL` map so both new keys have friendly labels.

## Fit with existing app
- No DB migration is needed. `saved_sites.school_type` is a free-text column that stores whatever string we pass. Old rows saved as `"montessori"` will still load, but they will no longer match a known factor. To avoid the "unknown schoolType" throw on old saves, we will map legacy `"montessori"` → `"montessori_elementary"` at read time in `SiteAnalysis.tsx` (one-line compatibility shim). This keeps old saved cards working without a data migration.
- No change to weights, composite formula, or any other pillar.
- No change to Market Validation, City Search, Candidate Pipeline, Onboarding, or Teacher Prospects.

## Risks
- Anyone with a saved Montessori site will silently be treated as Montessori elementary going forward. That is the safer default; if they meant pre-school they can re-pick and re-score.
- Sites currently displayed with grade band = Other will drop in composite score. This is intentional.

## Phases and turns
- **Phase 1 (this turn):** all six files above in one shot. Small edits, one file per change. ~1 turn.
- **Phase 2 (optional, only if you ask):** sweep saved rows to explicitly rewrite `"montessori"` → `"montessori_elementary"` in the DB so the shim can be removed. Not needed for the app to work.

## What you should test after Phase 1
1. Open Site Analysis → school type dropdown shows **Montessori pre-school** and **Montessori elementary** (Montessori alone is gone).
2. Score a site as **Montessori pre-school** with sensible enrollment/grade → School Profile pillar is much lower than the same site scored as **Montessori elementary**.
3. Pick grade band = **Other** on any site → School Profile drops vs. the previous run.
4. Open `/sas-methodology` → the factor tables show the new numbers (Montessori elementary 85, Montessori pre-school 30, grade Other 20).
5. Open any previously saved Montessori card → it still loads (no crash) and shows as Montessori elementary.

Waiting on your approval before I ship Phase 1.