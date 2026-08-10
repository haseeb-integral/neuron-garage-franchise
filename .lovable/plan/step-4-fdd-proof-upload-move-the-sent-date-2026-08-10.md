# Step 4: FDD proof upload + move the sent date

## What is wrong today

In Step 4 (FDD & Franchise Agreement Review):

- The post-call action says "Sent FDD and saved/uploaded proof of date sent", but there is no upload button next to it. Today the only proof upload lives in the Uploaded Documents tab (compliance panel), which is easy to miss.
- The "FDD sent date" box sits in the general fields area at the top of the step, away from the post-call action it belongs to.

## What we will change

1. Add an **Upload** button right next to the "Sent FDD…" post-call item in Step 4. Same small button already used for homework items. Files are saved under the `fdd_proof` category so they show in the Uploaded Documents tab and are picked up by the compliance panel and the Compliance Packet PDF.
2. Move the **FDD sent date** box out of the top fields area and place it directly under the Post-Call Actions list in Step 4, next to the upload button. The green "Earliest signing date: … (FDD sent + 16 days)" note moves with it.

Nothing about the 16-day rule, the database, or the stage gate changes. Same field key (`fdd_sent_date`), so existing data stays.

## Technical notes

- `ProcessTab.tsx`: give `ChecklistBlock` for Step 4 a `renderAction` that shows an upload control for the `sent_fdd` item; remove `fdd_sent_date` from Step 4's `fields` array and render it manually below the Post-Call Actions block along with the earliest-sign-date banner.
- Upload control: extend `HomeworkUploadButton` with an optional `category` prop (default `homework`) and matching bucket path segment, then use `category="fdd_proof"` here. This keeps one upload component instead of a second copy.
- Compliance panel already lists `fdd_proof` files, so an upload here satisfies the "proof required" check there.

## Risk and testing

- Low risk, one file plus a small prop addition to the upload button. No schema change.
- Test: open a candidate → Qualification Process → Step 4. Upload a screenshot next to "Sent FDD"; confirm it appears in Uploaded Documents. Set the FDD sent date under Post-Call Actions; confirm the earliest signing date banner still shows and the compliance panel sees the date and the proof file.

Estimated: 1 turn.
