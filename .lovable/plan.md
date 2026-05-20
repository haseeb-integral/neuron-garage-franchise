
## Problem

The Outreach Queue panel on `/email-outreach` is throwing:

> Couldn't load outreach queue: Could not find a relationship between 'outreach_queue' and 'campaign_cache' in the schema cache

Cause: `OutreachQueuePanel.tsx` uses a PostgREST embedded select `campaign_cache(name)`, but there is **no foreign key** between `outreach_queue.campaign_id` (text) and `campaign_cache.id` (text). PostgREST refuses to auto-join without a declared FK.

This is also why your "Add to Outreach" rows look invisible — the whole query errors, so nothing renders (badges show 0).

## Fix (Option A — frontend only, no migration)

Edit `src/components/email-outreach/OutreachQueuePanel.tsx`:

1. Change the Supabase query to drop the `campaign_cache(name)` embed. Just select queue + teacher fields:
   ```
   .select("id, state, campaign_id, added_at, notes, teacher_prospect_id,
            teacher_prospects(name,email,school,city,state)")
   ```
2. After the queue loads, collect unique non-null `campaign_id` values and run **one** follow-up query:
   ```
   supabase.from("campaign_cache").select("id,name").in("id", uniqueIds)
   ```
3. Build a `Map<id, name>` and look up `campaignName` per row in the render instead of `r.campaign_cache?.name`.
4. Update the `QueueRow` type — remove `campaign_cache`, keep everything else.
5. Keep the existing fallback display rules: show campaign name pill if found, else raw id, else "draft (no campaign yet)".

## Why not add a real FK (Option B)

`campaign_cache` is a cache of SmartLead campaigns and can be wiped/resynced. Adding an FK would make `outreach_queue` inserts fail whenever a campaign_id isn't yet cached locally, breaking the "Add to Campaign" flow. Not worth it for a 2-query frontend fix.

## Files touched

- `src/components/email-outreach/OutreachQueuePanel.tsx` (only)

## Out of scope

- No DB migration.
- No changes to `AddToCampaignModal`, EmailOutreachV2, or teacher table.
- "Push to SmartLead" button still a placeholder (Task B5).

## Verification

After the change, on `/email-outreach` the Outreach Queue should:
- Stop erroring.
- Show all rows you've added from Teacher Search (including the row from Anna Weisberg if you added her).
- Show campaign names where the cached SmartLead campaign exists, raw id otherwise, "draft" if null.
