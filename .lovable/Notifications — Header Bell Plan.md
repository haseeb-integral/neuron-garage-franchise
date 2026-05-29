# Notifications — Header Bell Plan

> **Lovable: keep this file in sync whenever Notifications work is touched.**
> Move items from Pending → Shipped as they ship. Don't let it drift.

## What it is

In-app notification bell in the top header (PageHeader + CityTopBar). v1.0 = a simple popover list of the signed-in user's 20 most recent notifications, polled every 60s, RLS-locked per user. No realtime, no email, no push. Bell badge shows real unread count (hidden at 0, capped at "9+").

## Shipped ✅

- `public.notifications` table — columns: `id, user_id, kind, title, message, link, read_at, created_at`. Indexes on `(user_id, created_at desc)` and partial unread. RLS: own-row SELECT/UPDATE/DELETE only; clients cannot INSERT (service_role only).
- `src/hooks/useNotifications.ts` — `items`, `unreadCount`, `markRead(id)`, `markAllRead()`, 60s polling.
- `src/components/NotificationsPopover.tsx` — header with "Mark all read", row list (unread dot, title, message, relative time), empty state, footer with `v1.0` tag. Colors match City screen (`#07142f`, `#526078`, `#174be8`, `#eef2f7`, `#f7faff`, `#e11d48`).
- Bell wired in `src/components/PageHeader.tsx` and `src/components/city-scoring/CityTopBar.tsx`. Badge driven by real `unreadCount`, "9+" cap.

## Pending 🟡 (none block the UI — bell shows empty state until wired)

- `candidate_assigned` — DB trigger on `candidates.owner` change → insert notification for the new owner.
- `candidate_stage_changed` — DB trigger on `candidates.current_stage` change → notify the owner only.
- `city_scoring_finished` — insert at end of the city scoring edge function for the user who triggered the run.
- `credential_issue` — insert from the credential call wrapper when a call fails or a key is near expiry.
- `system` — manual admin inserts for announcements (no admin UI yet; insert via SQL/service role for now).

## Out of scope (parked, not v1.0)

- Realtime push (Supabase channels) — polling is fine.
- Email or browser push notifications.
- Per-kind preferences / mute.
- Grouping ("3 candidates moved today").
- Dedicated `/notifications` full-page view.
- Backfilling historical events.
