
# Site Analysis (1B) — Wording & Framing Cleanup

Sam's rule from June 19: Site Analysis is **analysis + scoring**, not a final decision engine. This plan removes the "decision engine" feel and softens the language. Scoring math, weights, and PDF export all stay. No DB schema changes. No new features. Sidebar Methodology / Docs are **not** updated in this turn.

## What changes

### 1. New verdict scale (low / medium / high / strong)
Replace the current 3-tier verdict with a 4-tier confidence scale:

| Old label        | New label        | Color stays |
| ---------------- | ---------------- | ----------- |
| Recommend        | **Strong**       | Green       |
| Worth a look     | **High**         | Amber-green |
| (new mid band)   | **Medium**       | Amber       |
| Don't recommend  | **Low**          | Red-muted   |

- Add one extra band so we are not pushing a binary "yes / no" feel.
- Threshold tuning is left to Sam + Kaylie (scoring weights work). For now we split the current "Don't recommend" band into Low + Medium at the midpoint between `worthALook` and 0.
- Constant rename: `SITE_RECOMMEND_THRESHOLDS` → `SITE_CONFIDENCE_THRESHOLDS` with keys `strong`, `high`, `medium`.

### 2. Drop "Winner" everywhere in the UI
- Remove the **★ Mark winner** button in `SiteAnalysisCard` and `SiteDecisionControls`.
- Remove the **Winner banner** at the top of the page.
- Remove the **Winner** column from the compare table.
- `useSiteDecisions` keeps the `is_winner` field in the type for now (DB column stays untouched, pre-release so safe to leave) but no UI writes to it. We can drop the column in a later cleanup turn if Brett asks.

### 3. Rename "Export decision pack" → "Export Site Report (PDF)"
- Button label, tooltip, and disabled-state copy all change.
- Enablement rule changes: PDF is enabled whenever **at least one candidate has a composite score**, not when a winner is marked.
- PDF content (`SitePackDocument.tsx`, `copy.ts`) updates:
  - Remove ★ WINNER badge, Winner column, Winner row in compare table.
  - Section 10 renamed from **Recommendations** → **Summary & Next Steps**.
  - Replace "proceed to LOI diligence" / "Do not pursue" lines with neutral confidence phrasing, e.g.:
    - Strong → "Scores in the Strong confidence band. Worth advancing to deeper diligence."
    - High → "Scores in the High band. Promising; verify open items before advancing."
    - Medium → "Scores in the Medium band. Mixed signals; review pillar detail."
    - Low → "Scores in the Low band. Significant gaps versus the comparison set."
  - Final wording is the user's call before merge.

### 4. Page legend + tooltips
- Footer legend on `SiteAnalysis.tsx` updates to the four new bands.
- Card score tooltip and pill labels follow the new scale.
- Any "recommend / do not recommend" prose in card help text is rewritten to confidence wording.

## What does NOT change

- Pillar math, composite math, weights (Sam + Kaylie own that).
- Pillar names, pillar scores, pillar charts.
- DB tables / columns / RLS.
- Sidebar **Methodology** and **Docs** pages — explicitly deferred per Haseeb.
- Watch List feature — deferred to a separate turn.
- Candidate Pipeline, Market Validation, Manus rename — separate turns.

## Files touched

```text
src/pages/SiteAnalysis.tsx              labels, legend, banner removal, button rename
src/components/phase2-demo/SiteDecisionControls.tsx   drop winner button, relabel verdicts
src/data/phase2DemoData.ts              rename thresholds constant + add medium band
src/hooks/useSiteDecisions.ts           verdict union → "strong" | "high" | "medium" | "low" | "undecided"
src/lib/sitePack/copy.ts                tier labels + sentences rewritten
src/lib/sitePack/SitePackDocument.tsx   remove winner badge/column/row, rename section 10
```

## Verification

1. Build passes.
2. Open `/site-analysis` in the live preview:
   - No "Winner" button, banner, or column.
   - Pills show Strong / High / Medium / Low.
   - Footer legend matches.
3. Click **Export Site Report (PDF)** with one scored candidate → PDF opens, no Winner badge, neutral summary wording.
4. Confirm console has no errors.

## Out of scope (next turns, in this order)

1. **Watch List** add-to-list behavior on Site Analysis cards.
2. **Manus CSI → MVS** rename across UI.
3. Candidate Pipeline live verification + fixes.
4. Sidebar Methodology / Docs updates once features are stable.
