
# Brett's decision — wire it up

Brett picked option (c) with a twist: client owns all edits and they sync to the master DB, **except** the original email (Smartlead-protected). Add a second "Other Email" field for emails collected later (phone, Zoom, reply).

---

## Backend (one migration)

Add `other_email` column (nullable text) to both tables:
- `public.candidates.other_email`
- `public.teacher_prospects.other_email`

No rename of existing `email` column — we just treat it as "Verified Email" in the UI.

## Frontend — Pipeline → Overview tab

`src/components/candidate-pipeline/tabs/OverviewTab.tsx`

1. **Email row → relabel "Verified Email"**
   - Remove edit affordance (no pencil, no click-to-edit)
   - Add small `Lock` icon (lucide-react) next to the value
   - Tooltip on hover: *"This is the email used in outreach. It cannot be changed to protect against duplicate sends."*

2. **New "Other Email" row** (right after Verified Email)
   - Editable like Phone (click-to-edit, Enter to save, Esc to cancel)
   - Placeholder when empty: *"Add alternate email…"*
   - Basic email format validation only (regex), no uniqueness check

## Frontend — sync-back wiring

`src/pages/CandidatePipeline.tsx` → `onSaveProfile` handler

After updating the `candidates` row, if `candidate.prospect_id` exists, also `UPDATE public.teacher_prospects SET ... WHERE id = prospect_id` for the **safe fields only**:

```
first_name, last_name, phone, city, state, other_email
```

**Never** sync `email` (Smartlead protection). `assigned_to` and `source` are candidate-only concepts, so they don't sync either.

If the teacher_prospects update fails, log it but don't block the candidate save (candidate is source of truth for pipeline UI).

## Type updates

- Extend `Candidate` in `src/data/pipelineData.ts` with `otherEmail?: string`
- Map `other_email` ↔ `otherEmail` in the load + save paths

## Tier 2 backlog update

Move #4 out of "Awaiting Brett Approval" → mark as shipped with the resolution recorded:
> Brett picked: lock Verified Email + add Other Email + sync safe fields back to teacher_prospects.

---

## Out of scope (intentional)

- Teacher Search detail panel / Email Outreach UI updates to show `other_email` — separate ticket, not asked for here
- Verified-email change workflow (admin override) — not requested
- Backfilling `other_email` from anywhere — column starts empty

---

## Files touched

- new migration: add `other_email` to `candidates` + `teacher_prospects`
- `src/data/pipelineData.ts` — add `otherEmail` to `Candidate`
- `src/pages/CandidatePipeline.tsx` — load + sync-back in `onSaveProfile`
- `src/components/candidate-pipeline/tabs/OverviewTab.tsx` — lock Verified Email, add Other Email row, tooltips
- `.lovable/tier2-backlog.md` — mark #4 resolved
