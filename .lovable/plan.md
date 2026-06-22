# Plan — Split Notes & Activity into two panels

## What changes

The Notes & Activity tab gets a dedicated **Notes** panel between "Add a note" and the "Activity Timeline". Notes still get written to the same `candidate_activities` table (no DB change), but the UI now shows them in their own pinned section so staff can read candidate notes without scanning past system events.

```text
┌─ Process Roadmap — <stage> ─────────────┐   (unchanged)
└─────────────────────────────────────────┘

┌─ Add a note ────────────────────────────┐   (unchanged)
│ [textarea]            [Add Note]        │
└─────────────────────────────────────────┘

┌─ Notes (3) ─────────────────────────────┐   NEW dedicated panel
│ 💬 haseeb · 2m ago · Jun 22, 10:04 PM    │
│ "Spoke with candidate, very interested" │
│ ─────────────────────────────────────── │
│ 💬 haseeb · 1h ago · Jun 22, 9:01 PM     │
│ "Wants to start in Austin"              │
│                                         │
│ [Show all 12]  ← only if >5             │
└─────────────────────────────────────────┘

┌─ Activity Timeline (everything else) ───┐
│ ✏️ Lead sheet updated — 2 fields…       │
│ ✓  Step 1 — Trial Close: …              │
│ → Moved New Lead → Initial Qual         │
│ ✓  haseeb voted Approve                 │
└─────────────────────────────────────────┘
```

## Rules

- **Notes panel** shows ONLY rows where `type = "note"`, newest first, collapsed to 5 by default with "Show all N" to expand.
- **Activity Timeline** now shows everything EXCEPT notes (lead sheet, process, stage, votes).
- The filter chips become simpler: **All · Changes · Stage · Votes** (no "Notes" chip — Notes has its own panel above).
- Same dual timestamp on every row (`2m ago · Jun 22, 10:04 PM`).
- Notes still render in the yellow tinted card style with the quote glyph so they feel like quotes, not log lines.

## Files touched

- `src/components/candidate-pipeline/tabs/NotesActivityTab.tsx` — split `rows` into `notes` and `events`, render two panels, drop the "Notes" chip from the filter strip.

One file, no DB change, no migration. ~30 lines of JSX shuffle.

## How you'll test

1. Open any candidate → Notes & Activity.
2. **Notes panel** at top shows every note you've added, newest first, in yellow cards. If more than 5, click "Show all" to expand.
3. **Activity Timeline** below shows ONLY system events (Lead Sheet, Process, Stage, Votes). No notes.
4. Add a new note → appears at the top of the Notes panel immediately, not in the Activity Timeline.

Reply **approved** to build.
