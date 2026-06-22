## Problem

The "Engine error: Failed to send a request to the Edge Function" message means the `compute-sas` edge function is failing to boot. The logs say:

```
worker boot error: Uncaught SyntaxError: Identifier 'acs10' has already been declared
    at compute-sas/index.ts:202:12
```

## Cause

In `supabase/functions/compute-sas/index.ts`, this line is written **twice in a row**:

```ts
const [acs10, acs15] = await Promise.all([acsRing(iso10, 10), acsRing(iso15, 15)]);
const [acs10, acs15] = await Promise.all([acsRing(iso10, 10), acsRing(iso15, 15)]);
```

Declaring `acs10` and `acs15` twice in the same scope is a hard JavaScript error — the worker refuses to start, so every Re-run fails with the network-level "Failed to send a request" message you see in the card.

## Fix

One-line change: delete the duplicate line. Keep one copy of:

```ts
const [acs10, acs15] = await Promise.all([acsRing(iso10, 10), acsRing(iso15, 15)]);
```

## Verify

1. Edge function boots cleanly (no more `Identifier 'acs10' has already been declared`).
2. Click **Re-run** on a saved card — the red error goes away.
3. After Re-run, the ⓘ source icons and the "Data Sources" chip strip appear (the trust UI we built earlier).

No other files change. No score math change. No UI change.
