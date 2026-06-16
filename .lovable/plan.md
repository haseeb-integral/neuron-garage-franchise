Swap the LeafSpring negative anchor from the Plano placeholder to the actual Cedar Park site Neuron Garage ran (and that closed in 2023).

New anchor:
- Name: LeafSpring School at Cedar Park
- Address: 11651 W. Parmer Lane, Cedar Park, TX 78613
- Type: Daycare / Other (unchanged from the existing anchor classification)

Files to update (text-only swap, no schema, no weights, no formula):

1. `src/pages/SiteAnalysis.tsx`
   - Line ~86–87: update anchor record `schoolName` and `address`.
   - Line ~543: change "vs LeafSpring Plano" → "vs LeafSpring Cedar Park (Austin area)".

2. `src/components/site-analysis/LiveEngineCard.tsx`
   - Lines ~28–31: update the "LeafSpring Plano (closed)" preset entry to "LeafSpring Cedar Park (closed)", schoolName "LeafSpring School at Cedar Park", address "11651 W. Parmer Lane, Cedar Park, TX 78613".

3. `src/data/calibration-runs.ts`
   - Lines ~47–48: update `schoolName` to "LeafSpring School at Cedar Park (closed 2023)" and `address` to the new one.
   - The stored composite/pillar numbers in this file were computed against Plano — they will be stale until re-run. Mark this row's status back to `pending` (or clear stored scores) so the page shows it as needing a fresh live-engine run instead of displaying stale Plano numbers as if they were Cedar Park's.

4. `src/components/phase2-demo/Feature1BStatus.tsx`
   - Line ~56: in the calibration-runs-table description, rename "LeafSpring Plano" → "LeafSpring Cedar Park".
   - Line ~34: leave the Trinity 63.32 / LeafSpring 45.96 / +17.36 pt historical note as-is (it is a record of the v0.3 Plano calibration), but append one sentence: "Anchor updated to LeafSpring Cedar Park (11651 W. Parmer Lane) — live gap will refresh on next run."

5. Methodology copy in `src/pages/SASMethodology.tsx` only needs a small change: anywhere it implies LeafSpring was in a different Austin location should now read consistently as "LeafSpring Cedar Park" / "Cedar Park (Austin metro)". No formulas change.

Not changing:
- Pillar weights, school_type factor, grade-alignment, enrollment normalization — none of these depend on the address.
- Trinity anchor.
- Any backend / edge function / schema.
- The qualitative pass criterion ("LeafSpring scores materially lower than Trinity").

Verification after edits:
- Page loads, the LeafSpring card now shows "LeafSpring School at Cedar Park · 11651 W. Parmer Lane, Cedar Park, TX 78613".
- Calibration row for LeafSpring shows as pending (or fresh re-run) rather than stale Plano numbers.
- Live engine re-runs Trinity and the new Cedar Park address, and the calibration delta refreshes from real geocoded ACS / drive-time data for Cedar Park.

Technical note:
- Cedar Park is in Williamson County (Austin MSA). ACS, isochrones, ecosystem, and parking signals will all recompute against the new lat/lng — no code path needs to be told the metro changed.