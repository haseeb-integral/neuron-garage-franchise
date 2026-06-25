## What is happening

You are dragging the **Weight (preview)** slider on the Pricing card and expecting the big number **16.9 / 100** to change. It does not. That is actually working as designed — but the design is confusing, so it feels like a bug. Here is why, and what I want to fix.

### Why the card score does not move

- The big number on each card is the **sub-score** (0–100) for that pillar. It only depends on the city's raw data (prices, providers, ACS, etc.). It does **not** depend on weight.
- The slider only changes the **weight** that pillar carries inside the final MVS (the composite score at the top of the page).
- So when you drag the slider:
  - Card number (16.9) → stays the same ✅ (by design)
  - Top-of-page MVS preview ("Default 48.6 → preview 51.9") → moves ✅
  - But nothing on the card itself visibly reacts → feels broken ❌

This is the same on all 5 cards.

### The real issue

The slider's effect is **invisible on the card you are touching**. The user has to scroll up to the banner to see the change. That breaks trust.

## Fix plan (UI only, no scoring math change)

### Phase 1 — Make the slider's effect visible on the card (1 turn)

On every card, directly under the Weight slider, add a small live line:

```
Contributes 5.4 of 100 to MVS  ·  drag to preview
```

- "Contributes" number = `subScore × weight` (e.g. 16.9 × 0.32 = 5.4).
- Updates instantly as the slider moves.
- Also show a tiny delta when the weight is not the default, e.g. `(+1.2 vs default)` in green/red.

This gives instant visual feedback on the same card the user is dragging.

### Phase 2 — Clarify the big number is not weight-driven (same turn)

- Add a tiny label under the big "16.9 / 100" → `Sub-score (weight-independent)`.
- Update the caption above the grid from "Dragging a weight only previews sensitivity" to plain English:
  > "The big number is the pillar score and does not change with the slider. The slider only changes how much this pillar counts toward the final MVS at the top of the page."

### Phase 3 — Smoke test (same turn)

I will drive the running app with Playwright:
1. Open Market Validation, click into a city.
2. For each of the 5 cards, drag the slider up and down.
3. Confirm:
   - Big sub-score number stays the same (correct).
   - "Contributes X of 100" line under the slider updates live.
   - Top banner "Default → preview" updates live.
   - Weight chip in the header (32% etc.) updates live.
4. Screenshot before/after for the Pricing card as proof.

## What will NOT change

- No change to scoring math, weights logic, or `computeMvs`.
- No change to DB, edge functions, Saved Sites, exports, or other pages.
- Default weights and the "Reset" button keep working as today.

## Risks

- Very low. This is text + one derived number per card. No new state, no new fetches.

## Estimated turns

- Phase 1 + 2 + 3 → **1 turn total**.

Approve and I will ship in the next turn.