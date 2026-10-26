# Fix prospect sign-in showing staff pages

## What I found
- `samreed512+prospect@gmail.com` is linked to a candidate and has no staff role. The account itself is set up as a prospect.
- The sign-in page always sends successful logins to the staff home page first.
- When accounts change, the app does not immediately clear the previous account’s role or its “access checked” flag. An older account lookup can also finish later and replace the newer account’s details.
- These flaws can let the screen use an old staff role while the new prospect account is being checked. I have not yet reproduced Sam’s exact sign-in sequence in a browser, so that remains part of testing.

## Phase 1 — Fix account switching and check it
**Estimate: 1–2 Lovable turns after approval.**

1. Make account access belong only to the account that is currently signed in. Hide protected pages until that account’s access check finishes.
2. Clear the old account’s access when signing out or switching accounts. Ignore late answers from an older account check.
3. Send prospects straight to `/portal` after their access check finishes. Keep staff going to the staff home page. Keep accounts without access on the existing waiting-for-access screen.
4. Add small tests for staff-to-prospect switching, a late staff lookup, sign-out, and correct destinations for staff and prospects.
5. Check the real prospect portal and a blocked staff page while signed in as this test prospect. A test login for that account may need your approval. Also check that the administrator can still open Candidate Pipeline.

## What may be affected
- The shared signed-in account check: `src/contexts/AuthContext.tsx`.
- The sign-in screen: `src/pages/Auth.tsx`.
- The staff page gate: `src/components/ProtectedRoute.tsx`, only if needed to enforce the same rule.
- Focused test files for these login rules.
- Both normal sign-in and account changes after opening an invite or password-reset link use this shared account check.

## Keep the risk low
- Do not change passwords, account roles, candidate links, database rules, or file permissions.
- Do not edit the generated login storage files.
- Do not change the portal steps, uploads, checklists, Candidate Pipeline actions, or Email Outreach.
- Keep staff access based on the saved role, never the email address or browser storage.
- While access is loading or cannot be confirmed, keep staff pages hidden. A temporary loading screen is safer than displaying the wrong account’s view.
- Test both account types. A prospect must reach the Path to Ownership and must not see the staff navigation. An administrator must still reach Candidate Pipeline.

## Approval
No application code or account settings have been changed. Approve this phase before implementation starts.