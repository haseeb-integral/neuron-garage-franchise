# Signals & Red Flags per Step

Add a small "Signals & Red Flags" box to every step of the Qualification Process tab, so recruiters can record how the prospect behaved during that call.

## What it looks like

At the bottom of each step (just above Recruiter notes), a box with:

- **Was the prospect on time for this call?** — On time / Late / No-show
- **Did the prospect reschedule this call?** — Not rescheduled / Rescheduled once / Rescheduled more than once
- **Was the prospect prepared (homework done)?** — Yes / Partly / No
- **Was the spouse/partner engaged?** — Yes / No / Not applicable
- **Other red flag** — free text notes

Answers in the red-flag range (Late, No-show, Rescheduled more than once, Homework not done) are highlighted in red and counted.

## Rollup so flags are visible

- The step header shows a small red chip, e.g. "2 flags", when that step has any red answers.
- The Overview tab summary shows a single line: "Red flags: 3 across 2 steps" with the list, so nobody has to open every step.

## Why this shape

The same three or four questions repeat at every step, so trends show up (for example, rescheduling at Step 2 and Step 4). Free text alone would not let us count anything.

## Technical notes

- No database change needed. Each step already saves a free-form `data` object in `candidate_process_steps`; the answers go there under keys like `signal_on_time`, `signal_reschedule`, `signal_prepared`, `signal_partner_engaged`, `signal_notes`.
- Saving reuses the existing auto-save and activity-log path, so every change is written to the Activity tab audit trail.
- Files touched: `ProcessTab.tsx` (new `SignalsBlock` component + header chip), and `OverviewTab.tsx` for the rollup line. A small shared helper defines the questions and which answers count as red.
- Nothing existing is removed; checklists, notes, and completion stay as they are.

## Phases

1. Signals box on all 7 steps + red highlighting + auto-save (1 turn).
2. Step header flag chip + Overview rollup line (1 turn).

## Testing after each phase

Open a candidate, set "Late" and "Rescheduled more than once" on Step 1, reload the page to confirm it saved, and check the Activity tab shows the change.
