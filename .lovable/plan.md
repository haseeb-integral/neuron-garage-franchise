## Why it is broken
The queue dropdown and Teacher Search campaign selector read from `campaign_cache`, but that table currently contains only one synthetic analytics row (`smartlead_analytics_overview`).

At the same time, the Campaigns panel is reading live SmartLead campaigns directly from the backend, which is why you can see real campaigns on the page but still cannot select one in the queue or push a lead.

## Plan

### 1. Restore a real campaign source for selectors
- Add one shared campaign-loading path that fetches live SmartLead campaigns and writes the real numeric campaign rows into `campaign_cache`.
- Run that sync when Email Outreach loads and when the user manually refreshes campaigns.
- Keep the synthetic analytics row out of selector logic.

### 2. Make the queue picker fool-proof
- Update `OutreachQueuePanel.tsx` so the Campaign cell does not depend on stale cache only.
- If cache is empty or stale, it should fetch live campaigns immediately instead of leaving the row stuck as “No campaigns synced”.
- Keep Push enabled only when the row has:
  - a real numeric SmartLead campaign id
  - an email address
  - a non-sent / non-sending state

### 3. Fix Teacher Search campaign selection to use the same source
- Update `AddToCampaignModal.tsx` to use the same real-campaign loading logic.
- Update `TeacherProspects.tsx` campaign-name lookup so badges/status labels resolve against real campaigns too, not just stale cache.
- This keeps Teacher Search and Email Outreach consistent.

### 4. Preserve your existing campaigns and validate the exact broken path
- Do not delete or rename:
  - `Test Campaign by UMaR`
  - `[TEST] Outreach · May-20 · 03:56 GMT+5 · v4`
- Validate the flow end to end:
  1. Queue row loads
  2. Campaign cell is selectable
  3. Assigning a campaign updates the row
  4. Push button becomes active
  5. Push request uses the selected real campaign

## Files likely involved
- `src/pages/EmailOutreachV2.tsx`
- `src/components/email-outreach/OutreachQueuePanel.tsx`
- `src/components/teacher-prospects/AddToCampaignModal.tsx`
- `src/pages/TeacherProspects.tsx`
- possibly a small shared helper for SmartLead campaign sync/loading

## Risk
- Low to medium: this is mainly data-source unification, not a workflow redesign.

## Undo
- Revert the campaign sync helper and switch selectors back to cache-only reads.
- No campaign records need to be deleted to undo the UI fix.

## Notes
- No database migration is needed for this fix.
- After implementation, I’ll draft the doc updates for `PROJECT_CONTEXT.md`, `HOW_IT_WORKS.md`, and `OPEN_TASKS.md`, then wait for your explicit go before writing them.