# Phase C — Market Absorption Cleanup (final phase)

## Goal in simple words
In Phase A we set Market Absorption weight to 0 in the score math. In Phase B we hid it from the deep-dive panel and shortlist table. Now in Phase C we clean up the **other places** that still mention or use Market Absorption: the Market Brief page + its PDF, the CSV export, the Glossary, and the two methodology/spec pages.

Demo-data cleanup is **NOT** part of this phase. We will do it next.

## What will change and why

### 1. Market Brief page + PDF (`src/pages/MarketBrief.tsx`, `src/lib/mvsBrief/MvsBriefDocument.tsx`, `src/lib/mvsBrief/sampleBriefAdapter.ts`)
- Remove the **Market Absorption** pillar card/section from the on-screen brief and from the PDF document.
- Remove `ma:` token from the URL parser so old links don't crash (treat as ignored).
- Remove `marketAbsorption` from the brief's pillar list and from the composite formula text shown on the page.
- In `sampleBriefAdapter.ts`: drop `marketAbsorption` from the sample weights, the `subScores` object, and the local composite sum so the sample matches the new 5-pillar formula.
- Remove the small explainer paragraph that says "the `marketAbsorption` pillar score on §2 is derived from these…".

### 2. CSV / decisions export (`src/lib/decisionsExport.ts`)
- Remove the `"absorption"` column from the header list.
- Remove the `pick(ov?.absorption, c.absorption)` row cell.
- Net: exported CSV will have one fewer column.

### 3. Glossary (`src/data/glossary.md`)
- Update the composite weights line (remove `Market Absorption (0.25)` and show the new 5-pillar weights: PA 26.67%, SO 26.67%, ED 13.33%, MD 13.33%, MB 20.00%).
- Delete the standalone **"Market Absorption"** definition section.
- Update the camp-scraping line so it no longer says "Feeds registration-page extraction for Market Absorption scoring" — change to a neutral description (still feeds provider discovery / pricing).

### 4. Methodology page (`src/pages/MVSMethodology.tsx`)
- Update the composite formula block (both the markdown export string and the JSX block) to the new 5-pillar weights.
- Remove the **Market Absorption** sub-score row from the sub-scores table.
- Remove or rewrite the paragraph that calls Market Absorption "the dominant weight" and "the single most consequential design choice".
- Update the "Higher MVS = validated premium market with observed absorption" line to drop the absorption claim.
- Update the cost-envelope paragraph (remove the "full Market Absorption pipeline" framing; keep cost numbers but tie them to the camp scraping cadence in general).

### 5. Spec page (`src/pages/MVSSpec.tsx`)
- Mark **Score 2 — Market Absorption** section as **Deprecated in v1.1** with a short note: "Market Absorption was disabled because sellout-rate scraping was unreliable. Weight set to 0 and pillar removed from the composite in v1.1. Kept here for historical reference." (Keep the text so we have audit history.)
- Update the two composite formula blocks to the new 5-pillar weights.
- Update the v1.1 changelog row at the top of the page (the "Market Absorption formula" row) to say "Removed from composite (weight 0) in v1.1".

### 6. Rollout doc (`src/pages/MarketValidationRollout.tsx`)
- Two lines mention "weekly absorption data" and "absorption" in the composite description. Update to remove absorption from the pillar list and the data pull description.

## What is NOT touched in this phase
- `src/components/phase2-demo/LiveCitySourcePanels.tsx` — still exports a `WeekActivityTable` component. It's already not rendered after Phase B. Leave it as dead code; full file deletion belongs with the demo-data cleanup pass next.
- `src/data/phase2DemoData.ts` — demo data still has absorption fields. Demo-data cleanup pass next.
- `src/lib/mvs/computeMvs.ts` — `marketAbsorption` field is still in the type (weight = 0). We keep it for one more pass to avoid touching every consumer; final type removal happens with demo-data cleanup.
- `src/components/phase2-demo/ShortlistTable.tsx` and `LiveCityDeepDive.tsx` — already done in Phase B.

## Risks and what to test
- **Risk**: Market Brief URLs that include `ma:` from old saved links. Fix: parser ignores unknown tokens (already does), but we'll confirm.
- **Risk**: PDF layout shifts because one pillar card is gone. Need a visual check — open a brief and download the PDF.
- **Risk**: CSV consumers that depend on the `absorption` column order. App is pre-release so this is acceptable.
- **Manual smoke test after each turn**:
  1. Open `/market-validation/brief/<city>` — pillar section should show 5 pillars, no Market Absorption card.
  2. Click "Download PDF" — PDF should render 5 pillars cleanly.
  3. Trigger CSV export from decisions UI — open the file, confirm no `absorption` column and no broken cell shift.
  4. Open `/glossary`, `/mvs-methodology`, `/mvs-spec`, `/market-validation-rollout` — text reads cleanly, weights add to 100%.

## Phased turn breakdown

| Turn | Scope | Files |
|------|-------|-------|
| C1 | Market Brief on-screen + PDF + adapter | `MarketBrief.tsx`, `MvsBriefDocument.tsx`, `sampleBriefAdapter.ts` |
| C2 | CSV export | `decisionsExport.ts` |
| C3 | Glossary + rollout doc | `glossary.md`, `MarketValidationRollout.tsx` |
| C4 | Methodology + Spec pages | `MVSMethodology.tsx`, `MVSSpec.tsx` |

Each turn ends with a build/test run and a one-line summary.

## Waiting for your approval
Say **go** to start with **Turn C1 (Market Brief + PDF + adapter)**.
