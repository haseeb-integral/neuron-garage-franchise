# FDD Audit Trail Report (Candidate Pipeline)

## What we are building and why
A new **"FDD Audit Report"** button at the top of the Candidate Pipeline. It opens a window with one table (one row per prospect who was sent an FDD). You can download it as **CSV** (opens in Excel) and as **PDF** (good to hand a regulator).

Right now each prospect has its own proof packet. There is no single list for all prospects. This report fills that gap. It only *reads* data. It changes nothing.

## Columns in the report
| Column | Where it comes from |
|---|---|
| Prospect name, email | Candidate card |
| FDD version name | FDD file name + issuance date (e.g. "FDD 2026 — issued Mar 1, 2026") |
| FDD file fingerprint | Saved SHA-256 code (proves which exact file) |
| How the FDD was sent | "Email link (app)" for app sends; "Recorded by staff" when staff typed the date manually; "Portal download" when first opened in the portal |
| Date FDD sent | Saved FDD sent date |
| Proof of sending | Email provider accepted the email (date/time + recipient), and/or staff proof file name, and the count of download events |
| Item 23 received date | Saved FDD received date |
| How Item 23 was received | "E-signed in portal" or "Recorded by staff" (paper/proof file) |
| Proof of Item 23 | Signing time, IP address, signed PDF fingerprint, or staff proof file name |
| Item 23 signature | The typed signature name and signing date/time |
| Franchise agreement signed date | Saved franchise agreement date (blank if not yet) |
| Days FDD sent to agreement signed | Simple count of calendar days. Blank if no agreement yet. Shown in red if under 14 days |

Prospects can have more than one FDD send (resends). The table shows the first send, with a note like "+1 resend". The PDF lists every send under the row.

## Filters
- Date range (FDD sent date)
- Search by name
- "Only prospects with signed agreement"

## Who can see it
Staff only (admins and managers). Prospects can never reach it. Database rules already block prospects from these records.

## Phases
**Phase 1 — Report window + CSV download** (about 1–2 turns)
- New button and window in the pipeline.
- Reads existing tables: candidates, compliance dates, FDD sends, FDD delivery events, Item 23 signatures, FDD file list.
- A small test for the day-count rule and the "first send" rule.

**Phase 2 — PDF download** (about 1 turn)
- Same table, landscape PDF, with title, date made, who made it, and every send listed.

## What will NOT be touched
- No database changes.
- No changes to sending FDDs, Item 23 signing, the 16-day rule, or the per-prospect proof packet.
- Email outreach, portal, and forms stay as they are.

## Risks
- Old prospects recorded before the app sent FDDs will show "Recorded by staff" with less proof. That is honest, not a bug.
- If a lot of prospects exist, loading may take a second. We load only staff-visible rows.

## What to test
- Open the report, check a known prospect's dates match their card.
- Download CSV, open in Excel.
- Check day count for a prospect with an agreement date.
- Sign in as a prospect and confirm there is no way to reach it.

## Technical details
- New `src/components/candidate-pipeline/FddAuditReportDialog.tsx`, pure builder `src/lib/fddAuditReport.ts` (+ test), button in the pipeline header.
- Data: `candidate_compliance` (fdd_sent_at, fdd_received_at, fa_signed_at, fdd_file_id, proof file ids), `fdd_email_sends` (status=sent), `fdd_delivery_events`, `candidate_portal_signatures` where form_key = item23.
- PDF via existing pdf approach used by `compliancePacketPdf.ts`.
