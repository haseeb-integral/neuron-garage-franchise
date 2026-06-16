## What changed since the last update

The Overpass API fix landed. Real road data now flows into the Accessibility pillar. The live engine currently returns:
- Trinity Christian Academy: **50.33**
- LeafSpring Plano (closed): **38.42**
- Gap: **11.9 points** — still failing the ≥20 requirement.

The old hardcoded status text still says 51.1 vs 43.52 (7.6 gap), which is stale.

## Surfaces to update

### 1. `src/components/phase2-demo/Feature1BStatus.tsx`
- Update the blocked checklist item text: change Trinity 51.1 → 50.33, LeafSpring 43.52 → 38.42, gap 7.6 → 11.9.
- Keep the plain-English explanation and the three levers for Brett. Add one sentence noting the gap widened after the Overpass fix but remains below 20.

### 2. `.lovable/phase-2/phase-2-status.md`
- Line 19 currently says "LeafSpring > Trinity on real data" — this is now incorrect (Trinity > LeafSpring). Update the description to reflect the current live comparison and the still-failing calibration gate.

### 3. `.lovable/phase-2/CHANGELOG.md`
- Log the above two file edits per Phase 2 process rule.

## What is NOT changing

- `src/pages/SiteAnalysis.tsx` — the red `CalibrationGateBanner` already pulls live numbers from props (50.33 / 38.42 / 11.9). No edit needed.
- `supabase/functions/sas-calibrate/index.ts` — the calibration harness logic and anchor inputs remain unchanged.
- The three decision levers for Brett remain open.
