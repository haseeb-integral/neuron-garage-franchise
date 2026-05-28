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

*(empty — see Resolved below)*

---

## Resolved

### #4 — Editable profile fields (Candidate Pipeline → Overview tab) ✅

**Shipped 2026-05-28.**

- All profile fields editable in Overview tab (name, phone, location, assigned_to, source, other_email).
- **Verified Email is locked** with a lock icon + tooltip: *"This is the email used in outreach. It cannot be changed to protect against duplicate sends."* — protects Smartlead deliverability.
- New **Other Email** field added (nullable text) on both `candidates` and `teacher_prospects`. Placeholder: *"Add alternate email…"*. Basic email-format validation only.
- **Sync-back to master:** when a candidate row is edited and `prospect_id` is set, safe fields (`first_name, last_name, phone, city, state, other_email`) also update `teacher_prospects`. `email`, `assigned_to`, `source`, `fit_*` are never synced.

Brett's decision (verbatim): client who owns the app should be able to modify all records and have them sync to master with one exception — the original Verified Email used by Smartlead.


