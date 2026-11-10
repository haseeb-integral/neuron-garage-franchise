# Prospect password setup: findings and safe fix plan

## What I confirmed
- Today's account logs show a password setup link rejected as expired at **17:41:30 UTC on November 10, 2026**.
- I opened the password page with an expired-link response. It stayed on **“Validating reset link…”**, with both password boxes and Save disabled. It gave no explanation or way to request a fresh link.
- The prospect page's **Back to sign in** button points to staff sign-in, not prospect sign-in.
- The page also accepts any existing signed-in session as proof that the password link worked. An old session could therefore hide a bad link. This is a code finding; I have not reproduced it with either affected prospect.
- Invitations create the account before the prospect chooses a password. A failed password setup does not necessarily mean the account was not created.

## What is not yet proven
- I cannot tie the expired-link log to either reported prospect from the available logs.
- I do not know whether the link aged out, was already used, was replaced by a newer link, or was opened by an email security scanner.
- Successful fresh-link delivery and password setup have not been checked in an affected account.
- Hosted password rules, link lifetime, and email limits remain unverified. No account settings have been changed.

## Phase 1 — Fix the dead end and check password-link safety
**Estimate: 1 Lovable turn after approval.**

1. Show a clear message for expired, invalid, or used links instead of waiting forever.
2. Give prospects a button to request a fresh link through the existing prospect password-reset flow.
3. Send prospect Back to sign in buttons to `/portal/sign-in`. Keep staff links at `/auth`.
4. Separate loading, valid-link, invalid-link, and save-error states. Handle connection failures without leaving Save stuck.
5. Check the invitation and recovery link types before enabling password saving. Reject explicit link errors even if another account is already signed in. Verify the user with the account service rather than trusting saved browser session data alone.
6. Keep both invitation setup and password recovery working. Do not require the old password on a valid recovery link.

**Affected parts:** shared `src/pages/ResetPassword.tsx`, focused password-link helper/tests if needed, and the existing prospect sign-in reset flow for requesting another link. Staff password resets share this page, so both paths need tests.

**Tests:** expired link; used/invalid link; missing link; stale signed-in session plus bad link; valid invitation; valid recovery; matching passwords; save failure and retry; correct prospect/staff destinations; phone-size layout. Use focused tests and browser checks. Do not send emails to real prospects as part of automated tests.

## Phase 2 — Check the two reported cases
**Estimate: 1 Lovable turn, once the affected prospects are identified and a fresh-link test is approved.**

1. Check whether each prospect has a portal-linked account and whether invitation delivery was recorded.
2. Check available account logs around their attempts for expired links, rejected passwords, or email limits.
3. With approval, send a fresh setup link through the existing staff invite control. Do not delete or recreate their accounts.
4. Confirm the prospect can set a password, open their own portal, sign out, and sign back in. Never ask for their password or email-link token.
5. If a separate sending or invitation bug appears, explain it and obtain approval for a separate fix.

## Risk controls
- No changes to open signup, email confirmation, password security settings, staff roles, or prospect access rules.
- No changes to forms, signed records, FDD evidence, calendar invites, or candidate stages.
- No account deletion or automatic relinking.
- The shared password page is the main risk. Test staff recovery as well as prospect setup.
- Do not extend link lifetime or weaken password rules without evidence and approval.

## Approval boundary
Approve Phase 1 first. Implement only that phase, report the results, and stop before Phase 2.