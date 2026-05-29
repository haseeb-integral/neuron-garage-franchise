# Add .lovable status doc for Notifications

Create a single concise markdown file so we can pick this back up later.

## File

`.lovable/Notifications — Header Bell Plan.md`

(Name mirrors the feature exactly, matching the convention of `Candidate Pipeline — City Search Reskin Plan.md`.)

## Contents (kept short on purpose)

Three sections only:

1. **What it is** — one paragraph: in-app bell popover, v1.0, polled, RLS per user.
2. **Shipped ✅** — bullet list:
   - `public.notifications` table + indexes + RLS (own-row select/update/delete; no client insert)
   - `src/hooks/useNotifications.ts` (list, unreadCount, markRead, markAllRead, 60s poll)
   - `src/components/NotificationsPopover.tsx` (header, list, empty state, v1.0 tag, City-screen colors)
   - Bell wired in `src/components/PageHeader.tsx` and `src/components/city-scoring/CityTopBar.tsx` (badge driven by real unread count; "9+" cap)
3. **Pending 🟡** — bullet list of the 5 event sources still to wire (none of these block the UI; bell shows empty state until wired):
   - `candidate_assigned` — DB trigger on candidates.owner change
   - `candidate_stage_changed` — DB trigger on candidates.current_stage change (notify owner only)
   - `city_scoring_finished` — insert at end of scoring edge function
   - `credential_issue` — insert from credential call wrapper on failure
   - `system` — manual admin inserts (no UI yet)
4. **Out of scope (parked)** — realtime channels, email/push, per-kind mute, grouping, `/notifications` full page, backfill.

## Maintenance rule (added to the file's header)

> Lovable: keep this file in sync whenever Notifications work is touched. Move items from Pending → Shipped as they ship. Don't let it drift.

## Out of scope for this turn

No code changes. No other docs touched. Just create the one md file.