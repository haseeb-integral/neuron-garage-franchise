Replace end-user-facing "Brett" labels with **"Brett/Sam"** on the demo screens. Leave all admin/governance/scoring-lock references as **Brett** (per project memory: Brett is the approver).

## End-user UI changes (Brett → Brett/Sam)

**`src/pages/SiteAnalysis.tsx`**
- Line 178: `"Brett's call"` → `"Brett/Sam's call"`
- Line 436: "which address Brett is committing to" → "which address Brett/Sam is committing to"
- Line 450: "Brett's verdict:" → "Brett/Sam's verdict:"
- Line 480: column header "Brett's verdict" → "Brett/Sam's verdict"
- Line 634: tooltip "Open a branded decision pack with Brett's verdict…" → "…Brett/Sam's verdict…"
- Line 652: "that's the site Brett is committing to" → "…Brett/Sam is committing to"

**`src/pages/MarketValidation.tsx`**
- Line 264 comment: leave (internal comment)
- Line 270: "(Brett's call, persists per user)" → "(Brett/Sam's call, persists per user)"

**`src/lib/decisionsExport.ts`**
- Line 110 (PDF export): `Brett's verdict:` → `Brett/Sam's verdict:`
- Line 2 header comment: leave (internal)

**`src/pages/EmailOutreachV2.tsx`**
- Line 167 is a comment — leave as-is (internal). No UI text change here.

## NOT changing (correctly Brett — approver/governance)
- `Handover.tsx` (vault, API ownership, "Pending Brett")
- `Observability.tsx`, `UserGuide.tsx`, `SystemOverview.tsx` ("ask Brett or Haseeb" — manager role)
- `ScoringMethod.tsx` ("Brett or Haseeb sign-off")
- `userGuideMarkdown.ts`, `specMarkdown.ts` ("Brett's rule")
- All scoring/lib comments referencing Brett-approved decisions
- `SubMetricWeightsDrawer.tsx` ("locked by Brett + Haseeb")
- `MarketDetailDrawer.tsx` ("Brett's 2026-05-21 Manus upload")

## Verify
- Search demo pages after edit to confirm only the targeted strings changed.
- Spot-check `/site-analysis` and `/market-validation` in preview that the new "Brett/Sam" labels render without layout breaks (column header width is the only minor risk).