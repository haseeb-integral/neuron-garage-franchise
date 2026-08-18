# Franchise Application Landing Page — Plan

## Decision: build it inside this app (Option A)

A new **public** route `/apply` (no login, no sidebar, dedicated layout) plus a public Edge Function that writes straight into the `candidates` table. Applicants appear in the pipeline instantly, tagged "Web Application." No separate marketing site, no syncing, one codebase. The same Edge Function could later be pointed at a static marketing site if SEO needs change — that's a small move, not a rewrite.

## What we're building

1. **Public `/apply` page** (`src/pages/Apply.tsx`) — a marketing landing page with a short application form.
   - Outside `ProtectedRoute` and `AppLayout`, exactly like the existing `/unsubscribe` page.
   - Dedicated lightweight layout: clean brand design, no ops sidebar, no dark ops theme. Hero section, a few value bullets, and the form.
   - Uses the `usePageTitle` hook for SEO title.
2. **Short form** (~7 fields, one screen):
   - First name, Last name
   - Email, Phone
   - City of interest, State of interest (dropdown of US states — reuse `src/lib/usStates.ts`)
   - Liquid capital available to invest (select: `<$100k`, `$100k–$250k`, `$250k–$500k`, `$500k+`, `Prefer not to say`)
   - "Why are you interested in Neuron Garage?" (textarea, max 500 chars)
   - Hidden honeypot field for spam (if filled, silently accept + discard).
3. **New public Edge Function** `supabase/functions/submit-application/index.ts`:
   - `verify_jwt = false` (public), CORS headers from the SDK.
   - Validate all input with Zod (length limits, email format, state in allowed list).
   - **Dedup:** if a candidate with the same email already exists, return a friendly "We already have your application" message — do not insert a duplicate.
   - **Insert** into `public.candidates`:
     - `first_name`, `last_name`, `email`, `phone`, `city`, `state`
     - `current_stage = 'new_lead'`, `status = 'active'`, `fit_tag = 'New Lead'`
     - `source_type = 'Website'`, `source_name = 'Franchise Application'`, `source_campaign = 'Web Apply'`
     - `email_source = 'manual'`, `assigned_to = NULL` (unassigned — a recruiter claims it)
     - `why_interested` goes into a new optional text column `source_notes` (already exists on the table) — no schema change needed.
   - **Rate limit:** reject if the same email submitted within the last 10 minutes (prevents spam/accidental double submits). Light check via a SELECT on `candidates` by email/created_at.
   - **Notify staff:** insert one row into `public.notifications` for every manager/admin (query `user_roles` for `manager`/`admin`), kind `candidate_assigned` (or a new `web_application` kind), title "New franchise application", with the applicant's name and a link to the candidate.
4. **Thank-you state:** on success, the form swaps to a "Thanks — we'll be in touch" confirmation panel (no separate route needed).
5. **Source option seed:** add a `candidate_source_options` row for `source_type='Website'`, `source_name='Franchise Application'` so it shows correctly in the pipeline source dropdowns.
6. **Routing:** add `<Route path="/apply" element={<Apply />} />` **outside** the `ProtectedRoute` block in `App.tsx` (next to `/auth`, `/unsubscribe`).
7. **`index.html` / SEO:** set a real `<title>` and meta description for the apply page via the page (usePageTitle). The site-wide title in index.html stays as-is.

## What is NOT changing
- No new database table, no migration, no RLS changes — `candidates` and `notifications` already have policies that allow the service_role (used by the Edge Function) to insert. The Edge Function uses the service role key, so it bypasses RLS safely.
- No auth account is created for the applicant — they are a prospect, not a logged-in user.
- No changes to the existing pipeline UI; candidates just appear in the New Lead column.
- Email notification to a specific address is a fast-follow (the email queue exists), not in v1 — v1 uses the in-app bell only.

## Files touched
- `src/pages/Apply.tsx` (new) — landing page + form
- `src/App.tsx` — add public `/apply` route
- `supabase/functions/submit-application/index.ts` (new) — public Edge Function
- One SQL insert into `candidate_source_options` (via migration tool)

## Phases (each one turn)
- **Phase 1:** Create the `submit-application` Edge Function + deploy + seed the source option. (backend)
- **Phase 2:** Build `Apply.tsx` landing page + wire the route. (frontend)

## Risks / testing
- Spam: honeypot + email rate-limit handle the basics. Add a captcha later if abuse appears.
- Dedup by email means a repeat applicant gets a polite "already have it" message rather than a second row.
- Test: submit a real test application, confirm a new candidate appears in New Lead with the right source tags, and that the in-app bell fires for managers/admins.
