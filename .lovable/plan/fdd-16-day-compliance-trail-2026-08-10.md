# FDD 16-Day Compliance Trail

## What exists today (checked in the code)

- Table `candidate_compliance` already stores `fdd_sent_at`, `fa_signed_at`, an override flag with reason, and who set it.
- Every change to those fields is written to `candidate_compliance_audit` by a database trigger. So we already have a change history.
- The Documents tab has two upload boxes: "FDD proof of delivery" and "FA signed copy". They are optional today.
- A 16-day block already exists, but it only stops a candidate from leaving the **FDD Review** stage. It does not check the signing date itself, and it never checks that proof was uploaded.

## The gaps a regulator would find

1. A date can be typed in with no proof attached. Nothing forces the screenshot/PDF.
2. The 16 days are counted from **sent**, but the rule is really about when the prospect **received** it. We only store one date.
3. The signing date is free-typed. Someone can enter a signing date 5 days after the FDD date and nothing stops them.
4. Override exists, but a candidate can be moved around it without a strong record tied to the proof file.

## Recommended approach

Keep your idea (upload the email proof), and add three more protections so the trail is complete.

### 1. Proof is required, not optional
"FDD sent date" cannot be saved unless at least one file is attached in the `fdd_proof` box. Same rule for the signing date and the `fa_proof` box. The uploaded file is linked to the date, so the audit row points at the exact file.

### 2. Store two dates: sent and received
- **FDD sent date** — from the screenshot of the sent email.
- **FDD received/acknowledged date** — defaults to the sent date, but can be set later if the prospect confirmed receipt on a different day.
The 16 days count from the later of the two. This is the conservative reading of the rule.

### 3. Hard block on the signing date itself
When someone enters a Franchise Agreement signed date, the app compares it to the FDD date. If the gap is under 16 full days, the save is refused with a clear message. Same check runs again in the database, so it cannot be bypassed by a stale browser tab. The existing stage-move block stays.

### 4. A one-click "Compliance Packet"
A button that produces a single PDF per candidate: candidate name, FDD sent date, received date, signing date, days elapsed, who entered each date and when, any override with its reason and approver, and thumbnails/links to the proof files. This is what you hand a regulator.

### 5. Override becomes admin-only and loud
Only an admin can turn the override on, a reason is required, and the packet prints the override in red at the top so nothing is hidden.

## Phases

| Phase | Work | Turns |
|---|---|---|
| 1 | Database: add `fdd_received_at`, `fdd_proof_file_id`, `fa_proof_file_id`; trigger that refuses a signing date under 16 days; audit covers the new fields | 1 |
| 2 | Compliance panel UI: two dates, required proof upload, live "X days remaining" counter, blocked-save messages | 1 |
| 3 | Tighten stage gates: use the later of sent/received; admin-only override | 1 |
| 4 | Compliance Packet PDF export | 1–2 |

## Risks and what stays untouched

- Existing candidates may have an FDD date with no proof file. Those stay valid and are shown as "legacy — proof missing" rather than being broken.
- Nothing outside the compliance panel, the stage-move check, and the Documents tab changes. Scoring, pipeline stages, and the qualification process are not touched.
- Testing after each phase: save a date with no file (should refuse), enter a signing date 5 days out (should refuse), 20 days out (should pass), turn on override as a non-admin (should refuse), export the packet.

## How the 16 days are counted (decided)

The FTC rule is 14 full days. We use 16 calendar days to stay safely on the conservative side.

- **Day 1 = the day the FDD was sent.**
- Signing is blocked until day 16 has passed, so the earliest allowed signing date is **day 17** (16 full calendar days after the send day).
- Example: FDD sent Monday March 2 (day 1) → earliest signing date is Tuesday March 17.
- The same math is used in three places so they can never disagree: the countdown shown in the compliance panel, the stage-move block, and the database check on the signing date.

