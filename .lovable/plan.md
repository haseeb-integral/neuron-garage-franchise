
# Verdict: Manus is right. Perplexity is directionally right but speculative.

I cross-checked both analyses against the three source-of-truth docs (SAS methodology MD, SOW v2.2, Sam PDF) **and** against the live code in `supabase/functions/`. Here is what holds up.

## Where they agree (and the docs back them)

Both Perplexity and Manus converge on the same top-line answer:

- **The gap is not a weighting problem.** It is a data/normalization problem. The SAS methodology's own reference table (Section 6) says the engine should produce **Trinity 86 / LeafSpring 41 → 45-point gap**. We're getting 50.33 / 38.42. The recipe isn't broken; the ingredients are spoiled.
- **Lever A (closed-site penalty) — reject.** Both call it a bolt-on that hides the real bug and breaks turnkey-daycare takeover evaluation. The SOW treats site status as metadata, not a score input.
- **Lever C — reject.** Cutting Family Density contradicts the SAS doc's "population of buyers" logic.
- **Lever B — only mild, and only after fixing the data.** Both land on roughly: School Profile 25→30%, School Ecosystem 15→20%, Affluence 25→20%, Family Density 20→15%, Accessibility 15% unchanged. The Sam PDF's school-referral-pipeline language supports this.
- **20-point gate is correct.** SAS doc's own reference gap is 45; 20 is conservative.
- **No 6th "site activity" pillar.** `school_type_factor = 30` for daycare already does that work in School Profile.

## Where they differ — and why Manus wins

**Manus names three specific code bugs with file paths and line numbers.** I verified every one of them exists in the live codebase:

| Manus claim | Verified in code |
|---|---|
| `samplePoints` in `_shared/mapbox.ts` only samples 6 points (centroid + 5 perimeter) | ✅ `mapbox.ts:55` — `samplePoints(poly, n = 5)` |
| `popReachable15` is sum of unique tracts hit by those 6 points → ~10–15k people → normalizes to 0 against the 50k–500k range | ✅ `census.ts:151` returns `tractsHit: tracts.length`; `sas-math.ts:153` uses `normalize(popReachable15, 50_000, 500_000)`; `compute-sas/index.ts:347` passes `acs15.totalPop` straight in |
| Ecosystem ranges (elementary 3–25, private 1–10) saturate in any metro → both anchors get 100 → pillar contributes zero separation | ✅ ranges live in `sas-math.ts`, matches the live Trinity 100 / LeafSpring 100 we see |

Perplexity guessed at the cause categories (geocoding the wrong building, 60/40 blend inverted, PostGIS misjoin). Those are plausible *classes* of bug, but none of them are what the code is actually doing. Perplexity hadn't seen the source.

**One Perplexity insight is still worth keeping:** the SAS methodology doc Section 6 says both anchors are in Austin (Trinity Episcopal Westlake + LeafSpring), but our live calibration is running Trinity Christian Academy in Addison, TX. That's a separate "are we even comparing the right two sites" question — worth flagging but not the cause of the 11.9-point gap.

## Recommended fix sequence (when we switch to build mode)

**Phase 1 — Fix the three data bugs (Manus's prescription, verbatim):**

1. `_shared/mapbox.ts` — replace `samplePoints` with a dense grid (25–30 points) across the isochrone polygon, or use a PostGIS bounding-box intersection in the spatial join. Expected lift: Trinity Affluence 23.70 → ~92.
2. `_shared/census.ts` + `compute-sas/index.ts` — compute `popReachable15` as area-weighted tract density × isochrone area, not sum of unique tracts hit by 6 points. Expected lift: Trinity Accessibility 33 → ~88.
3. `_shared/sas-math.ts` — widen ecosystem ranges for metros (elementary 10–100, private 5–50) so DFW-density sites don't saturate at 100. Expected: separation appears on this pillar.

**Phase 2 — Re-run calibration. Three outcomes possible:**

- Gap ≥ 20 → ship. No weight changes.
- Gap 15–20 → apply mild Lever B (Profile 30 / Ecosystem 20 / Affluence 20 / Density 15 / Access 15).
- Gap < 15 after data fix → escalate. Means the bug list is incomplete.

**Phase 3 — Independent of the gate, address Perplexity's "right anchors" point:** confirm whether the live calibration set should be (Trinity Episcopal Westlake, Austin) per the SAS doc, or (Trinity Christian Academy Addison) as currently wired. This is a separate decision and shouldn't block the bug fixes.

## What I need from you before building

Just one yes/no: **proceed with Phase 1 (the three code bugs) as the next build?** Phases 2 and 3 follow automatically from the calibration result.
