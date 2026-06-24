## What I found

The two cards come back because the page still auto-loads old `site_analyses` rows on refresh.

The last fix tried to hide each removed card by its row id and address.
But there is still a weak spot:

- The page keeps a local list called `hiddenIds`.
- When you remove a card, it writes the new hidden list to the profile.
- On refresh, the page reads the profile and then loads old ready analysis rows.
- If the hidden list is stale, incomplete, or an address is saved in a slightly different text form, old rows can still pass through and show again.

So the safer fix is not to keep patching the hide list only.
The safer fix is to stop auto-filling visible cards from old analysis history.

## Goal

After refresh, the 4 card slots must show only what the user clearly put there.
If the user removed all cards, refresh must show 4 empty slots.
The same old two cards must not come back by themselves.

## What will change

### Page affected
- `Site Analysis` page only.

### Code affected
- `src/pages/SiteAnalysis.tsx`

### Data affected
- It will still read Saved Sites.
- It will still save and remove Saved Sites.
- It will not delete any database rows.
- It will not change score math.
- It will not change exports.
- It will not change Saved Sites drawer.

## Safe fix plan

### Phase 1: Stop old analysis rows from auto-loading into cards
Turn off the refresh auto-hydrate from `site_analyses`.

Instead:
- On page open, start with empty card slots.
- User can add a card from the top Run Site Score form.
- User can load a card from Saved Sites.
- User can re-run a card.
- User can remove a card and it stays gone.

This removes the root cause: old analysis history cannot refill the cards anymore.

Estimated Lovable turns: 1

### Phase 2: Keep the hide safety net, but make it stricter
Keep the existing hidden-card logic as extra safety.
Make address hiding use a normalized address key.
That means small spacing or casing changes will not let the same address sneak back.

Estimated Lovable turns: same turn as Phase 1 if small.

### Phase 3: Smoke test myself
I will test this exact flow:

1. Open Site Analysis.
2. Remove visible cards until all 4 slots are empty.
3. Refresh the page.
4. Confirm the same two cards do not come back.
5. Load one card from Saved Sites.
6. Refresh.
7. Confirm only that loaded/saved action works as expected, and old removed cards do not auto-fill.
8. Check console errors.

Estimated Lovable turns: same turn after code change.

## What should not be touched

- No database migration.
- No score formulas.
- No pillar math.
- No exports.
- No Saved Sites count.
- No Candidate Pipeline.
- No Market Validation.
- No style redesign.

## Risk

The only behavior change is this:

Before: refresh auto-filled cards from old analysis history.
After: refresh will not auto-fill old analysis history.

This is the right behavior for your issue, because old history is exactly why the cards keep coming back.

If you want a card back, use Saved Sites or run it again.

## Approval needed

Approve this and I will implement Phase 1 + Phase 2, then smoke test it myself.