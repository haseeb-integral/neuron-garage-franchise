# Candidate Pipeline — New Qualification Categories + Notes

## What we are changing and why
The five star categories in the Qualification tab do not match how the team
actually judges a candidate. We rename them and let a user write a short note
explaining why they gave that star count.

Old label -> New label (same slot, same star value):

| Slot | Old | New |
|---|---|---|
| 1 | Teaching Experience | Responsiveness |
| 2 | Leadership | Experience with Elementary Age Children |
| 3 | Ability to Invest in Neuron Garage | Ability & Willingness to Follow Our Process |
| 4 | Market Fit | Philosophical Alignment |
| 5 | Culture Fit | Market Fit |

The old money hint ("Confirm $1K initial + $15K working capital minimum") is
removed because slot 3 is no longer about money.

## What is affected
- Candidate detail panel > Qualification tab (stars + new note box per row).
- Adjust Scores modal (slider labels).
- Research packet export (label text).
- User Guide / card legend wording that lists the 5 pillars.
- Database: one new column on `candidate_qualification` to hold the 5 notes.

Not touched: composite score math (still average of 5 stars x 20), stage flow,
overrides/audit logic, candidate cards, kanban, any other feature.

## How it fits without breaking anything
- Internal keys (`teaching`, `leadership`, ...) and existing database columns
  stay exactly the same. Only the words on screen change. This means no data
  migration and zero risk to existing scores.
- Notes go in one new JSON column `pillar_notes` on `candidate_qualification`
  (shape: `{ "teaching": "text", ... }`). New column, so nothing existing can
  break. Grants + RLS copied from the table's current rules.

## Phases

**Phase 1 — Rename labels (1 turn)**
One shared label list used everywhere: `PILLAR_LABEL` in
`src/lib/candidateScoring.ts`. Point `QualificationTab`, `AdjustScoresModal`
and `exportResearchPacket` at it, drop the money hint, and update the wording
in User Guide + card legend.

**Phase 2 — Notes per category (1 turn)**
- Migration: add `pillar_notes jsonb not null default '{}'` to
  `candidate_qualification`.
- Qualification tab: a small "Add note" link under each row that opens a text
  box; saves on blur (debounced, same pattern as stars). Saved notes show as
  grey text under the label with an edit pencil.
- Notes also appear in the research packet export.

Total: 2 turns.

## Risks and testing
- Risk is low: no score math change, no column rename.
- Only real risk is stale wording left in a doc page; Phase 1 covers the three
  known spots.
- Test after Phase 1: open a candidate > Qualification tab, confirm the five new
  names, stars still save, composite still updates, Adjust Scores shows new names.
- Test after Phase 2: type a note, close and reopen the panel, note is still there.

## Technical details
- Files: `src/lib/candidateScoring.ts`, `tabs/QualificationTab.tsx`,
  `AdjustScoresModal.tsx`, `exportResearchPacket.ts`, `CardLegendPopover.tsx`,
  `src/pages/UserGuide.tsx`, `src/data/userGuideMarkdown.ts`.
- DB columns unchanged: `teaching_experience`, `leadership`,
  `financial_readiness`, `market_fit`, `culture_fit` (+ their `_override` twins).
