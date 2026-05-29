# Tier 2 Backlog

> **This file is SEPARATE from Sam's V1.0 punch list.** Sam's 4-item V1.0 punch list (Desired Markets rename / number formatting / Guardrails docs / manual committee votes) is **100% shipped and signed off**. This Tier 2 file tracks the broader backlog Haseeb + Lovable derived from Sam's original full punchlist. Items **#9 (City notes)** and **#12 (Proof-of-send)** remain OPEN as future work — do not delete this file until they are addressed or explicitly dropped.

Source: Sam's punchlist, locked 2026-05-26.
Last updated: 2026-05-29 by Lovable.

---

## Safest for Haseeb (pure UI, additive nullable columns, no RLS/Storage/auth changes)

| # | Item | Status |
|---|------|--------|
| 1 | Days in Stage filter (read-only UI) | ✅ Shipped |
| 2 | Other Opportunities textarea | ✅ Shipped |
| 3 | Mailing Address fields | ✅ Shipped |
| 4 | Editable profile fields | ✅ Shipped |
| 5 | Partner toggle conditional fields | ✅ Shipped |
| 6 | Notes & Activity 6-step process text + checkboxes | ✅ Shipped |
| 7 | Homework checkboxes for all stages | ✅ Shipped |
| 8 | Compliance Audit Log date fields | ✅ Shipped |
| 13 | Documentation deliverables | ✅ N/A (see Resolved) |

**All safe-group items are complete.** Recommended execution order is preserved below for historical reference only.

```
4 → 2 → 3 → 5 → 8 → 1 → 7 → 6 → 13   (all done)
```

## Riskier — Brett Only (new tables, RLS, Storage, auth rewrites)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9 | **City notes table** | ❌ Open | New public-schema table + RLS + GRANTs |
| 10 | **Selection Committee voting without member accounts** | ✅ Shipped 2026-05-29 | Manual committee vote entry (Change #4), confirmed pass by Haseeb |
| 11 | **Candidate file uploads** | ✅ Shipped | FF_DOCUMENTS / FF_STEP2_UPLOADS / FF_STEP4_UPLOADS all enabled, Storage bucket `candidate_documents` live |
| 12 | **Proof-of-send screenshot upload** | ❌ Open | Depends on #11's Storage bucket (now available) |

## Tier 3 Items (Stay with Brett — not in this backlog)

- Manual score override
- Composite on Kanban
- Credentials / ownership transfer
- DB structure changes

These are explicitly excluded from Tier 2 execution.

---

## Awaiting Brett Approval

*(empty)*

---

## Resolved

### #4 — Editable profile fields ✅ (shipped 2026-05-28)
Overview tab inline edits with locked Verified Email.

### #2 — Other Opportunities textarea ✅ (shipped 2026-05-28)
New `candidates.other_opportunities text` column. Textarea card on Overview tab with Save/Cancel. Candidate-only (not synced to prospects).

### #3 — Mailing Address ✅ (shipped 2026-05-28)
New `mailing_street / mailing_city / mailing_state / mailing_zip` on both `candidates` and `teacher_prospects`. Address card on Overview tab. Address edits sync back to the master prospect record via existing `SYNC_FIELDS` mechanism.

### #5 — Partner toggle + conditional fields ✅ (shipped 2026-05-28)
New `partner_involved bool` + `partner_name / partner_email / partner_phone` on `candidates`. Checkbox reveals/hides the three inputs. Turning the toggle off clears the fields on save. Candidate-only.

### #8 — Compliance Audit dates ✅ (shipped 2026-05-28)
New `background_check_completed_at date` + `credit_check_completed_at date` on `candidates`. Two shadcn date pickers on Overview. Inline save (no Save button — selecting/clearing a date persists immediately).

### #1 — Days in Stage filter ✅ (shipped 2026-05-28)
New `daysInStageFilter` chip group on the Pipeline page (All / Fresh ≤3 / Watch 4–7 / Stalled 8+). Pure client-side filter, persisted in the existing Zustand store (bumped to v2). Counts toward "Clear filters".

### #6 — Notes & Activity 6-step process ✅ (shipped)
`STAGE_PROCESS_ROADMAP` in `src/data/pipelineData.ts` defines 6 steps for each of the 7 stages. `NotesActivityTab` renders them through `ChecklistSection` (kind="process"), persisted in `candidate_checklist_items`. Verified in code 2026-05-29.

### #7 — Homework checkboxes for all stages ✅ (shipped)
`STAGE_HOMEWORK` in `src/data/pipelineData.ts` covers every stage. `HomeworkTab` lazy-seeds rows from the seed list the first time a stage is opened with zero rows. `CandidatePipeline` carries homework items forward on stage moves. Verified in code 2026-05-29.

### #13 — Documentation deliverables ✅ N/A
Per project memory, docs are not auto-updated unless explicitly requested. This backlog file is the agreed exception. No standalone deliverable.
