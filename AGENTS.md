# Architecture rules

- Keep mailing address validation in the pure shared function module, reused by the browser and lead-push function, so both enforce the same rule.
- Unsubscribe sync accepts only a verified staff session or the timer's vault-stored pass (checked and rate-limited to once per 20 hours by a service-role-only database function), so the timer never depends on the managed server key; manual controls stay available when mailbox loading fails, and the UI's timestamps describe new suppressions rather than job runs.