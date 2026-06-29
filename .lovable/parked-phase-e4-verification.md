# Parked: Phase E4 — Provider Evidence verification buttons

**Status:** Parked by Haseeb on 2026-06-29. Do NOT start until Haseeb says all other in-progress phases are done.

## Where it lives
`src/pages/ProviderEvidence.tsx` → `EvidenceDrawer` → "Verification" section.

The 4 buttons (`Needs review`, `Verify`, `Reject`, `Edit price`) are intentionally `disabled` placeholders shipped in Phase E3. The note under them already says "Actions are read-only in this phase."

## What Phase E4 will do (when un-parked)

**E4.1 — DB**
- New table `mvs_provider_verifications`:
  - `provider_id` FK → `mvs_providers`
  - `status`: `needs_review` | `verified` | `rejected`
  - `price_min_override`, `price_max_override` (nullable)
  - `note` text
  - `verified_by`, `verified_at`
- RLS + GRANTs per project rules.

**E4.2 — Wire buttons**
- Verify / Reject / Edit price write to the new table.
- Drawer reflects saved state on reopen.
- Toasts on success/error.

**E4.3 — Surface in grid (optional)**
- New `Status` column + filter chip.
- CSV export includes status + overrides + note + verifier.

## Do NOT touch
- MVS scoring math, weights, freshness.
- discover / classify / extract edge functions.
- Live City Deep Dive cards or composite MVS score.

## Trigger to start
Haseeb says: "all other phases done, start E4."
