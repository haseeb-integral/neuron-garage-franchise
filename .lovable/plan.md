# Sam's Punchlist — Triage Plan v2 (Merged: Lovable + Manus AI)

**Context:** Sam's May 25 punchlist, triaged by two AIs (Lovable + Manus) and reconciled. Brett handles Tier 3; Tier 2 needs Brett's per-item sign-off; Haseeb is approved to execute the **intersection of both AIs' Tier 1** only.

---

## ✅ TIER 1 — APPROVED FOR HASEEB TO EXECUTE NOW
**Definition:** items that BOTH Lovable and Manus independently classified as safe/low-risk. Pure UI label + formatting. No DB schema changes, no scoring, no architecture.

1. **City Search — number formatting** — add `$`, thousands separators, `%` to existing numeric displays. Display-only.
2. **Rename "Location Preferences" → "Desired Markets"** — UI label only, DB column unchanged.
3. **Rename financial qualification fields → "Ability to Invest in Neuron Garage"** — UI label only, DB column unchanged.

That's it for Haseeb-execute. All three are pure presentation, individually revertable, zero data risk.

---

## ⏸️ TIER 1 — DEFERRED (one AI flagged, the other didn't agree)
Haseeb does NOT touch these until Brett approves.

- **Documentation deliverables for Sam** (prompts, AI workflows, architecture overview). Manus marked Tier 1; Lovable marked Tier 2 because writing accurate architecture docs requires real understanding and risks misrepresenting the system to the client. → **Treat as Tier 2.**
- **Credentials & ownership handoff to Sam.** Manus marked Tier 1; Lovable disagrees — this is a Brett-only governance decision (transferring Lovable/Supabase/Resend ownership). → **Tier 3, Brett only.**

---

## 🟡 TIER 2 — Medium Risk (needs Brett's per-item sign-off before building)
Reversible but touches schema, storage, or non-trivial flows.

1. **Days-in-Stage filter** on Candidate Pipeline (computed from `candidate_stage_history`).
2. **Add long-form field "Other Opportunities Being Considered"** (additive nullable column on `candidate_profiles`).
3. **Add Mailing Address fields** (additive nullable columns).
4. **Make existing profile fields editable** (phone, email, source) in the detail panel.
5. **Partner toggle reveals spouse/partner contact fields** (additive nullable columns + conditional UI).
6. **Notes & Activity tab — paste Sam's full 6-step process** as a structured reference panel with per-action checkboxes (reuses existing `candidate_checklist_items` table).
7. **Homework tab — completion checkboxes for every stage** (extend the existing checklist mechanism that already works for Confirmation to all 6 stages).
8. **Compliance Audit Log — add `fdd_sent_date` + `fa_signed_date` columns.** The 16-day FDD lock rule is **already implemented** in `HomeworkTab.tsx` — only the date fields are new.
9. **Manual file uploads on candidate records** — new Supabase Storage bucket + RLS + `candidate_files` table. Covers Step 2 BG/credit authorizations and Step 4 facility/marketing uploads.
10. **Compliance Audit Log — proof-of-send screenshot upload** for FDD/FA (depends on #9).
11. **City Search — internal notes/comments per city** — new `city_notes` table with RLS + UI panel.
12. **Selection Committee voting simplification** — staff records votes on behalf of committee members without accounts (uses existing `candidate_votes.voter` free-text field; UX rework only).
13. **Documentation deliverables for Sam** (moved from Tier 1 deferred — see above).

---

## 🔴 TIER 3 — Brett Personally / DO NOT TOUCH
Changes scoring math, public-facing scoring semantics, or transfers ownership.

1. **Manual override of candidate qualification scores** — changes scoring semantics.
2. **Composite score on Kanban cards** — product/strategy decision about what number we publicly stake per candidate.
3. **Account/credentials/ownership transfer to Sam** — Lovable, Supabase, Resend, SmartLead, domain.
4. **Anything not explicitly listed above** that on closer reading alters DB structure, scoring, or architecture — escalate to Brett.

---

## Execution rules for this session
1. Haseeb (on Brett's approval) executes Tier 1 (3 items) one at a time, each independently revertable.
2. Stop after Tier 1. Do not start any Tier 2 item without Brett naming it explicitly.
3. Tier 3: never touched by AI/Haseeb.

## Where this lives
`.lovable/plan.md` — single source of truth across sessions.
