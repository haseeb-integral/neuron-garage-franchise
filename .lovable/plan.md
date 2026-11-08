# Candidate Pipeline: matching blue buttons

## What will change
Use the same blue already seen on **New Candidate** and the pipeline’s selected controls: `#174BE8`.

All action buttons in Candidate Pipeline will match. This includes Schedule, Move prospect to next stage, Invite to portal, Resend portal link, file buttons, report downloads, and buttons in pipeline windows.

The invite button will become blue both before and after an invite. Its existing status text will still show **Not invited**, **Invited**, or **Portal active**.

## One safe phase — about 1 Lovable turn after approval
1. Add one shared pipeline blue style.
2. Apply it to pipeline action buttons, including buttons inside candidate cards and related windows.
3. Keep tabs, filters, checkboxes, and small close controls easy to tell apart. Use blue for their selected or action state where needed, without making every control look selected.
4. Check the board, candidate details, Qualification Process, and open windows at desktop and your current screen size.

## What stays unchanged
- Button names, locations, and actions.
- Scheduling, Google invites, Meet links, and email rules.
- Stage movement, signing safeguards, and homework.
- Prospect portal and all other app sections.
- Saved records and access rules. No database or server changes.

## Risks and checks
- A shared app button change could affect other pages. Keep the blue style limited to Candidate Pipeline and its windows.
- Blue invite buttons will no longer show status through red or green. Keep the status words visible.
- Keep disabled buttons visibly disabled. Keep deletion warnings and confirmation steps unchanged, even when their action button is blue.
- Check button text contrast, focus, and selected states. Run relevant existing tests. Do not send an invite, schedule a call, or move a real prospect just to test color.

## Technical scope
Presentation changes only. Likely files include CandidatePipeline, the candidate detail panel, pipeline button surfaces, and shared styling. Define the blue as a named color in global CSS rather than repeating color values. Do not change the global primary color: it is currently orange and is used elsewhere.

## Approval
No app code will change until this plan is approved.