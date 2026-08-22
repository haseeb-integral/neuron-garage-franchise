# Landing page form → Candidate Pipeline (new lead)

## What we are building

Your landing page (a separate Lovable project) will send its form data to a small,
public "front door" in this app. That front door checks the data, then creates a new
prospect in the Candidate Pipeline at the **New Lead** stage.

The landing page never touches the database directly. It only calls one web address.
That keeps this app's data locked down.

```text
Landing page form  ──POST──>  submit-application (public endpoint in this app)
                                   |
                                   +-- validate first/last/email/phone
                                   +-- check for an existing candidate by email
                                   +-- insert into candidates (stage = new_lead)
                                   +-- log an activity + a bell notification
```

## Why this way

- One shared source of truth: leads land in the same `candidates` table the pipeline
  already reads. No sync job, no second list.
- Safe: the landing page only gets a public key that can call this one endpoint. It
  cannot read candidates, teachers, or anything else.
- Simple for the other project: one `fetch` call, four fields.

## What gets built in THIS app

1. **New public function `submit-application`**
   - Accepts `first_name`, `last_name`, `email`, `phone`, plus optional
     `source_campaign`, `utm_source`, `page_url`.
   - Validates with Zod: names 1–100 chars, valid email, phone optional but cleaned.
   - Honeypot field (`company`) — if filled, we silently accept and drop it (bot).
   - Basic rate limit: max 5 submissions per email per hour.
   - Duplicate handling: if the email already exists in `candidates`, we do **not**
     create a second record. We add an activity note "Re-applied via landing page"
     to the existing candidate and return success.
   - New record defaults:
     - `current_stage` = `new_lead`
     - `source_type` = `Inbound`
     - `source_name` = `Landing Page`
     - `source_campaign` = whatever the page sends (or blank)
     - `email_source` = `applicant_provided`
     - `city` / `state` = blank (recruiter fills these on the Qualification Process tab)
   - Also writes a `candidate_activities` row and a `notifications` row so the team
     sees a bell when a new lead arrives.

2. **Database change**
   - A `service_role`-only insert path (the function uses the service key), so no
     public write policy is added to `candidates`. Nothing existing changes.
   - No new tables. No schema change to `candidates` — all fields already exist.

3. **Pipeline UI**
   - No change needed. New leads show up in the New Lead column automatically.
   - Optional small touch: a "Landing Page" chip on the card via the existing source
     fields (already displayed).

## Risks and what we will not touch

- Not touching: candidate stages, scoring, compliance rules, teacher search, or any
  existing RLS policy.
- Main risk: spam. Handled by honeypot + rate limit + email validation. If spam still
  gets through we can add a captcha later.
- Duplicate emails are blocked by the existing unique index, so the function must
  handle that case — covered above.

## Phases and turns

- **Phase 1 (1 turn)** — Build and deploy `submit-application`, with validation,
  dedupe, activity log, and notification.
- **Phase 2 (1 turn)** — Test end to end: send a fake submission, confirm the card
  appears in New Lead, confirm the bell fires, confirm a repeat email does not create
  a duplicate. Then hand you the final endpoint URL + key.
- **Phase 3 (optional, 1 turn)** — Auto-reply email to the applicant ("we got your
  application") using the existing email system.

## What you test after Phase 2

1. Submit the form on the landing page.
2. Open Candidate Pipeline → the lead is in **New Lead** with the right name/email/phone.
3. Source shows Inbound / Landing Page.
4. Submit the same email again → no duplicate card, just a note on the existing one.

## Instructions for the other Lovable project

After Phase 1 I will give you a copy-paste block containing:
- the exact endpoint URL,
- the public key header,
- the JSON body shape,
- and a ready-made `handleSubmit` function with loading + error + success states,
  including the hidden honeypot field.

You paste that whole block into the landing page project as the prompt.
