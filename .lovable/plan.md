# Candidate panel — one Activity tab

## What changes and why
The candidate side panel has two overlapping history tabs. We merge them into one clean audit trail.

1. Rename the "Notes & Activity" tab to **Activity**.
2. Move the Stage History timeline into that tab, placed **just above** the "Activity Timeline" block. Then remove the "Stage History" tab.
3. Remove the "Add a note" box, so nothing can be written from this tab. It becomes read-only history.

The existing Notes panel (past notes already saved) stays visible, so no old note is hidden.

## What it touches
- Candidate detail panel tab list (Overview, Lead Sheet, Process, Activity, Committee Votes, Documents).
- The Notes & Activity tab content.
- The Stage History component (reused inside the Activity tab, no longer a tab).

Nothing else changes: no database changes, no scoring, no exports, no other pages. Notes already saved stay in the database and still show in the research packet.

## Risk
Low. UI-only. Risk is a broken tab value if a link points at `stage-history`; the panel just falls back to the default tab, so no crash.

## Phases
- **Phase 1 (1 turn):** rename tab, embed stage history above the Activity Timeline, drop the Stage History tab, remove the add-note box.

## Technical details
- `CandidateDetailPanel.tsx`: change the `notes` trigger label to "Activity", delete the `stage-history` trigger and its `TabsContent`, remove the `StageHistoryTab` import.
- `NotesActivityTab.tsx`: delete the add-note card and its `text`/`posting`/`submit`/`logActivity` usage; render `<StageHistorySection candidate={candidate} />` between the Notes panel and the Activity Timeline card.
- `StageHistoryTab.tsx`: keep the same data fetch; wrap the timeline in a titled card ("Stage History") so it matches the surrounding blocks. Export stays compatible.

## Testing after build
Open a candidate → the tab row shows "Activity" and no "Stage History" tab. Inside: Notes list, then Stage History, then Activity Timeline with its filter chips. No text box to add a note.
