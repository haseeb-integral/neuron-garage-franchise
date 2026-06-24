## Problem

In the Saved Sites drawer, every saved row shows a colored confidence chip — **HIGH / MEDIUM / LOW** — calculated from the score.

On the actual site card (left side), there is **no** such chip when the user has not picked a User Confidence. The card only shows a confidence pill if the user manually chose one. The code even has a comment saying we must **never** show "Low" as if the user decided it.

So today the drawer and the card disagree:

- Top saved row → score 60.57 → drawer paints a green **HIGH** chip
- Same card on the left → no chip at all (user has not picked one)

That is the bug the user is pointing at.

## Fix (one small phase)

Change **only** `src/components/site-analysis/SavedSitesDrawer.tsx` so the confidence chip on each saved row matches the rule used on the card:

1. Read the user-picked verdict from the saved snapshot (`snap.verdict`, the field already stored when the site was saved).
2. If the user picked one (`high` / `medium` / `low` / `strong`), show that verdict as the chip, using the same colors and labels the card uses.
3. If the user did **not** pick one, show **no chip** (just the score number), exactly like the card does.
4. Keep the live score number and the "Was X → Now Y" drift pill untouched.
5. Remove the score-based `bandFor()` chip path (or keep the helper unused — we will delete the call site).

No other files, no score math changes, no database changes, no card changes, no export changes.

## What may be affected

- Saved Sites drawer visual only (chip column on each row).
- All other surfaces (cards, popover, compare modal, exports) stay exactly as they are.

## Risks

- Very low. Pure presentation change in one file.
- If a very old saved row has no `verdict` field, it will simply show no chip — which is the correct behavior per the existing rule.

## Test plan after build

1. Open Saved Sites drawer → the top "LeafSpring … 60.57" row should now show **no** chip (because the card on the left has no chip).
2. On a card, pick a User Confidence (e.g. High) → Save → the new saved row shows a green **High** chip.
3. Change the verdict on the card to Low → Save again → the saved row chip updates to red **Low** on next save.
4. Rows that already had a verdict when saved keep showing that verdict.

Estimated turns: **1**.

Waiting for your approval before I touch any code.