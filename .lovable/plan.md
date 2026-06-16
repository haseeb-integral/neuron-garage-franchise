## Four small fixes to Site Analysis

### 1. Restore deeper sub-score formulas (transparency)
Today the formula toggle only shows `weight × pillar = contribution` (e.g. `0.25 × 42.5 = 10.6 pts`). Brett wants the *upstream* line too — how the pillar value itself was derived from the raw inputs.

Plan: when "Show all formulas" is on, render a second small line under each `PillarBar` with the human-readable formula behind that pillar's value:

- **School Profile** — `f(schoolType=daycare, gradeBand=K-5/K-6, enrollment=—) = 42.5`
- **Neighborhood Affluence** — `0.6 × medianHHI_norm($126k) + 0.4 × pctAbove150k_norm(40%) = 34.65`
- **Family Density** — `children5to12 / totalPop × scale  →  3.2k / 21k = 14.67`
- **School Ecosystem** — `elementaryCount + privateCount weighted by nearbyStudentPop = 100`
- **Accessibility** — `driveToHwy + parking placeholders (engine v0.2) = 42`

Implementation: pass the input bundle (`schoolType`, `gradeBand`, `enrollment`, `signals.acs10/acs15`) into `PillarBar` and render a one-line formula string per pillar, only when `showFormula` is true. No engine changes — these strings just describe what `compute-sas` already does. Where the engine returns placeholder pillar values (drive-to-hwy, parking), the formula line says `placeholder (engine v0.2)`.

### 2. Remove "Profile preview: 90" from the Live Engine box
It's a leftover client-side estimate of the school-profile pillar before the engine runs. Now that the engine is the source of truth and we show all 5 pillar tiles after Compute SAS, the preview is noise. Delete the `Profile preview: <strong>{previewSchoolProfile}</strong>` span (and its unused calc) from `LiveEngineCard.tsx`.

### 3. "Save to slot" should always append a new card
Today Save-to-slot is one button that writes into the next empty slot. That's fine for *new* schools but confusing when Brett re-runs the same school with a different `schoolType` to compare — it never overwrites today, but the button label "Save to slot →" reads like it might. Plan:

- Rename the button to **"Add as new card →"** to make intent obvious.
- Keep behavior: always append into the next empty slot (1 → 2 → 3 → 4). Never overwrite an existing slot.
- When 4 slots are filled, the button shows "Slots full (4/4) — remove a card first" (already the case).
- Same school name + different school type = two side-by-side cards Brett can compare. That's the intended flow.

(No "Replace slot N" dropdown — Brett asked for the simpler append behavior.)

### 4. "LeafSpring School at Plano (closed 2023)" vs "LeafSpring School at Plano"
They are the same physical site (7000 Preston Rd, Plano). The two anchors exist on purpose:
- **"(closed 2023)"** — the *negative* calibration anchor, frozen inputs `schoolType=daycare, gradeBand=other`. Represents the closed-school signal we want the model to penalize.
- **"LeafSpring School at Plano"** — a *live test* card Brett created from the Live Engine, currently with `schoolType=daycare, gradeBand=K-5/K-6`.

They produce different SAS (43.52 vs 46.65) because the inputs differ. That's correct, but the duplicate name is confusing. Plan:

- Rename the negative anchor display to **"LeafSpring Plano — closed 2023 (negative anchor)"** so the role is unambiguous.
- Keep the "Negative anchor" badge.
- Live cards Brett creates from the Live Engine keep whatever name he typed.

No data/logic change — just the anchor label string.

### Files touched
- `src/pages/SiteAnalysis.tsx` — PillarBar gets a `formulaDetail` string prop; CandidateCard passes input + signals into each PillarBar; negative anchor `schoolName` updated.
- `src/components/site-analysis/LiveEngineCard.tsx` — remove "Profile preview" span and its calc; rename Save button to "Add as new card →".

### Out of scope
- Recalibrating LeafSpring vs Trinity weights (separate Tier-1 task; the gate is still failing — that needs the weight rework, not a UI change).
- Real Mapbox tiles, drive-to-hwy / parking engine work.
- Persisting slots across reloads.
