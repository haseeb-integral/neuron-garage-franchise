# Architecture rules

- Keep mailing address validation in the pure shared function module, reused by the browser and lead-push function, so both enforce the same rule.
- Auth access is cleared on every session event and lookup results are accepted only for the latest session request, so account switching cannot reuse another account's staff role.
- Unsubscribe sync accepts only a verified staff session or the timer's vault-stored pass (checked and rate-limited to once per 20 hours by a service-role-only database function), so the timer never depends on the managed server key; manual controls stay available when mailbox loading fails, and the UI's timestamps describe new suppressions rather than job runs.- Staff access comes only from public.user_roles rows granted on purpose (never by the signup trigger); prospect portal accounts link to one candidate via candidate_portal_users and are routed to /portal, so prospects can never read staff data.
- Prospect portal forms are typed configs in src/lib/portalForms rendered by one generic page; signing goes only through the portal-submit-form function, which locks the form and writes an append-only signature/audit row, so signed answers can never be edited by the prospect.

## Item 23 receipt + FDD version rules
- The FDD version a prospect received resolves in one order: `candidate_compliance.fdd_file_id` (staff-recorded) first, else the prospect's earliest `fdd_delivery_events` row; prospects read it through the security-definer RPC `portal_my_fdd_version()`. The Item 23 receipt must name that version's issuance date — never the newest FDD. If no version can be confirmed, signing is blocked with a contact message.
- The Item 23 signing date writes `candidate_compliance.fdd_received_at` (only when empty) and appends a `receipt_signed` row to `fdd_delivery_events`; both live in `portal-submit-form`.
