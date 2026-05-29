## Decisions locked

- **Colors:** All orange CTAs in the Candidate Pipeline (card "Start Onboarding", modal "Add Candidate", drawer accents) → blue `#174be8` to match City Search. Local override only — no global token swap.
- **Modal + drawer chrome:** Recolor to match City Search tones (`#f7faff` header strip, `#e3e8ef` borders, `#ffffff` body, `#07142f` titles semibold, `#526078` labels, focus ring `#174be8`).
- **Email field (safe path, no schema change):**
  - Rename modal field from `Email *` → **`Contact Email *`**
  - Helper text: _"This will be saved as the candidate's primary contact email. It is not auto-verified."_
  - Keep writing to `candidates.email`
  - Stamp `email_source = 'manual'` on insert
  - Auto-promoted rows already have a different source — drawer will show 🔒 lock only when `email_source != 'manual'`, and the unlocked pencil icon when `email_source = 'manual'`
- **Days definition: Option A — days since last entered current stage.** Honest reason: I searched the full chat history. Brett never spelled out A/B/C/D. Sam's punchlist only said _"Add a Days in Stage filter"_ with no formula. The existing `Fresh ≤3 / Watch 4–7 / Stalled 8+` filter only makes sense if "days" resets when the card enters a new column — otherwise every old candidate is permanently "Stalled" regardless of recent activity. Option A is the SaaS-standard Kanban convention (Pipedrive, HubSpot, Trello Aging) and the only one consistent with the Fresh/Watch/Stalled buckets already shipped. Brian Thompson showing **Day 0** today is correct: he was dragged back into FDD Review at 02:50 UTC today.
- **Out of scope:** scoring math, schema migration for verified-vs-other email split, City Search page.

## Schema check

The DB already has the `candidates` table with an `email` column. I need to confirm an `email_source` column exists before the build step. If it doesn't, the build step will add a tiny migration:

```sql
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS email_source text NOT NULL DEFAULT 'imported';
-- 'imported' = came from teacher/outreach pipeline (default, shows 🔒)
-- 'manual'   = typed by hand in the New Candidate modal (shows pencil)
-- 'verified' = future state if we wire an actual verification step
```

This is purely additive, default-safe for existing rows, no RLS/grant changes needed (column inherits table grants).

## Files to touch

- `src/components/candidate-pipeline/CandidateCard.tsx` — "Start Onboarding" button orange → blue
- `src/components/candidate-pipeline/NewCandidateModal.tsx` — submit button blue, rename `Email *` → `Contact Email *`, add helper text, add `email_source: 'manual'` to insert payload, restyle modal chrome
- `src/components/candidate-pipeline/CandidateDetailPanel.tsx` — drawer chrome to City Search tones, any orange accents → blue, conditionally show lock vs pencil based on `email_source`
- `src/pages/CandidatePipeline.tsx` — no logic change for days (Option A confirmed)
- One small migration if `email_source` column missing

## Smoke test after build (959px viewport)

1. Open New Candidate modal → field reads "Contact Email *" with helper line, "Add Candidate" button is blue
2. Submit a test candidate → row inserted with `email_source = 'manual'`, drawer shows pencil (not lock) on email
3. Open Brittany Cruz drawer → email shows 🔒 (auto-promoted, unchanged)
4. Cards in Signing column → "Start Onboarding" button is blue, hover state blue-darker
5. No orange anywhere in pipeline except the Day-chip warning tone (intentional)
6. Brian Thompson still Day 0 in FDD Review (Option A, correct)

## Approval to proceed

Switching to build mode will execute, in order:
1. Migration to add `email_source` column (only if not already present)
2. Code edits to the 3 files above
3. Smoke test pass

Confirm and I'll ship.