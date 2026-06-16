
# Align Site Analysis page with SOW v2.2 & Sam's brief v2.2

Scope: UI/copy only. No engine, weights, scoring, or schema changes.

## 1. Calibration gate banner (`src/pages/SiteAnalysis.tsx` ~L540–574)
- Remove the numeric `gap ≥ 20` pass/fail logic and red/green styling.
- Replace with Sam's qualitative criterion (SOW v2.2 p.509 / brief v2.2 p.12): "LeafSpring scores materially lower than Trinity."
- Neutral blue/grey card. Show: Trinity 63.32, LeafSpring 45.96, gap +17.36, criterion = qualitative (Sam brief v2.2 p.12).
- Remove any "rework before rollout" copy (that decision belongs to client).

## 2. Dev-only status block
- Rewrite the red "Calibration gate … FAILING" row to neutral/amber.
- Explain: the ≥20 threshold was Lovable-invented, not in Sam's brief. Retracted. Awaiting Brett's decision among three options (accept v0.3, add second anchor pair, authorize reweight).

## 3. Anchor cards
- Keep Trinity Episcopal (positive) + LeafSpring Plano (negative). No changes.
- **Do NOT add** a "Add second anchor pair (coming soon)" affordance (per user).

## 4. Quick-test presets (`src/components/site-analysis/LiveEngineCard.tsx` L18–59)
Replace Lovable-picked presets (Highland Park, Cherry Creek, Mason) with SOW-named anchors only, using verified public addresses:

| Label | Address | Role |
|---|---|---|
| Trinity Episcopal (Westlake) | 1300 S Capital of Texas Hwy, Austin, TX 78746 | positive anchor |
| LeafSpring Plano (closed) | 5045 Lorimar Dr, Plano, TX 75093 | negative anchor |
| Wayside Eden Park (Austin) | 6215 Menchaca Rd, Austin, TX 78745 | positive anchor |
| St. Francis (Austin) | 300 E Huntland Dr, Austin, TX 78752 | positive anchor |
| Telluride Mountain School | 200 San Miguel River Rd, Telluride, CO 81435 | small-market positive |

## 5. Decision-points / methodology copy
- Remove sentences implying a numeric threshold. Replace "gate is locked in" → "criterion is qualitative, per SOW v2.2 p.509".
- Add "client-locked per Sam brief v2.2 p.9" hint near SAO formula.
- Label sub-signal weights as "Sam-pinned".
- Update Live Engine header v0.1 → v0.3.

## 6. Doc fixes
- `.lovable/phase-2/sas-methodology.md` §1 and §3: "Trinity Christian Academy" → "Trinity Episcopal" (SOW p.337).
- Log all edits in `.lovable/phase-2/CHANGELOG.md`.

## Files touched
- `src/pages/SiteAnalysis.tsx`
- `src/components/site-analysis/LiveEngineCard.tsx`
- `.lovable/phase-2/sas-methodology.md`
- `.lovable/phase-2/CHANGELOG.md`

## One question for you
**Banner color when the Trinity↔LeafSpring gap drops below ~10 pts** (currently +17.36, so non-issue today): should it stay neutral, or switch to amber as a soft "criterion may not hold" warning? Default if you don't answer: stay neutral (no numeric thresholds anywhere, consistent with the retraction).

Nothing else outstanding from our agreement — Brett message is drafted, methodology doc updated, plan + changelog updated, and this page change is the last visible surface.
