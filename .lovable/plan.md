## What you saw

You removed one card. You refreshed the page. The removed card came back. So your "remove" did not stick.

## Why this happens (root cause)

When you click **Remove**:
1. The card disappears from your screen right away.
2. The page adds the card's id to a "hidden list".
3. The page waits **250 milliseconds** before saving that hidden list to your profile in the database. (This wait is there to batch many quick clicks into one save.)

If you refresh the page **before those 250ms pass**, the save is cancelled. The browser throws away the pending save. Your profile in the database never learns that the card was removed.

On refresh:
- The page reads your profile → hidden list is empty (or stale).
- The page reads your 20 most recent ready analyses from the database.
- The "removed" card is still in that list → it shows up again.

This also happens if the save request is still in flight when the browser navigates away — the browser can cancel it.

## Where I saw it in the code

File: `src/pages/SiteAnalysis.tsx`

- Lines 894–913: a `useEffect` with `setTimeout(..., 250)` is the only writer to `profiles.sas_hidden_ids`. The cleanup `clearTimeout(t)` runs on unmount and on every `hiddenIds` change. So a fast refresh kills the pending write.
- Lines 1175–1185: `removeSlot` only updates local state. It does not save to the database itself.

## The fix (Phase 1 — small, safe)

Make the "remove" action save **immediately** to the database, not after a 250ms wait. Keep the debounced effect as a safety net for other paths (rare).

Change in `src/pages/SiteAnalysis.tsx` only:

1. In `removeSlot`, after computing the new hidden id:
   - Update local state (as today).
   - Build the new full hidden list `nextHiddenIds`.
   - Call `supabase.from('profiles').update({ sas_hidden_ids: nextHiddenIds }).eq('id', user.id)` directly. Await it (fire-and-forget with `void` is OK, but issue the request **synchronously** so the browser starts the network call before the user can refresh).
   - Update `lastPersistedRef.current` so the debounced effect does not write the same payload again.
2. Keep the existing debounced effect for safety (covers `unhide…` calls from re-runs, etc.).

This is the minimum change to fix the bug you saw.

## Phase 2 — extra safety (optional, only if you say yes)

Add a `beforeunload` flush: if there is still an unsaved hidden list when the user closes or refreshes the tab, send a final save using `navigator.sendBeacon` so the browser does not cancel it.

I will only do Phase 2 if you ask.

## What will NOT change

- Score math, pillars, exports — untouched.
- Saved Sites drawer — untouched.
- The card UI, the "Saved snapshot" pill, the watchdog — untouched.
- No database schema change. No new table. No new column.
- No edge function change.

## Risks

- Very small. The new write uses the same column (`sas_hidden_ids`) and the same row (your profile).
- If the database write fails (rare), the card is still hidden in this tab. On the next refresh it could come back — same as today. No worse.

## Test plan (after Phase 1)

I will smoke test:
1. Load Site Analysis with 2 ready cards.
2. Click **Remove** on one card.
3. Immediately hit refresh (within 1 second).
4. Confirm only 1 card shows.
5. Open another browser / incognito → confirm only 1 card shows there too.
6. Re-run a removed address → confirm the card comes back (un-hide path still works).

## Turns needed

- Phase 1: **1 turn**.
- Phase 2 (only if approved): 1 more turn.

Please approve Phase 1 and I will implement.