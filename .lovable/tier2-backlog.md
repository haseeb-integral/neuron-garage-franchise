# Tier 2 Backlog

Source: Sam's punchlist, locked 2026-05-26.
Last updated: 2026-05-28 by Lovable.

---

## Safest for Haseeb (pure UI, additive nullable columns, no RLS/Storage/auth changes)

| # | Item | Risk Level | Why Safe |
|---|------|-----------|----------|
| 1 | **Days in Stage filter** (read-only UI) | Low | Pure UI filter, no schema changes |
| 2 | **Other Opportunities textarea** | Low | 1 nullable column add |
| 3 | **Mailing Address fields** | Low | Nullable columns, simple form |
| 4 | **Editable profile fields** | Low | UI binding to existing columns |
| 5 | **Partner toggle conditional fields** | Low | UI + nullable columns |
| 6 | **Notes & Activity 6-step process text + checkboxes** | Low | Reuses existing `candidate_checklist_items` table |
| 7 | **Homework checkboxes for all 6 stages** | Low | Extends existing checklist table |
| 8 | **Compliance Audit Log date fields** | Low | 2 nullable date columns |
| 13 | **Documentation deliverables** | Lowest | Markdown files only |

## Riskier — Brett Only (new tables, RLS, Storage, auth rewrites)

| # | Item | Risk Level | Why Risky |
|---|------|-----------|-----------|
| 9 | **City notes table** | Medium-High | New public-schema table + RLS + GRANTs |
| 10 | **Selection Committee voting without member accounts** | High | Rewrites auth/RLS logic |
| 11 | **Candidate file uploads** | Highest | New Storage bucket + new table + RLS + upload UI — biggest blast radius |
| 12 | **Proof-of-send screenshot upload** | High | Depends on #11's Storage bucket |

## Recommended Execution Order (Safe Group)

```
4 → 2 → 3 → 5 → 8 → 1 → 7 → 6 → 13
```

(Largest writing task — documentation — saved for last.)

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
See prior entry — Overview tab inline edits with locked Verified Email.

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

---

## Deferred (still in safe group, but need design input)

### #7 — Homework checkboxes for all 6 stages
Existing `HomeworkTab` only shows DB-backed checklist for Confirmation. Other stages fall back to a hard-coded 5-item Trial Close list. Extending DB-backed checklists to all stages needs (a) a seeding strategy (auto-create rows on first view? or one-time backfill?), and (b) clarity on whether the existing 5 Trial Close items apply to all stages or whether each stage gets a different checklist. Punted until Brett confirms.

### #6 — Notes & Activity 6-step process
Requires defining the 6 step labels per stage. Sam's notes don't specify them. Punted until labels are confirmed.

### #13 — Documentation deliverables
Per project memory, docs are not updated unless explicitly requested. This backlog file is the exception. Other architecture/handover MDs stay untouched.

