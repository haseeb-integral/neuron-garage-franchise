## Problem
In the Site Analysis candidate cards, 4 buttons (Save/Saved, Re-run, Replace, Remove) are crammed into a single flex-wrap container. Because the card is narrow, only 3 fit on the first row. The Remove button wraps to a second row and floats alone on the right. This looks broken and unprofessional.

Screenshot confirms the issue is consistent across all 4 cards.

## Root cause
Line ~248 in `SiteAnalysis.tsx` uses:
- `flex-wrap` — allows wrapping
- `justify-end` — right-aligns every row
- `gap-1.5` — tight spacing

Result: the last button always wraps and becomes a lonely orphan.

## UI/UX rule from the search
Design systems (USWDS, Carbon, Helios, Ant Design) agree on two principles that apply here:
1. **Related actions stay together; destructive actions separate.** Remove is destructive. Save, Re-run, Replace are normal operations. They should not share a single wrapping row.
2. **If you must wrap, make it intentional.** An accidental orphan looks like a bug.

## The fix
Restructure the button area into **two intentional rows** inside each card:

```
┌──────────────────────────────────────┐
│  Save  │  Re-run  │  Replace          │  ← row 1: neutral/positive actions
├──────────────────────────────────────┤
│                           Remove     │  ← row 2: destructive action, separated
└──────────────────────────────────────┘
```

Steps:
1. Replace the single `flex-wrap` container with a **small vertical stack** (two flex rows).
2. Row 1: Save, Re-run, Replace — `justify-end`, `flex-nowrap`, tight gap.
3. Row 2: Remove — `justify-end`, small top margin so the separation is clearly intentional.
4. Keep all existing button styling (colors, icons, disabled states, tooltips).

No database changes. No new components. Pure layout fix in `CandidateCard`.

## Verification
- Open SAS page with 4 candidate cards.
- Every card should show buttons in two clean right-aligned rows.
- No orphaned single buttons.