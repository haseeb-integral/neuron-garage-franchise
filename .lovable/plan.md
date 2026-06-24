# Task 12 — Rename Site Analysis "Confidence" to "User Confidence"

## What we are changing and why

On the Site Analysis page, the label "Confidence" is confusing because it sounds like a system score. Brett wants it renamed to "User Confidence" so it is clear this is the human decision, not an algorithmic rating.

## Which pages and components are affected

- **Site Analysis page** (`src/pages/SiteAnalysis.tsx`)
  - "Confidence summary" heading
  - "Confidence" column header in the summary table
  - "Confidence bands:" label above the band legend
  - "Your **Confidence** selection..." helper text

- **Site decision controls** (`src/components/phase2-demo/SiteDecisionControls.tsx`)
  - "Confidence" label above the Strong / High / Medium / Low buttons on each candidate card
  - Helper text "No confidence set yet" and "Score suggests a confidence band"

- **Site Brief page** (`src/pages/SiteBrief.tsx`)
  - "Confidence" stat label on the top summary
  - "Confidence band" column header in the comparison table
  - "Confidence: X" chips on candidate cards

- **Site Pack PDF** (`src/lib/sitePack/SitePackDocument.tsx`)
  - "Confidence: X" chip on candidate cards
  - "Confidence band" in the comparison table header

## What we will NOT touch

- "Confidence" in Market Validation (that is data-extraction confidence, not user confidence)
- `SITE_CONFIDENCE_THRESHOLDS` constant name (code-only, not user-facing)
- Any database columns or API names
- Scoring logic or weights

## How this fits into the current app

These are text-only label changes. No data keys, no stored values, no API contracts change. The user still clicks the same buttons; only the label above them and in exports changes.

## Phases

**Phase 1 — UI labels (1 turn)**
- Edit `SiteDecisionControls.tsx`: change "Confidence" header to "User Confidence"
- Edit `SiteAnalysis.tsx`: change "Confidence summary" → "User Confidence summary", table header "Confidence" → "User Confidence", "Confidence bands" → "User Confidence bands", and helper text
- Edit `SiteBrief.tsx`: change "Confidence" stat and chip labels to "User Confidence"
- Edit `SitePackDocument.tsx`: change "Confidence" chip labels to "User Confidence"

## Tests / checks after

- Open Site Analysis, add a candidate, verify the card shows "User Confidence" above the buttons
- Scroll to the summary table, verify the column says "User Confidence"
- Check the Site Brief page, verify chips and stats say "User Confidence"
- Confirm no TypeScript build errors

## Risks

Very low. Text-only. Reversible in one edit. The only risk is missing a spot — I will search the full codebase for remaining "Confidence" references in Site Analysis files before declaring done.