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

Items where work is done or partially done, but a product decision from Brett is needed before continuing.

### #4 — Editable profile fields (Candidate Pipeline → Overview tab)

**Status:** UI shipped. Edits to Name, Email, Phone, Location, Assigned To, and Source persist to the `candidates` table. `source` column was added.

**Open question for Brett — edit propagation back to upstream records:**

Flow in production: Teacher Search → Email Outreach → Candidate Pipeline. The `candidates` row is a copy linked via `prospect_id` back to `teacher_prospects`. Today, edits in Pipeline only update the candidate row, not the original teacher record.

Three options:

- **(a) Keep separate** *(current behavior)* — candidate is the sales working copy; teacher record is cold-outreach source of truth. Clean, but a phone fix here won't show on Teacher Search.
- **(b) Sync all edits back to `teacher_prospects`** — one source of truth. Risk: overwrites verified enrichment data.
- **(c) Sync only safe fields** (phone, city, state) but NOT email — email drives Smartlead deliverability, isolate it from pipeline edits.

Haseeb's gut: (c). Awaiting Brett's pick. Once decided, Part 3 wires in ~10 min.

**Brett message draft (copy-paste ready):** see chat log.
