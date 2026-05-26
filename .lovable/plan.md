## Scope

Three small changes + a recap for Brett. No new features.

---

## 1. Remove "public repo" wording

Currently `docs/handover/accounts.md` and `src/pages/Handover.tsx` both say things like *"this file lives in a public GitHub repo"* and *"Repo is currently public — no secrets ever"*. You asked to drop that wording (repo visibility may change; either way it shouldn't be advertised in the doc).

**Edits:**

- `docs/handover/accounts.md`
  - Top banner: change "This file lives in a **public** GitHub repo" → "This file lives in the GitHub repo."
  - GitHub section: remove the "⚠️ Repo is public so Claude/Manus AI can read it" bullet. Keep the "Never commit secrets — use Lovable Cloud secrets instead" rule (rephrased generically).
- `src/pages/Handover.tsx`
  - Alert copy: drop "in our public repo"; just say "and the matching `docs/handover/accounts.md` file in the repo."
  - GitHub platform row: change purpose from "Source code + version history. Repo is public." → "Source code + version history."

## 2. Hold the Google Doc path until Brett confirms

Right now both files name an adhoc path: `Shared with me → Neuron Garage → 00_Admin → Account Inventory`. You want to wait on Brett before locking any path.

**Edits:**

- `docs/handover/accounts.md` — replace the path line with: *"**Vault location:** 🟡 Pending Brett — Brett to confirm the Google Drive folder / Doc that holds the actual credentials. Until then, secrets are not written down anywhere shared."*
- `src/pages/Handover.tsx` — same change in the destructive Alert; the `GOOGLE_DOC_PATH` constant becomes a "pending Brett" string and the surrounding copy is reworded so we are not implying secrets already exist somewhere.

## 3. Mention the future Google Doc connector option (so Brett knows)

Add one short note under §5 (Handover checklist) in `accounts.md` and as a small footer line on the `/handover` page:

> *Future option:* once Brett picks the canonical Google Doc / Drive folder, that Doc can be linked to this app via a Google Docs connector so the app itself can read/write the vault doc directly. Parked until Brett decides.

No connector is wired up now — this is just a flagged option.

## 4. Recap of Tier 1 item #1 for Brett (what exists, where)

This is the part you asked me to "remember." Nothing to build — just listing the artifacts created so far for **"Document Credentials & Logins"** so you can point Brett at them:

| Artifact | Path | Audience |
|---|---|---|
| Handover index (markdown, in repo) | `docs/handover/accounts.md` | Anyone with repo access — names of accounts only, no secrets |
| In-app handover page (admin only) | route `/handover`, source `src/pages/Handover.tsx` | Admin users inside the app, sidebar → "Credentials & Handover" |
| Sidebar link | `src/components/AppSidebar.tsx` (KeyRound icon, utility nav) | All admins |
| Route registration | `src/App.tsx` | n/a |
| Parked fix (separate Tier 1 item) | `docs/pending-approval/2026-05-27-nashville-score-mismatch.md` + `.lovable/parked-fixes.md` | Awaiting Brett's approval — not part of this handover doc |

**What still needs Brett's input (called out in both the .md and the /handover page):**

1. Final Google Doc / Drive folder to use as the vault.
2. Per-API decision (SmartLead, Apify, Firecrawl, Deepgram, Census, BLS, BEA) — transfer / add Sam / leave on Brett's account.
3. Whether to link a Google Doc connector to this app later.
4. (Carry-over reminder) Nashville score-mismatch parked fix.

## Out of scope right now

- Writing actual credentials anywhere.
- Adding the Google Docs connector (waiting on Brett's chosen doc).
- Creating a `neuron-garage` GitHub org / transferring the repo (post-release).
- Any change to `/settings/team` (already source of truth for app logins).

---

## Files touched

- `docs/handover/accounts.md` — wording edits only
- `src/pages/Handover.tsx` — wording edits only

No DB, no routes, no new components, no dependencies.