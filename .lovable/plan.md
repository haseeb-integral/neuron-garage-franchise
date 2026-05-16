Disable the "leaked password protection" (HIBP check) on the auth backend so users can choose any password they want, including ones flagged as commonly-used/weak by the Have I Been Pwned database.

## Change

- Call `configure_auth` with `password_hibp_enabled: false` (keep all other auth settings as-is: signup enabled, no anonymous users, no auto-confirm email).

## Result

- The "Password is known to be weak and easy to guess" error from the screenshot will no longer appear.
- Users can sign up / reset password with any password meeting the basic length requirement.

No frontend code changes needed.