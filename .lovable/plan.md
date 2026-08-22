# Live new leads in the Candidate Pipeline

## What you want
When the landing page form sends a new lead, it should show up in the Candidate Pipeline right away, with no page refresh.

## What is true today
- The pipeline loads candidates once when the page opens (one query, then it sits still). Nothing listens for new rows.
- Live updates are already switched on in the database for the `candidates` table, so no database change is needed.
- The bell notifications still check every 60 seconds, so a new application can take up to a minute to show there.

## The change
1. Add a live listener on the Candidate Pipeline page. When a new candidate row is created (or an existing one changes), the page reloads its candidate list by itself.
2. Keep it calm: wait about 1 second and group changes together, so ten leads at once cause one reload, not ten.
3. Show a small toast: "New lead: Jane Doe" when a brand-new lead arrives, so the person watching the board notices it.
4. Clean up the listener when you leave the page, so nothing keeps running in the background.
5. Optional, same effort: make the bell update live too, instead of waiting 60 seconds.

Board, Calendar, and Table views all read the same candidate list, so all three stay in sync.

## Technical notes
- `src/pages/CandidatePipeline.tsx`: add a `useEffect` that opens a Supabase channel on `postgres_changes` for `public.candidates` (INSERT + UPDATE), debounced, that bumps the existing `reloadKey` state. Tear the channel down on unmount.
- Toast only on INSERT, using the payload's first/last name.
- Optional: `src/hooks/useNotifications.ts` gets the same treatment on `public.notifications` (realtime is already enabled for that table), keeping the 60s poll as a fallback.
- No database migration, no edge function change, no change to the landing page project.

## Risks and testing
- Low risk: read-only listener, no change to how anything saves.
- Watch for reload loops — the debounce plus reload-on-change (not reload-per-event) prevents this.
- Test: open the pipeline, submit the landing page form from another tab, confirm the new lead appears within a couple of seconds and the toast shows; drag a card and confirm no odd jumping.

## Effort
1 turn.
