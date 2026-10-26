# Architecture rules

- Keep mailing address validation in the pure shared function module, reused by the browser and lead-push function, so both enforce the same rule.
- Auth access is cleared on every session event and lookup results are accepted only for the latest session request, so account switching cannot reuse another account's staff role.
- Unsubscribe sync accepts only a verified staff session or the timer's vault-stored pass (checked and rate-limited to once per 20 hours by a service-role-only database function), so the timer never depends on the managed server key; manual controls stay available when mailbox loading fails, and the UI's timestamps describe new suppressions rather than job runs.- Staff access comes only from public.user_roles rows granted on purpose (never by the signup trigger); prospect portal accounts link to one candidate via candidate_portal_users and are routed to /portal, so prospects can never read staff data.
