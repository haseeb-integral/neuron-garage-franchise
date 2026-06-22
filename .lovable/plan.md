## Goal

Finish the wording sweep so Site Analysis never says "Recommend / Worth a Look / Skip / Don't-recommend" anywhere — UI, demo data, or PDF code. Use the 4-tier **confidence** language: **Strong, High, Medium, Low** (with **Undecided** as a neutral default).

## Confidence bands (SAS composite 0–100)

```
Strong   ≥ 75
High     60 – 74
Medium   45 – 59
Low      < 45
```

These match the values already in `SITE_CONFIDENCE_THRESHOLDS` in `src/data/phase2DemoData.ts` (added earlier). The old constant `SITE_RECOMMEND_THRESHOLDS` (recommend 75 / worthALook 60) only had two cut-offs, so the new scale adds one more band (Medium at 45) and renames the old "Skip" to "Low".

## What changes

### 1) `src/data/phase2DemoData.ts`
- Delete the old `SITE_RECOMMEND_THRESHOLDS` block. Keep `SITE_CONFIDENCE_THRESHOLDS` as the single source.
- In the LeafSpring demo entry, change the line `"...produces the Don't-recommend verdict."` to `"...produces the Low confidence band."`.

### 2) `src/pages/SASMethodology.tsx`
- Swap the import from `SITE_RECOMMEND_THRESHOLDS` to `SITE_CONFIDENCE_THRESHOLDS`.
- Replace the **markdown** table (Section 2 export) with a 4-row table:
  - `≥ 75` → **Strong confidence** — well above the calibration floor
  - `60 – 74` → **High confidence** — promising; verify open items
  - `45 – 59` → **Medium confidence** — mixed signals; review pillars
  - `< 45` → **Low confidence** — significant gaps vs. the comparison set
- Replace the rendered HTML table the same way (header column "Recommendation" → **"Confidence Band"**).
- In Section 6 calibration prose, change "produce a Recommend on Trinity and a Skip on LeafSpring" → "produce a **Strong confidence** band on Trinity and a **Low confidence** band on LeafSpring".
- In `SAS_CALIBRATION` and the inline calibration table, change `"86 · Recommend"` → `"86 · Strong"` and `"41 · Skip"` → `"41 · Low"`.

### 3) `src/lib/sitePack/copy.ts`
- The body of `recommendationsBullets` already uses Strong/High/Medium/Low correctly. Only rename for consistency:
  - `recommendationsBullets` → `summaryBullets`
  - `RecommendationsArgs` → `SummaryArgs`
- Section 10 in the PDF is already titled **"Summary & Next Steps"**, so no PDF heading change is needed.

### 4) `src/lib/sitePack/SitePackDocument.tsx`
- Update the import + call site: `recommendationsBullets` → `summaryBullets`.

## What is NOT changed

- The `SiteVerdict` type, hook normalization, DB constraint, and Site Analysis page UI — all already on the new 4-tier scale.
- City Scoring, MVS, candidate pipeline, and email outreach — those use "recommend" in unrelated contexts.

## Verification

- TypeScript build passes (no remaining references to `SITE_RECOMMEND_THRESHOLDS` or `recommendationsBullets`).
- `rg -n "Recommend|Worth a Look|Skip" src/pages/SASMethodology.tsx src/data/phase2DemoData.ts src/lib/sitePack/` returns no Site-Analysis hits.
- Spot-check `/sas-methodology` and the Site Pack PDF in the preview after build.

## Plain-English progress note for Brett (post-build)

> Site Analysis wording cleanup — finished. The SAS Methodology page now shows the 4-tier confidence scale (Strong / High / Medium / Low) instead of "Recommend / Worth a Look / Skip". The PDF report's Section 10 is "Summary & Next Steps" with confidence-band wording. The old "Recommend" threshold constant was removed; the app now reads from a single confidence-threshold source. Demo calibration text updated to match.
