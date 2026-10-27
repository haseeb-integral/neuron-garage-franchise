# Phase 5 — Prospect Web Forms and E-Sign

## The big idea
Each form becomes a calm, guided web page inside the prospect's step. It is not one long wall of boxes. The prospect fills in a few questions at a time. Their work saves on its own. They can leave and come back. When they finish, they review and sign. Staff see every answer on the candidate's card.

## Which form goes where
These match the "After this call" lists the portal already shows:

| Step | Checklist item | Form |
|---|---|---|
| 1 | Complete the Request for Consideration | Request for Consideration (3 pages) |
| 2 | Complete the Background, Credit, and Funding form | Background, Credit, and Funding (1 page, with the legal authorization) |
| 2 | Sign and return the Item 23 receipt | FDD Item 23 Receipt (FDD dated March 1, 2026) |
| 3 | Complete the facility prospect form | Facility Prospect Form (3 pages) |

"Assigned" means the step is open. When staff move the candidate into that step, the form shows up there on its own. Staff do not have to tick anything. This is the same rule as the files.

## What the prospect sees (UX)

**1. On the step card**
The checklist item becomes a small form row:
- the form name
- a status chip: "Not started", "In progress — 40%", or "Submitted ✓"
- the due line from your PDF, for example "Due 1 day before your next call". If a call is booked, it shows the real date.
- one button: "Start", "Continue", or "View"

**2. The form screen (one form at a time, full page)**
- A thin progress bar at the top, for example "Section 2 of 6 — Work Experience".
- One section per screen, with Back and Next buttons. Each screen has about 3 to 8 questions. This keeps it from feeling overwhelming.
- Autosave (it saves by itself) about 1 second after typing stops. A small "Saved just now" note shows it worked. If the connection drops, a "Not saved — retrying" note shows.
- Boxes we already know are filled in for them, like name, email, phone, and city. They can change them.
- Lists that can grow:
  - Schools start with 3 cards, plus an "Add another school" button, up to 10.
  - Work experience starts with 1, plus "Add another job", up to 3.
  - References always show 3.
- Plain helper text comes word for word from your PDFs, like "You don't need to contact any schools yet."
- Required boxes are marked. Missing ones are listed only at review time, never with red errors while they type.
- The phone layout is one column, with large tap targets.
- "Save and finish later" sends them back to their path. Their place is remembered.

**3. Review and sign**
- A last "Review your answers" screen shows each section with an "Edit" link.
- Then the signature box, then Submit.
- After submitting, the form locks, the checklist item ticks itself, and they see "Thank you — the team has it." Staff can reopen a form if a change is needed.

## The compliant e-signature (Background, Credit, and Funding)
This follows the U.S. e-signature laws, called ESIGN (a federal law) and UETA (a state law most states use). These laws say a typed signature counts if all of these are true. Here is how we cover each one:

1. **They agree to sign electronically.** Before the form, a short "Electronic records and signatures" notice says:
   - they can ask for a paper copy instead
   - they can take back their OK
   - how to reach you

   They tick "I agree to use electronic records and signatures."
2. **They mean to sign.** The authorization sits on its own screen, alone and easy to read. They type their full legal name, tick "I authorize these checks and agree my typed name is my signature," and press "Sign and Submit." The button stays off until the typed name matches the name on the form.
3. **The signature is tied to the exact words.** We save:
   - the exact authorization text they saw, with a version number
   - their typed name
   - the date and time
   - their signed-in account (they only get in through their own email link)
   - their IP address (their internet address) and browser
4. **It cannot be changed later.** We make a PDF of the finished form, with the signature block and an "audit trail" box at the bottom. The audit trail is a list of who, what, when, and from where. We also save a digital fingerprint, called a hash: a code that changes if even one letter of the PDF is changed. The PDF goes into their Documents tab. It also fills the "Run Background and Credit Check" area for staff. Signed records can never be edited, only viewed.
5. **They get a copy.** A "Download your signed copy" button stays on their portal.

Extra privacy: we never ask for a Social Security number or date of birth. Your form already says DISA collects those through its own secure link. We keep it that way.

Important notes:
- Background-check law, called FCRA, has strict rules. This authorization is for becoming a franchise owner, not an employee, and DISA gives its own required disclosures. Your lawyer should still OK both the authorization text and the e-sign notice I write.
- The Request for Consideration also has a signature line. It gets the same typed-name signature and audit trail, but without the background-check wording.

## What staff see (backend)
A new **"Prospect Forms"** tab in the candidate panel:
- One card per form, with its status ("In progress 60%, last saved 2 hours ago" or "Submitted Oct 27").
- Click a card to see all answers, set out cleanly by section. You can see answers while the prospect is still working, marked "Draft".
- Buttons: "Download PDF", and "Reopen for edits" (records who reopened it and why).
- Each save milestone shows in the Activity tab, for example "Prospect submitted Request for Consideration." Staff get a bell notification when a form is submitted.
- The "3 of 4 done" badge counts submitted forms on its own.

## Phases (one at a time, each needs your OK)
- **5A — The form engine + Request for Consideration** (about 2 turns): saving drafts, the form screen, autosave, review, typed signature, the step-card row.
- **5B — Background, Credit, and Funding with the compliant e-sign** (about 2 turns): the e-sign notice, signature screen, audit trail, locked PDF, Documents, and the Background/Credit area.
- **5C — Facility Prospect Form** (about 1 turn): school cards that can be added.
- **5D — Staff "Prospect Forms" tab** (about 1–2 turns): answers view, PDF download, reopen, notifications.
- **5E — Item 23 receipt** (about 1 turn).
  - The prospect reads the receipt text, word for word, on one screen.
  - The box for the seller who worked with them (Sam Reed or Kaylie Reed) is already ticked by staff.
  - The prospect fills in: print name, address, and phone. Entity name and type are optional, for anyone forming a company.
  - They sign the same way as the authorization.
  - The paper form has two copies, one to keep and one to return. On the web, one signature does both: we keep the signed PDF, and the prospect can download the same PDF as their copy.
  - The signing date fills the FDD received date, and that starts the 16-day lock. The lock rule itself does not change.
  - The receipt shows the FDD date (March 1, 2026). When you upload a new FDD, you set its date, so the receipt always matches the FDD the prospect actually got.

Total: about 7–8 turns. Email nudges (Phase 5b) and the smoke test stay after this.

## Questions for you before 5A
1. **Due-date wording:** your PDFs say "Please email it to Franchise@NeuronGarage.com…". On the web I would change this to "Please submit this at least one day before our next call." Is that OK?
2. **Copy answers into the profile?** Should Request for Consideration answers (address, occupation, partner, target city, start time) also fill the matching boxes staff already use in the Qualification Process? I suggest yes, but only into empty boxes. It would never overwrite what staff typed.
3. **Required boxes:** I plan to make every question required except ones marked "(Optional)", "(if any)", or "(if applicable)", and schools 4–10. OK?
4. **Item 23 seller box:** should staff pick the seller (Sam or Kaylie) per candidate, or should both always be ticked?
5. **Item 23 date:** the receipt date should be the day they actually got the FDD. Is it OK for the signing date to count as that day? I'd ask them to sign right after you email the FDD.

## What will not change
These stay as they are: the staff Qualification Process steps, the FDD 16-day lock rule, the calendar, portal files and uploads, the path page look, and all other modules.

## Risks and how we handle them
- **Lost work:** autosave plus a warning if they try to leave while a save is still going.
- **A prospect seeing other people's data:** each form row is locked to their own candidate by the database, the same as their ticks and files.
- **Legal wording:** shown to you word for word before building. Your lawyer approves it.
- **Editing after signing:** the database blocks it. Only staff can reopen, and that is logged.

## Technical details
- New table `candidate_portal_forms` (candidate_id, form_key, answers jsonb, status draft|submitted|reopened, progress, form_version, updated_at, submitted_at). RLS: prospect reads and writes only rows where candidate_id = portal_candidate_id(auth.uid()), and only while status != submitted. Staff read all and can reopen. GRANTs go in the same migration.
- New table `candidate_portal_signatures` (form_id, signer_name, consent_text, consent_version, esign_consent_at, signed_at, user_id, ip, user_agent, pdf_path, pdf_sha256). Insert only through an edge function. No update or delete policies.
- Form definitions live as typed config in `src/lib/portalForms/*.ts`, word for word from the PDFs, rendered by one generic form component (sections, repeaters, radio, checkbox groups).
- The `portal-sign-form` edge function: checks the session, checks the form belongs to the caller and the name matches, captures the IP and user agent, builds the PDF with pdf-lib (npm: import), hashes it, saves it to candidate_documents/candidates/{id}/portal/, inserts the candidate_files row (uploaded_by_prospect), logs the activity, notifies staff, and marks the form submitted.
- Autosave: debounced upsert, with an optimistic "Saved" state and retry.
