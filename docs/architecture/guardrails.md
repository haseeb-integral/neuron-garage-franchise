# Guardrails — What Keeps This App Safe

Plain-English overview of the technical safeguards that prevent staff (or a bad day) from breaking production data. Written for Sam and Brett; no code required to read.

---

## 1. Database access control (Row-Level Security)

Every data table in this app is protected by **Row-Level Security (RLS)**. That means even if someone had the database URL and the public key, the database itself refuses to return rows unless the requesting user is a logged-in staff member.

- **Auth-only tables** (candidates, candidate notes, candidate files, committee votes, compliance records, checklists, score overrides, city notes): only authenticated staff can read or write.
- **Public-read tables** (city scores, demographic data): readable without login because they power public dashboards, but writes are still locked down to staff/service roles.
- The `anon` role (used by unauthenticated visitors) has **no write access anywhere**.

**Bottom line:** losing the public API key is not a data breach. Login is the gate.

---

## 2. File uploads (candidate documents)

All candidate file uploads (NDAs, financials, background-check authorizations, FDD proof, FA proof, facility forms, marketing plans) land in a **private Storage bucket** named `candidate_documents`.

- Files are **never publicly readable**. Every download generates a short-lived signed URL (60 minutes) that the staff member's browser uses once.
- The file metadata table (`candidate_files`) uses **soft delete** — clicking the trash icon flags `deleted_at` rather than wiping the row. A developer can restore an accidentally-deleted file by clearing that timestamp.
- 25 MB per-file size cap enforced in the UI to avoid runaway storage costs.

---

## 3. The 16-day FDD lock (regulatory guardrail)

Federal franchise rules require a minimum 16-day cooling-off period between sending the FDD and signing the Franchise Agreement. The app **hard-blocks** advancing a candidate past Step 4 (Immersion) into Step 5 (Confirmation) until 16 days have elapsed from the recorded FDD-sent date.

- The block runs **on the client AND should be enforced on the database side** if/when this app opens to outside committee members. Today, all stage moves go through the same UI path, so the client gate is sufficient.
- Feature flag: `FF_FDD_GATE` in `src/lib/featureFlags.ts`. Flipping to `false` disables the block (use only if the rule changes or for a one-off override).

---

## 4. Manual score overrides leave an audit trail

When a staff member overrides a candidate's qualification score (Tier 3 feature), the original computed score, the new override value, the staff member's email, and the reason are all written to the database. Nothing is silently changed.

---

## 5. Feature flags as kill switches

Risky or recently-shipped features are gated behind boolean flags in `src/lib/featureFlags.ts`. If any of them misbehave on the live site, flipping the flag to `false` instantly hides the UI surface — no deploy required for the rollback decision, just a one-line code change.

Current flags:

- `FF_DOCUMENTS` — candidate Documents tab + dropzone
- `FF_STEP2_UPLOADS` — background / credit check uploads
- `FF_STEP4_UPLOADS` — immersion file uploads
- `FF_COMPLIANCE` — compliance audit log
- `FF_FDD_GATE` — 16-day FDD hard-block
- `FF_SCORE_OVERRIDE` — manual score override

---

## 6. What we deliberately did NOT do (and why it's safe)

- **No destructive migrations on shipped tables.** New features add nullable columns; they never drop or rename existing ones. That means rolling back a UI change never leaves dangling data.
- **No client-side admin checks.** Anyone can read the JavaScript bundle. All "is this user allowed?" decisions happen server-side via RLS policies, never via `localStorage` flags.
- **No anonymous sign-ups.** New staff members are invited; the public sign-up flow is off.
- **No edge function runs without a logged-in staff session**, with the narrow exception of public webhook endpoints (SmartLead, email unsubscribe) which validate their own inbound signatures.

---

## 7. How to break things anyway (so you know what to avoid)

The most dangerous things a staff member with database access can do:

1. **Disable RLS on a table** via the Lovable Cloud console — instantly exposes the table to the public key. Don't do this.
2. **Make the `candidate_documents` bucket public** — exposes every uploaded file. Don't do this.
3. **Delete migration files from the repo** — breaks the ability to rebuild the database from scratch. Don't do this.
4. **Hand-edit production data without a backup** — there is no undo. Use the staff UI instead; it has audit trails.

If something looks wrong, **stop and ask Brett** before clicking through any warning dialog in the Lovable Cloud console.
