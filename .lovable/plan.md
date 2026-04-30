## Plan: New Candidate button + modal on Candidate Pipeline

### Button placement (recommendation)

The current header `action` slot renders an orange **"Promote from Prospect"** button that today only fires a toast — it's a dead-end. Standard SaaS pattern (Linear, Pipedrive, HubSpot, Trello) is **one primary "+ New" CTA in the top-right of the header**, with secondary actions either demoted or removed.

**Recommended layout in the header action slot:**

```text
[ Promote from Prospect ]  [ + New Candidate ]
   secondary (outline)        primary (orange #fd7e14)
```

- Keep "Promote from Prospect" but restyle it as a secondary outline button that navigates to `/teacher-prospects` (currently it just toasts, which is broken UX).
- Add **"+ New Candidate"** as the primary orange button on the right — same orange (`#fd7e14`) and `size="sm"` as the existing "Find Prospects" button on the Teacher Prospects page so the two pages feel consistent.
- On mobile both stack full-width like today.

If you'd rather keep things minimal, I can drop "Promote from Prospect" entirely and leave only "+ New Candidate" — that's actually the cleaner pattern. Let me know in feedback if you prefer that; default in this plan is to keep both with the restyle above.

### What gets built

**1. New file: `src/components/candidate-pipeline/NewCandidateModal.tsx`**

Controlled `<Dialog>` modal containing the form. Props: `open`, `onOpenChange`, `teamMembers` (passed from parent so we don't refetch), `onCreated(candidate)` callback.

Fields:
- First Name * (text)
- Last Name * (text)
- Email * (text, email validation)
- Phone (text, optional)
- City * (text)
- State * (text, maxLength 2, uppercased on blur)
- Assigned To * (Select, options = team members from `profiles`)
- Initial Stage * (Select, 7 active stages, default `new_lead`)
- Fit Score (number 0–100, default 50)
- Fit Tag (Select: High Potential / Follow-Up / Not a Fit, default Follow-Up)

Validation with **zod** + react-hook-form (already in deps, used elsewhere). Inline error messages under each field.

Submit handler:
1. Insert into `candidates` with all fields, `status: 'active'`, `current_stage` mapped through existing `uiStageToDb` map.
2. Insert into `candidate_stage_history`: `from_stage: null`, `to_stage: <chosen db stage>`, `changed_by: user.email`, `notes: 'Manually added'`.
3. On success: toast "Candidate added successfully", close modal, call `onCreated` with the inserted row so the parent can optimistically prepend it to `candidates` state — card appears immediately in the right column. Also call `computeMetrics()`.
4. On error: toast error, keep modal open.

**2. Edit `src/pages/CandidatePipeline.tsx`**

- Import the new modal and add `const [newOpen, setNewOpen] = useState(false)`.
- Replace the single `action` button with a small flex container holding the restyled "Promote from Prospect" (now `variant="outline"`, navigates to `/teacher-prospects`) and the new orange "+ New Candidate" button that opens the modal.
- Add `<NewCandidateModal open={newOpen} onOpenChange={setNewOpen} teamMembers={teamMembers} onCreated={handleCandidateCreated} />` at the bottom of the page (next to the existing dialogs).
- Implement `handleCandidateCreated(row)` that maps the inserted DB row through the same shape used in the initial fetch (reuse the mapping logic — extract it into a small helper at top of file) and prepends to `candidates` state, then calls `computeMetrics()`.

### Technical details

- Stage dropdown options come from `STAGES` filtered to exclude `disqualified` (7 active stages). Labels use `s.label`, values use `s.id`, and we translate to DB enum via the existing `uiStageToDb` map already in the page.
- Team member list reuses the `teamMembers` state already loaded for the Owner filter — no extra DB call.
- Email uniqueness: the existing `candidates` table doesn't appear to have a unique constraint on email (the Promote flow handles duplicates by message-sniffing). We'll do the same defensive check: if insert errors mention "duplicate" / "unique", show a friendly "A candidate with this email already exists" toast.
- No schema changes required.
- No changes to board layout, filters, drawer, metrics strip, or Teacher Prospects.

### Files touched

- `src/pages/CandidatePipeline.tsx` (edit — header action slot, add modal, add handler)
- `src/components/candidate-pipeline/NewCandidateModal.tsx` (create)
