# Candidate Overview tab clean-up + move Qualification into it

## What changes and why
The Overview tab has two cards you don't need, and the star scoring lives in a separate tab. We will slim down Overview and put the scoring right on it, then remove the Qualification tab.

## Changes

1. Remove "Other Opportunities Being Considered" card from Overview.
2. Remove "Compliance Audit" card from Overview.
3. Move scoring onto Overview, placed after Contact Information:
   - Composite Score bar
   - The five star rows (Responsiveness, Experience with Elementary Age Children, Ability & Willingness to Follow Our Process, Philosophical Alignment, Market Fit)
   - The per-score notes ("+ Add note") that we just built
4. Remove the "AI Reasoning" blue box.
5. Remove the "Adjust Scores" button and its pop-up modal (and the "Reset to calculated" button that only exists to undo it). Scores are edited by clicking stars, and each score has its own editable note.
6. Delete the "Qualification" tab from the candidate panel.

## What is affected
- Pages/components: Candidate Pipeline detail panel, Overview tab, Qualification tab, Adjust Scores modal.
- Data: no database change. Scores still save to the same `candidate_qualification` row (same columns), notes still save to `pillar_notes`.
- Unchanged: Lead Sheet, Process, Notes & Activity, Stage History, Committee Votes, Documents, card badges, Export Packet (it already prints scores + notes).

## Risks and care
- The "Adjust Scores" override values already saved in the database stay in the row. Because the override UI is gone, the app will read plain star scores going forward. If any candidate currently has an override, their shown score may change back to the star value. Low risk on a pre-release app, but worth knowing.
- The card/table score badge keeps working because it reads the same in-memory scores the stars update.

## Technical detail
- `OverviewTab.tsx`: drop `OtherOpportunitiesCard` and `ComplianceAuditCard` usage plus their function bodies; render a new `QualificationSection`.
- Extract the score UI from `tabs/QualificationTab.tsx` into `QualificationSection.tsx` (load/save logic kept as-is, minus override state, `AdjustScoresModal`, reset handler, AI Reasoning block).
- `CandidateDetailPanel.tsx`: remove the Qualification tab trigger + content; keep `onUpdate` wiring so the panel state still refreshes.
- Delete `tabs/QualificationTab.tsx` and `AdjustScoresModal.tsx` if unused elsewhere.

## Phases and turns
- Phase 1 (1 turn): all of the above, since it is one screen.

## What to test
Open a candidate → Overview: no "Other Opportunities", no "Compliance Audit", scores appear under Contact Information, click stars to change, add a note, close and reopen to confirm it saved, and confirm the Qualification tab is gone.
