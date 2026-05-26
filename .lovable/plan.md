# Sam's Punchlist — Triage Plan (May 25 Meeting Follow-up)

**Context:** Sam sent Brett a punchlist after the v1 dot-release demo. Brett asked Haseeb to triage into 3 tiers before touching anything. Brett will personally handle Tier 3. Haseeb is approved (after Brett's sign-off) to execute **Tier 1 only**; Tier 2 needs Brett's review of the detailed plan; Tier 3 is hands-off for the AI/Haseeb.

This plan will be saved at `.lovable/plan.md` (overwriting the previous archived-folder cleanup plan, which is already done) so it survives across sessions and either Brett or Haseeb can re-open it any time.

---

## TIER 1 — Low Risk / Low-Hanging Fruit (safe to execute)
Pure UI / label / formatting / additive-field changes. No schema migrations, no scoring logic, no architectural shifts. Worst case = a cosmetic regression that's trivial to revert.

1. **City Search — number formatting:** add `$`, thousands separators, %, etc. to existing numeric displays. Display-only.
2. **Candidate Pipeline — "Days in Stage" filter:** computed from existing `candidate_stage_history.changed_at`. Read-only filter UI.
3. **Candidate Record — rename labels (UI-only, no DB column rename):**
   - "Location Preferences" → "Desired Markets"
   - Financial qualification fields → "Ability to Invest in Neuron Garage"
4. **Candidate Record — add long-form text field:** "Other Opportunities Being Considered" (additive nullable column on `candidate_profiles`, no impact on existing data).
5. **Candidate Record — add Mailing Address fields** (additive nullable columns; street/city/state/zip).
6. **Candidate Record — make existing profile fields editable** in the detail panel (phone, email, source). Form-binding work, no schema change.
7. **Partner toggle reveals spouse/partner contact fields** (additive nullable columns + conditional UI).
8. **Notes & Activity tab — paste Sam's full 6-step process text** as a structured, read-only reference panel with completion checkboxes per action item. Checkboxes reuse the existing `candidate_checklist_items` table pattern already used for the Confirmation stage Homework tab — just seed the new items per stage.
9. **Homework tab — completion checkboxes** for every stage (extend the existing checklist mechanism that already works for Confirmation to all 6 stages).
10. **Compliance Audit Log — add two date fields** on the candidate record: `fdd_sent_date` (already exists in mock data; promote to real column) and `fa_signed_date`. Additive only. The 16-day rule is already implemented in `HomeworkTab.tsx`.

---

## TIER 2 — Medium Risk (needs Brett's sign-off on a detailed plan before building)
Touches storage buckets, file uploads, larger UI flows, or non-trivial new tables. Reversible but requires care.

1. **Manual file uploads on candidate records** — needs a new Supabase Storage bucket + RLS policies + a `candidate_files` table. Same pattern for Step 4 facility prospect form / marketing plan uploads and Step 2 background/credit authorization uploads.
2. **Compliance Audit Log — proof-of-send screenshot upload** for FDD sent + FA signed (depends on #1 above).
3. **City Search — internal notes/comments per city** — new `city_notes` table with RLS, plus UI panel.
4. **Selection Committee voting simplification** — let a staff user manually record votes on behalf of committee members without those members having accounts. Schema-wise the `candidate_votes` table already supports a free-text `voter` field, but the UI/UX rework is non-trivial and changes a governance flow.
5. **Documentation deliverables for Sam** (AI tools/models used, data flow & architecture, integrations/enrichment, existing guardrails, all prompts & AI workflows, ownership/credentials handoff). Not code — but high-effort, high-visibility, and we should agree on scope/format with Brett before producing it.

---

## TIER 3 — High Risk / Brett Handles Personally (DO NOT TOUCH)
Changes scoring math, candidate scoring semantics, or the pipeline architecture itself.

1. **Manual override of candidate scores** — changes the meaning of the qualification score and how it relates to the composite. Scoring is the heart of the product.
2. **Show composite score on pipeline cards** — looks cosmetic but it's a product/strategy decision about what number we're publicly committing to per candidate; Brett should decide.
3. **Account/credentials/ownership transfer to Sam** — Lovable project ownership, Supabase project ownership, domain, third-party connectors (SmartLead, etc.). Brett-only.
4. **Anything not explicitly listed in Tier 1 or Tier 2 above** that turns out, on closer reading, to alter the database structure, scoring, or architecture — escalate to Brett rather than guess.

---

## Where this plan lives
- This document → `.lovable/plan.md` (single source of truth in repo; survives sessions; either Brett or Haseeb can re-open).
- Will be updated as Tier 1 items are completed (checkboxes ticked) and as Tier 2 items get detailed sub-plans approved by Brett.

## Proposed next step
On approval, I will:
1. Write this triage to `.lovable/plan.md`.
2. Execute **Tier 1 only**, item by item, with one focused commit-equivalent change per item so anything can be reverted individually.
3. Stop and return to you with a per-Tier-2-item detailed plan (schema, RLS, UI) for Brett's review before touching Tier 2.
4. Never touch Tier 3.

Reply "approve" (or edit any tier assignment) and I'll proceed.
