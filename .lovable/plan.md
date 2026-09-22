# Scheduled calls in steps: fix missing calendar event + add full fields

## Why Kaylie Test's call did not show

I checked her saved data. Her Step 1 and Step 3 have a date, a time and a time zone
filled in (Sep 23, 2:30 PM MT and Sep 24, 3:30 PM MT), but the checkbox
"Scheduled next call with clear agenda" is **not ticked**.

Today the app only puts a call on the calendar when that checkbox is ticked.
So nothing was created. This is working as built, but it is confusing.

## What we will change

**1. The date makes the call, not the checkbox.**
If a date, time and time zone are filled in, the call goes on the calendar right away.
Ticking the box is no longer required. If the date is cleared, the call is marked
Canceled on the calendar (it stays in history). One call per candidate per step, same
as now, so nothing gets duplicated.

**2. Same fields as "Schedule an Event".**
Each step's scheduled call block will get:
- Type dropdown (same list as the calendar popup)
- Length in minutes (default 30)
- Title (optional; if blank we use the type name, like today)
- Notes (optional; if blank we keep the "Automatically scheduled from Step N" note)

These save with the step, and the calendar call updates to match.

**3. Backfill Kaylie's two calls** so they appear without re-typing anything.

## Pages and parts touched

- Qualification Process tab (Steps 1–4 scheduled call block)
- The shared calendar helper that creates and updates these calls
- Calendar view (no code change; it just shows the new calls)

Not touched: pipeline stages, FDD dates and files, proof uploads, scores,
CSV import/export, email outreach, teacher search, other tabs.

## Technical notes

- New keys in `candidate_process_steps.data`: `tc_next_call_type`,
  `tc_next_call_duration`, `tc_next_call_title`, `tc_next_call_notes`.
- `syncProcessCallEvent` gains these optional inputs and no longer needs
  `scheduled === true`; it cancels only when date/time/zone are missing.
- Type list comes from `EVENT_TYPE_OPTIONS` in `candidateProcessSteps.ts`, so the
  step form and the calendar popup stay in sync.
- Existing unique link `(candidate_id, source_process_step)` still prevents duplicates.

## Phases

- **Phase 1** – Add the new fields to the step form and update the sync helper
  (create on date filled, cancel on date cleared). ~1 turn.
- **Phase 2** – Backfill Kaylie Test's two calls, run tests and a signed-in
  screen check. ~1 turn.

## Risks and testing

- Risk: a half-typed date creating a wrong call. Guard: nothing is created until
  date, time and time zone are all present.
- Risk: old steps with a ticked box but no date. Guard: no date means no change.
- Please test: add a call in a step, reload, check the Calendar tab, change the
  length and title, then clear the date and confirm the call shows as Canceled.
