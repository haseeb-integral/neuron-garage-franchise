# 5E — Item 23 Receipt + FDD Delivery Audit Trail

## Goal
A regulator should be able to ask: "When did this prospect get the FDD, and which FDD was it?" We should be able to answer with proof, quickly. Today the app saves an "FDD sent" date and a proof upload. It does **not** tie that date to the exact FDD file. 5E fixes that, and adds the Item 23 e-sign.

## What we will build

**1. Every FDD version is locked and labeled**
- When staff upload an FDD in "Portal files", they must also type its **issuance date**, for example March 1, 2026.
- On upload, we save the file's fingerprint. A fingerprint is a code that changes if even one letter of the file changes. Later we can prove the file was never swapped.
- Old FDD versions are never deleted. They are only retired.

**2. A permanent "FDD delivery log" per prospect**
It is one line per event and can never be edited or deleted:
- **FDD made available**: the date and time the prospect's Step 2 opened with that FDD version.
- **FDD downloaded**: each time the prospect clicks "Download latest FDD", with the version, time, internet address, and browser.
- **FDD emailed by staff**: when staff mark "FDD sent", they pick which FDD version they emailed. The date and the existing proof upload are linked to that version.
- **Item 23 receipt signed**: the version named on the receipt, plus the full audit trail.

**3. Item 23 receipt e-sign (on the prospect's Step 2)**
- The receipt text shows word for word.
- The FDD date and exhibit list fill in automatically from the version that prospect actually received.
- All three sellers are listed and ticked: **Sam Reed, Kaylie Reed, and Skyler Bossen**.
- The prospect fills in: print name, address, and phone. Company name and type are optional.
- They sign the same way as the background form. They get a signed PDF with an audit trail. The PDF is filed in Documents and shown by the "Sent FDD" action for staff.
- **Signing date = FDD received date.** It fills the received date on its own and starts the existing 16-day lock. The lock rule does not change.
- Safety: if a newer FDD was uploaded after the prospect got theirs, the receipt still names the version **they** got, not the newest.

**4. Staff "FDD proof" view**
In the candidate's Step 2, one box shows:
- the FDD version
- when it was sent or made available
- downloads
- when the receipt was signed
- the 16-day clear date

It has a **"Download proof packet (PDF)"** button. The packet holds the full log, the FDD fingerprint, and the signed receipt. You can hand it to a regulator.

## Questions before I build
1. **Skyler's line on the receipt.** The receipt lists each seller with an address and phone. Should Skyler use the same Telluride address, and **512-593-2750**?
2. **Your printed receipt** lists only Sam and Kaylie. Your lawyer should update the master FDD receipt to add Skyler too, so the web and paper versions match.

## Phases
- **5E-1** (about 2 turns): FDD versions with issuance date and fingerprint, the delivery log, download tracking, and staff picking the version on "FDD sent".
- **5E-2** (about 2 turns): Item 23 e-sign, auto received date, signed PDF, the staff proof box and proof packet.

## Will not change
These stay as they are: the 16-day rule and lock, the existing FDD sent date and proof upload (we only link them to a version), the calendar, and the other forms.

## Risks
- Older candidates have FDD dates with no version. They will show "version not recorded" instead of a made-up one.
- The log is append-only in the database, so mistakes cannot be erased, only corrected by a new line. That is on purpose.

## Technical details
- `portal_step_files`: add `fdd_issuance_date date`, `file_sha256 text`. Make it required for new FDD rows (check on insert).
- New `fdd_delivery_events` (candidate_id, fdd_file_id, event: made_available|downloaded|emailed|receipt_signed, at, actor_id, actor_email, ip, user_agent, meta jsonb). SELECT for staff and own prospect. INSERT only via security-definer RPC or edge function. No UPDATE or DELETE policies. GRANTs go in the same migration.
- `candidate_compliance`: add `fdd_file_id` (version sent). Its audit trigger already logs changes.
- Download goes through an edge function `portal-fdd-download`. It logs the event and returns a short-lived signed link.
- The Item 23 form reuses the form engine and `portal-submit-form`, with a new hook that sets `fdd_received_at` from the signing date and inserts the `receipt_signed` event.
