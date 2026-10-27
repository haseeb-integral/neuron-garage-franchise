# Fix signed-copy downloads in Chrome

## What is wrong
The screenshot shows Chrome’s `ERR_BLOCKED_BY_CLIENT` message. The signed-copy button currently opens a temporary file-storage link in a new tab. Chrome is blocking that navigation. The screenshot alone does not tell us whether the cause is a browser extension, browser policy, or the preview’s restrictions.

## One safe phase — estimated 1 implementation turn
1. Keep the private file checks. Fetch the existing signed PDF inside the app instead of sending the browser to the storage site.
2. Prepare the file before enabling the download button. Show a loading state and a clear retry option if the file cannot be fetched.
3. Make the button save the prepared PDF with a clear filename. Avoid new tabs and keep the prospect on the form page.
4. Test the signed-copy button in Chrome using a real signed prospect form. Check that the downloaded file is a nonempty PDF and inspect its pages. Run the relevant existing form tests.

## Affected areas
- The shared signed-copy button on the Item 23 and Background/Credit form pages.
- Loading, ready, and failed-download states for that button.
- Technical file: `src/pages/portal/PortalForm.tsx`. A small download helper may be added if needed.
- Reads from the existing signature records and private document storage remain unchanged.

## What will not change
No changes to signing, saved answers, signed PDFs, FDD versions, received dates, the 16-day lock, delivery logs, staff proof packets, account access, or other modules. No database changes. The download returns the existing signed file; it does not recreate it.

## Risks and safeguards
- An extension or browser policy could also block fetching the file. If that happens, show a useful error without leaving the page; do not promise this change bypasses all browser restrictions.
- Keep private storage private and use the signed-in prospect’s existing access.
- Release temporary file links when they are no longer needed.
- Do not create a new signature or alter real prospect records while testing.
- If a suitable signed prospect account is not available for testing, report that limit rather than claim the full flow passed.

## Approval
Wait for approval before changing application code. After this single phase, report the files touched, test results, and ask Sam to retry the same button in his Chrome browser.