## Background

Two things are bundled here because they came out of the same Overview-tab edit work:

1. **Small backend fix** — the Source field doesn't persist because there's no column for it. Add the column so Source saves like the other fields.
2. **Open product question for Brett** — when Sam edits a candidate's email / phone / city in the Candidate Pipeline, should that edit flow back to the original Teacher Search and Email Outreach records, or stay isolated to the candidate?

---

## Part 1 — Add `candidates.source` column

**Migration (one column, nullable text):**

```sql
ALTER TABLE public.candidates
ADD COLUMN source text;
```

No RLS / grant changes needed — `candidates` already has them.

**Code change (one line in `CandidatePipeline.tsx > handleSaveProfile`):**

Remove the special-case that skips `source` for the DB write. Source will now save into `candidates.source` like every other field.

Effort: ~5 minutes. No risk to existing rows (column is nullable).

---

## Part 2 — Message to Brett (paste into Slack / email)

> Hey Brett — quick heads-up and one product question.
>
> **What I changed:** On the Candidate Pipeline detail panel → Overview tab, the contact fields (Name, Email, Phone, Location, Assigned To, Source) used to be read-only. I made them click-to-edit so Sam and the team can fix typos and update details without leaving the page. Edits save straight to the database, optimistic UI with rollback on error.
>
> **The question — and I'd like your call before I build further:**
>
> In production, a person travels through three screens before landing in the Pipeline:
>
> 1. **Teacher Search** — we discover them (`teacher_prospects` table). Original email, school, city.
> 2. **Email Outreach** — we cold-email them. Same `teacher_prospects` row + an `outreach_queue` entry.
> 3. **Candidate Pipeline** — when they reply positively, Reply Triage creates a **new row** in `candidates` and links back to the teacher via `prospect_id`. So the candidate is a *copy*, not the same row.
>
> Right now if Sam edits the candidate's email or phone in the Pipeline, only the candidate row updates. The Teacher Search and Email Outreach screens still show the original values. Three options:
>
> - **(a) Keep them separate** *(current behavior)* — Teacher record is the cold-outreach source of truth; Candidate record is Sam's working copy. Cleanest, but if Sam corrects a typo it doesn't fix it on the teacher side.
> - **(b) Sync back to `teacher_prospects`** — One person, one source of truth. Edit in Pipeline → also updates Teacher Search. Risk: could overwrite a verified email with a worse one.
> - **(c) Sync back only for specific fields** — e.g. phone and city sync back, but email stays isolated (since email drives deliverability in Smartlead).
>
> My recommendation is **(c)** — but it's your call. Once you decide I'll wire it in (~30 min of work either way).

---

## Part 3 — What I'll do after Brett answers

- **If (a):** nothing further. Current behavior is correct.
- **If (b):** in `handleSaveProfile`, after the `candidates` update succeeds, also update `teacher_prospects` (matched by `candidates.prospect_id`) with the same patch. Skip if `prospect_id` is null (candidate was added manually, not from outreach).
- **If (c):** same as (b) but filter the patch to allowed fields only (e.g. `phone`, `city`, `state` — not `email`).

---

## Quick answer to your "is Candidate Pipeline dummy data?" question

**No.** The page reads `supabase.from("candidates").select(...)` — it's real DB rows. Allison Wood is in your database right now. The data *looks* sparse because only a handful of test candidates have been created (some manually, some via Email Outreach → Reply Triage). It will fill up naturally as Sam works the funnel.