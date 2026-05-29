# Notifications v1.0 — Header Bell

Goal: make the bell in `PageHeader.tsx` (and the matching one in `city-scoring/CityTopBar.tsx`) actually open something useful. Keep it dead simple. Label it v1.0 — we just need it working, not feature-rich.

## What the bell shows (v1.0 scope)

A popover dropdown anchored to the bell with:

- Header row: "Notifications" + small "Mark all read" text button
- A list of up to 20 most recent notifications for the signed-in user, newest first
- Each row: small dot (unread = filled accent, read = hollow), title (bold), 1-line message, relative time ("2h ago"), optional click-through link
- Empty state: muted line "You're all caught up."
- Footer: "v1.0" tag on the right (so it's obvious this is a first cut)

No filters, no tabs, no settings, no email/push, no realtime — those are future versions.

## What triggers a notification (v1.0 only — narrow list)

Based on what the app actually does today (candidate pipeline, city scoring, prompts, credentials, AI workflows, observability), v1.0 will only generate notifications for these standard, low-risk events:

1. **Candidate assigned to you** — "New candidate assigned: {name}" → links to that candidate
2. **Candidate moved to a new pipeline stage** (only when the current user is the owner) — "{name} moved to {stage}"
3. **City scoring run finished** — "City scoring finished for {city}" → links to the city page
4. **Credential / API key about to expire or failed** — "Credential '{name}' failed last call" → links to Credentials
5. **System message from admin** (manual insert via backend, for announcements) — "We shipped …"

That's it for v1.0. Everything else (mentions, comments, exports ready, AI workflow finished, observability alerts) is parked.

This matches what standard webapps surface in a bell: assignments, status changes, finished long-running jobs, integration failures, and admin announcements (cf. Linear, Notion, GitHub, Vercel).

## UI / UX — match City screen look

Reuse the exact tokens already used in `PageHeader.tsx` and the city screen so it feels native:

- Container: `bg-white`, `border: 1px solid #eef2f7`, `rounded-xl`, soft shadow (same vibe as the existing 36px white circle buttons)
- Popover width ~360px, max-height ~440px with internal scroll
- Title color `#07142f`, body `#526078`, accent `#174be8` (the same indigo used for the avatar and hover text)
- Unread dot: `#174be8`. Badge on the bell already uses `#e11d48` — keep it; it now reflects the real unread count from DB instead of hardcoded "3"
- Row hover: `#f7faff` (same as account button hover)
- Use `Popover` from `@/components/ui/popover` (shadcn) — already in the project

## Technical plan

### 1. Database (one migration)

New table `public.notifications`:

- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (recipient)
- `kind text not null` (e.g. `candidate_assigned`, `candidate_stage_changed`, `city_scoring_finished`, `credential_issue`, `system`)
- `title text not null`
- `message text`
- `link text` (optional in-app route like `/candidates/123`)
- `read_at timestamptz` (null = unread)
- `created_at timestamptz not null default now()`

Indexes: `(user_id, created_at desc)`, partial `(user_id) where read_at is null`.

GRANTs: `authenticated` = SELECT/UPDATE/DELETE on own rows; `service_role` = ALL. No `anon`.

RLS:
- SELECT/UPDATE/DELETE: `auth.uid() = user_id`
- INSERT: blocked for clients — notifications are only inserted by edge functions / DB triggers (service_role). This prevents a user from spoofing notifications to others.

### 2. Frontend

New files:
- `src/hooks/useNotifications.ts` — fetches list + unread count, exposes `markAllRead()` and `markRead(id)`. Plain `useQuery`, no realtime in v1.0 (refetch on popover open + 60s interval).
- `src/components/NotificationsPopover.tsx` — the popover content (header, list, empty state, v1.0 tag).

Edits:
- `src/components/PageHeader.tsx` — wrap the existing bell button in `<Popover>`, drive the red badge from `unreadCount` (hide when 0, show "9+" when >9), open `NotificationsPopover` on click.
- `src/components/city-scoring/CityTopBar.tsx` — same treatment so behavior matches across screens.

### 3. Seeding the 5 event types (later, not blocking v1.0 UI)

v1.0 ships the table + UI. We can wire the 5 triggers incrementally:
- `candidate_assigned` / `candidate_stage_changed` → DB trigger on the candidates table
- `city_scoring_finished` → insert at the end of the scoring edge function
- `credential_issue` → insert when a credential call fails in the existing wrapper
- `system` → manual inserts for now

If nothing has been wired yet, the bell simply shows the empty state — which is correct behavior, not a bug.

## Out of scope for v1.0

- Realtime push (Supabase channels) — polling is fine
- Email or browser push notifications
- Per-kind preferences / mute
- Grouping ("3 candidates moved today")
- A dedicated `/notifications` full-page view
- Backfilling historical events

## Files touched

- new: `supabase` migration for `notifications`
- new: `src/hooks/useNotifications.ts`
- new: `src/components/NotificationsPopover.tsx`
- edit: `src/components/PageHeader.tsx` (wrap bell, drive badge from data)
- edit: `src/components/city-scoring/CityTopBar.tsx` (same)

No changes to scoring logic, pipeline logic, RLS on other tables, or any existing UI outside the bell.