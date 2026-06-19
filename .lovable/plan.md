Two fixes:

## 1. QA page — show city and let user filter

Right now the page header just says "MVS QA Queue · 8 open items" with no city context. Each row shows the city in small grey text, but there is no top-level summary.

Add to the QA page header:
- A **city filter dropdown** ("All cities" + each city that has open queue items, with counts e.g. "Philadelphia (8)").
- A summary line: "Showing 8 open items across 1 city · 1 provider".
- Group rows visually by provider (single header per provider with a count badge, then its weeks below) so 7 Philly Art Center rows collapse into one block instead of 7 repeated headers.

No schema change. Pure presentation in `src/pages/MVSQAQueue.tsx`.

## 2. QA page should cover ALL providers, not only ones with low-confidence weeks

Today the queue only contains rows where `mvs_weeks.confidence < 0.7`. Providers whose extraction returned **0 weeks** (no_reg_page, scrape failed, AI returned empty) never enter the queue, so reviewers never see them. That is why Philadelphia shows only Philly Art Center even though 7 providers exist.

Fix in `supabase/functions/mvs-extract-weeks/index.ts`:
- After processing each provider, if `weeks_inserted === 0`, insert one `mvs_qa_queue` row with `entity_type='provider'`, `entity_id=provider.id`, `reason` = the specific failure (`"no registration page found"`, `"scrape failed: 404"`, `"AI returned 0 weeks"`, etc.), `confidence=null`.
- This way every provider that produced no usable data appears in the queue for human follow-up.

Update `MVSQAQueue.tsx` to render provider-type rows differently:
- Show provider name + city + the failure reason + a "Open provider website" link.
- Action buttons: "Mark resolved" only (no status dropdown — there's no week to update). Reuses existing `mvs_qa_resolve` RPC, which already no-ops on non-week entities when `_new_status` is null. (Verify in code — may need a tiny RPC tweak to accept null.)

## 3. Verification after build

- Trigger `mvs-extract-weeks` for Philadelphia.
- Open `/mvs-qa-queue`. Expect:
  - City filter dropdown shows "Philadelphia (N)".
  - All 7 Philadelphia providers visible: Philly Art Center grouped with its 7 weeks, plus 6 provider-level rows for the others (Steve & Kate's, Adventureland, Clubhouse Phoenixville, ¡Viva Verano!, Dandelion Project, Lights Camera Acting).
  - Each row clearly labels its city.

## Out of scope
- Re-running extraction across other cities.
- Changing the confidence threshold.
- Adding bulk actions.