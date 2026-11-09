# Full FDD review before Item 23 signing

## What will change and why
Show the complete FDD inside the prospect's Item 23 signing page. The prospect can scroll through its pages, then sign the receipt below it. The receipt remains an acknowledgment of receiving the FDD, not a signature agreeing to the franchise agreement.

Use the exact FDD tied to that prospect's receipt. For new recipients this will be Version 1, including all 121 pages and exhibits. Never show the newest file in place of a different version that someone previously received.

## Phase 1 — Full document on the signing page
**Estimate: 1–2 Lovable turns after approval.**

- Add a full-document viewer before the Item 23 signature area, with scrollable pages and page numbers.
- Provide zoom and a download of the same original FDD. Make pages readable on a phone and a computer, without relying on a browser's built-in PDF display.
- Keep the existing receipt disclosures, personal details, consent, and typed-signature controls below the document.
- Load pages as needed so the long PDF does not freeze the page.
- Show clear loading, failure, and retry states. If the correct document cannot be obtained, do not allow signing. Do not claim that scrolling proves someone read every page.
- Keep file access private and limited to the prospect's saved receipt version. Do not use a public file link.

**Affected:** prospect Item 23 page, a focused document-viewer component, and a protected document retrieval action. The current latest-FDD download stays unchanged.

**Testing:** verify first and last pages, scrolling, zoom, download, retry, and matching receipt version on desktop and phone. Test that another prospect's file cannot be requested. Verify missing documents cannot be signed, while other forms behave as before.

Stop after this phase and report what changed, files touched, and results before starting Phase 2.

## Phase 2 — Complete signed download
**Estimate: 1–2 more Lovable turns after Phase 1 review.**

- For new Item 23 signatures, save one downloadable PDF containing the complete unchanged FDD followed by the completed signed receipt and its audit details.
- Preserve the original FDD pages and fingerprint separately from the fingerprint of the combined signed file.
- Keep the existing saved FDD ID, first received date, correction history, and signature evidence. Do not alter any already-signed PDF.
- Keep staff access to the signed copy and prospect downloads working through the existing file system.

**Affected:** Item 23 submission and signed-PDF creation; existing signature/file records receive the new combined file through the current saving process. Other form PDFs remain unchanged. No new database tables are planned.

**Testing:** confirm all original FDD pages are present and unchanged, followed by the correct receipt, signature, and audit details. Visually inspect the first page, last original page, and every added receipt/audit page. Check prospect and staff downloads, correction version handling, and existing signed copies.

## Risks and protections
- A 121-page document is large: load it progressively and test on a phone.
- A failed document load must not leave an active signing button. Do not add a mandatory read timer or require a scroll-to-bottom claim.
- Use the saved receipt-version lookup, including correction-specific versions, rather than the latest-FDD lookup.
- Keep existing staff send proof, automatic notices, signing waiting periods, and prospect account permissions unchanged.
- Do not change the paper FDD, legal wording, other forms, calendar, pipeline stages, or Email Outreach.
- Real mailbox delivery is outside this request. PDF availability and signing checks are the focus.

## Technical approach
Use a proven PDF rendering library for the viewer and the existing PDF library to append the new signed receipt to the source FDD. Retrieve the document through a prospect-verified action that resolves the authorized version on the server. Reuse existing atomic submission and immutable signature storage.

Approval starts Phase 1 only; Phase 2 follows after its review.