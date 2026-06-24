
# Plan — Fix SAS export + add per-card PDF download

## Part 1 — Why the PDF still shows only one site (diagnose + fix)

The code in `handleExport` already loops over **every** slot (scored or not) and the brief page already loops over `candidates`. So on paper it should work. Since you still see only one site in the PDF, the bug is somewhere else. I will not guess again — I will reproduce it first, then fix the real cause.

**Phase 1A — Reproduce with Playwright (1 turn, no code change)**
- Open `/site-analysis` in a headless browser.
- Confirm how many cards are on screen.
- Click **Export Site Report (PDF)**.
- Capture the new tab URL, read `window.opener.__nrgSasBrief` payload, count `candidates.length`.
- Read console + network for errors.
- Screenshot the brief page itself and count the per-site sections.

This tells us exactly where cards are getting lost: at export time (slots empty), at handoff time (payload truncated), or at render time (brief page filtering).

**Phase 1B — Fix the real cause (1 turn)**
Based on Phase 1A findings, fix the single real bug. Most likely candidates:
- The brief page may be filtering by `composite != null` in a section I missed.
- `top` / `topOrFallback` may be the only one rendered in the cover, and the per-site loop may be gated.
- `scored` array in `SiteAnalysis.tsx` may be filtered upstream by another memo.
- Map PNG fetch may throw for one card and the whole `Promise.all` rejects, falling back to a stale payload.

I will not touch scoring math, saved-sites loader, MV page, or DB.

## Part 2 — Per-card PDF download

**Best practice (from common SaaS report UIs — Notion, Linear, Stripe Dashboard):**
A **split button**: main button "Export All (PDF)" + a chevron that opens a dropdown listing each card by name with a download icon. This is the cleanest pattern — one button slot, no clutter, scales from 1 to 4 cards.

Alternative considered: a small "⬇ PDF" icon on every card header. Rejected because it duplicates UI and clutters the card. Split button is the standard.

**Implementation:**
- Replace the single Export button in `src/pages/SiteAnalysis.tsx` with a shadcn split button: left half = "Export All (PDF)" (existing behavior), right half = chevron opening a `DropdownMenu`.
- Dropdown items: one row per slot showing the school name + a download icon. Clicking calls the same `handleExport` but with a `singleId` filter, so only that one card goes into the payload.
- Reuse the same brief page — it already handles a single-candidate payload (the cover, per-site sections, and the comparison table all degrade gracefully to 1 site).
- The brief tab title already uses the top card's name, so a single-card export will be titled correctly.

**Files touched:**
- `src/pages/SiteAnalysis.tsx` — split button UI, `handleExport(singleId?: string)` signature.
- No changes to `SiteBrief.tsx`, `SitePackDocument.tsx`, scoring, or DB.

## Out of scope
Scoring math, MV page, saved-sites drawer, edge functions, schema.

## Risk
Low. Part 1 is a targeted bug hunt with no scope creep. Part 2 is pure UI on one file.

## Turns estimate
- Phase 1A diagnose: 1 turn
- Phase 1B fix: 1 turn
- Part 2 per-card dropdown: 1 turn
Total: **3 turns**.

## Approval
Please approve and I will start with Phase 1A (Playwright reproduction, no code change).
