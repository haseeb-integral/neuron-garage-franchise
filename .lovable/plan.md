## Why the row disappeared (quick explanation)

The page only shows **open** QA items by default. When you click Mark resolved, the row is still in the database — it just has a `resolved_at` timestamp set, which hides it from the open list. If you tick the **"Show resolved"** checkbox at the top right, it comes back (greyed out). Nothing is deleted. That's the design today, but we'll add a real Undo path so accidents are easy to fix.

## Why diagnostics are still empty on the existing rows

The diagnostics column is filled in only when the pipeline writes a NEW QA row. The 13 rows you see were inserted **before** the diagnostics feature shipped, so their `diagnostics` field is empty. The only way to fill them is to re-run the extraction for that provider — which the user has no way to trigger from the QA page right now.

---

## Plan (2 small phases)

### Phase A — Undo / Unresolve a row (1 turn)

1. **Sonner toast with Undo** after Mark resolved: success toast stays for 8 seconds with an "Undo" button. Clicking Undo calls the unresolve RPC (below) and the row pops back into the open list.
2. **Persistent Unresolve button** in the "Show resolved" view: when a row has `resolved_at`, show a small "Unresolve" button next to the "✓ Resolved" badge so the reviewer can flip it back any time, not just within 8 seconds.
3. **New DB function** `public.mvs_qa_unresolve(_queue_id uuid)`:
   - Same manager/admin role check as `mvs_qa_resolve`.
   - Sets `resolved_at = NULL`, `resolved_by = NULL`, `updated_at = now()`.
   - Does NOT touch the underlying `mvs_weeks` row (week status stays as the reviewer last left it — safest default).
4. Optimistic UI: row updates instantly, then refetches.

### Phase B — Per‑provider re‑extract from the QA page (1 turn)

1. Extend `mvs-extract-weeks` edge function: optional `provider_ids: string[]` in the request body. When present, filter `providerList` to those IDs only. No other behavior change. New runs automatically write the new diagnostics format.
2. Add a **"Re‑run extraction"** button on each provider QA card (next to "Mark resolved").
   - Calls `supabase.functions.invoke('mvs-extract-weeks', { body: { city, provider_ids: [providerId] } })`.
   - Shows a spinner while running (can take 10–30s because of Firecrawl calls).
   - On finish: `load()` so the same card now shows the populated diagnostics block (URLs the bot tried, HTTP status, notes).
3. Add a city‑level helper button at the top of the QA page: **"Re‑run extraction for all open providers in this city"**, same idea but passes every open provider's ID. This is how you would back‑fill all 13 New York rows at once.

---

## What may be affected
- `mvs_qa_queue` DB function set (one new function, no schema change, no GRANT change).
- `mvs-extract-weeks` edge function (additive — old callers without `provider_ids` keep working).
- `src/pages/MVSQAQueue.tsx` UI (buttons + Undo toast).

## Risks / what not to touch
- No change to scoring, week extraction logic, Firecrawl prompts, or any other page.
- `mvs_qa_resolve` stays exactly as it is.

## Effort
~2 small Lovable turns.

**Please approve and I'll start with Phase A.**