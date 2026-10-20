# Architecture rules

- Keep mailing address validation in the pure shared function module, reused by the browser and lead-push function, so both enforce the same rule.
- Unsubscribe sync accepts only a protected scheduled credential or a verified staff session; manual controls stay available when mailbox loading fails, and persistent timestamps describe new suppressions rather than job runs.