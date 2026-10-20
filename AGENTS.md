# Architecture rules

- Keep mailing address validation in the pure shared function module, reused by the browser and lead-push function, so both enforce the same rule.