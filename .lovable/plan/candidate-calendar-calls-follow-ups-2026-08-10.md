# Candidate Calendar (Calls + Follow-ups)

## What we are building

A calendar view inside the Candidate Pipeline page. You switch between **Board** and **Calendar** at the top. The calendar shows **Day / Week / Month**, with a block for each scheduled call or follow-up reminder. Clicking a block opens that candidate's card, same as clicking a Kanban card.

## Why

Right now nothing in the app stores a call date or time. Call scheduling lives only in checkboxes ("Scheduled next call with clear agenda"), so there is no way to see what is coming up today or this week.

## How a call gets on the calendar

You type it in the app. Two places:

1. **From the candidate card** — a small "Schedule" panel on the Qualification Process tab lets you pick date, time, length, type (call or follow-up), and a short title/note.
2. **From the calendar** — click an empty slot, pick a candidate from a search box, fill the same fields.

Events can be edited, moved, marked done, or deleted. Nothing syncs to Google Calendar in this phase.

## What shows on it

- Scheduled calls (blue blocks, labeled with candidate name + step/type)
- Follow-up reminders (amber blocks, can be all-day)
- Colors also reflect status: upcoming, done, missed (past and not marked done)

Homework due dates and FDD 16-day dates are intentionally left off for now.

## Phases

**Phase 1 — Data (1 turn)**
New table `candidate_events`: candidate link, title, event type (call / follow_up), start time, duration, all-day flag, notes, status (scheduled / completed / canceled), owner. Row-level security matching the rest of the pipeline (staff can read/write), plus the required table grants. Deleting a candidate removes its events.

**Phase 2 — Calendar view (2 turns)**
Board/Calendar toggle on `/candidate-pipeline`. Month, Week, and Day views built with existing UI pieces and `date-fns` (already in the project) — no new heavy calendar library unless the week/day grid gets awkward, in which case a small one is added. Includes "Today" button, arrows, and an "Upcoming" side list.

**Phase 3 — Create / edit / link (1–2 turns)**
Add-event dialog (from calendar and from candidate card), edit and delete, mark complete, click-through to the candidate detail panel, plus an activity log entry when an event is created, moved, or completed.

Total: about 4–5 turns.

## Risks and what we will not touch

- Kanban board, drag-and-drop stage moves, qualification scoring, and FDD compliance rules stay untouched.
- The new table is additive, so existing pipeline features cannot break.
- Time zones: all events stored in UTC, shown in your browser's local time.
- No email or push reminders in this scope.

## What to test after each phase

- Phase 1: nothing visible yet; pipeline still loads normally.
- Phase 2: switch to Calendar, move between day/week/month, confirm the board still works.
- Phase 3: schedule a call for a candidate, see it appear, drag/edit it, click it to open the candidate card, mark it done.
