## Phase UX-1 — Simplify Verification column (approved-style plan)

**Goal:** Stop shouting "Verify / Reject" at the user on all 228 rows. Only ask for human help on the small risky group.

### New states for the "Verification" column (one chip per row, no extra buttons unless needed)

| Row condition | Chip shown | Buttons shown |
|---|---|---|
| Kept price, not brand-derived, not human-touched | **In score — crawler** (green) | none |
| Kept price with `price_needs_review = true` (B1 brand-derived / future B3 AI Overview) | **Needs human review** (amber) | **Verify** · **Reject** · **Edit** |
| `verification_status = verified` or `edited` | **In score — human ✓** (green) | tiny "Undo" link only |
| `verification_status = rejected` | **Not in score — rejected** (grey) | tiny "Restore" link only |
| No price at all (`price_min` null, not excluded) | **Not in score — no price** (grey) | none |
| Excluded (non-camp, year-round, etc.) | **Not in score — excluded** (grey, with reason tooltip) | none |

### Header counters (small text, above the table)

Add one line under the existing "228 of 228 active camps" row:

> `210 in score · 12 need human review · 4 rejected · 2 no price`

So the user instantly sees the tiny number that actually needs their attention.

### What I will NOT do

- No legend strip (keep it simple, chips are self-explanatory).
- No "Override" hidden action on green crawler rows (you said keep it simple — I agree, drop it).
- No changes to scoring, DB, edge functions, drawer contents, or CSV export in this phase.
- No color/design-token changes.

### File touched

- `src/pages/ProviderEvidence.tsx` only — swap the current chip + always-on Verify/Reject buttons for the conditional logic above, and add the header counter line.

### Turns / risk / test

- **Turns:** 1
- **Risk:** very low — pure UI relabel + conditional render. All underlying data already exists (`price_needs_review`, `verification_status`, `price_min`, `exclusion`).
- **Manual smoke test after ship:**
  1. Open Austin Provider Evidence.
  2. Confirm most rows show green **"In score — crawler"** with **no buttons**.
  3. Filter for amber rows (or find one flagged by B1) → confirm **"Needs human review"** chip + Verify / Reject / Edit buttons appear only there.
  4. Click Verify on one → chip flips to **"In score — human ✓"**, buttons collapse to a small "Undo".
  5. Click Reject on another → chip flips to **"Not in score — rejected"**, price is cleared.
  6. Header counter numbers update to match the new mix.

### Order of work

Ship UX-1 alone in one turn. B3 (Apify AI Overview) still parked until you say go.

Approve and I'll build it.
