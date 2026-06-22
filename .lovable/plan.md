# Plan — Smarter Activity Log + Better Notes UI (Phase 5b)

## Your questions answered first

**Q1. The old Homework tab's "Add a checklist item" box — what did it do?**
It let staff type a brand-new checklist line and add it to that stage's Trial Close Checklist for this candidate (custom step, not from the seed list).

**Q2. Should we re-add it in the Process tab?**
**No.** The Process tab already has this. Each step's three sub-lists (Trial Close, Post-Call Actions, Homework) and the Notes & Activity tab's "Process Roadmap" section already let you add/remove custom items via `ChecklistSection`. The old Homework tab's box is fully replaced. Leave it.

**Q3. Your note "didn't show up."**
Actually it did — the DB has your two notes saved as `note` rows with the literal text you typed: `"notes"` and `"Add notes"`. They look like system labels because they're one word. The save worked; the UI just doesn't make notes stand out from system events. We'll fix that.

**Q4. Smoke test status (verified against DB):**
- Steps 1, 2, 3, 4, 5 ✅ all writing rows correctly with your email and timestamp
- Step 6 (refresh) ✅ rows persist
- Step 7 (per-candidate filter) ✅ — query already filters by `candidate_id`
- Only real issues: **what** changed isn't shown clearly, **notes look like noise**, and the UI is plain

---

## What we'll change

### 1. Richer activity content (write side)

| Where | Today writes | Will write |
|---|---|---|
| LeadSheetTab | `"Lead sheet updated"` | `"Lead sheet updated — 3 fields changed: motivation, timeline, liquid capital"` + metadata `{changed_fields: [...]}` |
| ProcessTab | `"Step 1 — updated"` | `"Step 1 (Initial Call) — Trial Close: Asked to move forward ✓"` (names the actual sub-item that toggled) + metadata `{step, group, key, value}` |
| CommitteeVotes | already good | unchanged |
| Stage change | already good | unchanged |
| Note | text as-is | unchanged |

LeadSheet diff: keep a snapshot of `form` at load time, compare on save, list changed labels.
Process: pass the toggled label into `persist()` so the log message names the exact checkbox.

### 2. Notes & Activity tab — new UI

```text
┌───────────────────────────────────────────────────────────┐
│ Add Note                                                   │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [textarea, larger, autosizing]                        │ │
│ └───────────────────────────────────────────────────────┘ │
│ Cmd+Enter to post · 0 / 2000        [Add Note]            │
└───────────────────────────────────────────────────────────┘

Filter:  [ All ]  [ Notes ]  [ Changes ]  [ Stage ]  [ Votes ]

Activity Timeline
┌───────────────────────────────────────────────────────────┐
│ 💬  haseeb  ·  just now  ·  Jun 22, 5:51 PM               │
│ ┌─ NOTE ────────────────────────────────────────────────┐ │
│ │ "Spoke with candidate, very interested in Austin."    │ │
│ └───────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────┤
│ ✏️  haseeb  ·  1m ago  ·  Jun 22, 5:50 PM                  │
│ Lead sheet updated                                         │
│   • motivation: "..." → "..."                              │
│   • timeline: "6 months" → "3 months"                      │
├───────────────────────────────────────────────────────────┤
│ ✓  haseeb  ·  2m ago  · Jun 22, 5:49 PM                    │
│ Step 1 (Initial Call) — Trial Close                        │
│   Asked to move forward  ✓ checked                         │
└───────────────────────────────────────────────────────────┘
```

UI rules:
- **Notes** render inside a tinted card with a quote glyph and a "NOTE" tag so they pop visually
- **System events** render as a row with an icon, one-line summary, and (if metadata has details) an indented list underneath
- Each row shows **relative time** ("2m ago") **and** absolute time ("Jun 22, 5:51 PM") side-by-side
- Filter chips at the top (All / Notes / Changes / Stage / Votes) reduce noise
- Add Note: larger autosizing textarea, char counter, Cmd/Ctrl+Enter shortcut, posts and clears in place

(UI inspiration: GitHub issue timeline, Linear activity feed, Notion comments — all use card-style notes + condensed system rows with filters.)

### 3. No DB schema change
`candidate_activities` already has `content`, `metadata jsonb`, `actor_email`, `created_at`. We use what's there.

---

## Files touched

1. `src/lib/candidateActivity.ts` — no change (already accepts metadata)
2. `src/components/candidate-pipeline/tabs/LeadSheetTab.tsx` — capture initial snapshot, diff on save, send rich content + `changed_fields` metadata
3. `src/components/candidate-pipeline/tabs/ProcessTab.tsx` — pass toggled label + value into `persist()`, write richer content + metadata
4. `src/components/candidate-pipeline/tabs/NotesActivityTab.tsx` — full UI rewrite of the timeline + Add Note section: filter chips, note cards, dual timestamps, metadata rendering, Cmd+Enter, char counter

Total: 1 turn. No new tables, no new files, no design-system token violations (uses existing semantic colors).

---

## How you'll test

1. Open Lead Sheet → change 2 fields → Save → Notes & Activity now shows "Lead sheet updated — 2 fields changed" with the field names listed underneath.
2. Open Process → tick "Asked to move forward" under Trial Close in Step 2 → wait 1s → reopen Notes & Activity → row says "Step 2 — Trial Close: Asked to move forward ✓".
3. Type "Real test note here" in Add Note → press Cmd+Enter → note appears as a tinted card with a "NOTE" tag, easy to tell apart from system rows.
4. Click "Notes" filter chip → only your notes show. Click "Changes" → only Lead Sheet/Process rows show.
5. Hover any row → both "2m ago" and "Jun 22, 5:51 PM" are visible.

Reply **approved** to build, or tell me what to adjust.
