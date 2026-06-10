## Plan: Update Phase 2 Timeline Doc — Option B

Add a brief "Full Phase 2 Scope" section to the existing 1–2 page stakeholder doc so all 8 Phase 2 items are visible, while keeping Market Validation + Site Analysis as the W2 headline.

### What changes in the document

Insert a new compact section between **"Featured this week"** and **"What's next"**:

**Section title:** Full Phase 2 Scope

One-line intro: *Phase 2 covers 8 workstreams. June W1–W4 focuses on the first two; the rest enter the build queue as specs land.*

Then a tight 2-column table (Item · Status):

| # | Item | June Status |
|---|---|---|
| 1 | Market Validation (1A) | ● In Progress — demo live W2 |
| 2 | Site Analysis (1B) | ● In Progress — demo live W2 |
| 3 | Candidate Pipeline 1.5 | ○ Queued — spec in progress |
| 4 | Teacher Search 1.5 | ○ Queued — spec in progress |
| 5 | SmartLead Integration 1.5 | ○ Queued — spec in progress |
| 6 | Mailboxes / Sending Health 1.0 | ○ Queued — spec in progress |
| 7 | Video Training / Onboarding 1.0 | ○ Queued — spec in progress |
| 8 | Market Saturation / CSI (4th Manus app) | ○ Under review — scope decision pending |

Filled dot = active build; open dot = queued. Same navy/blue palette as the rest of the doc; W1/W2 items get a light row tint to reinforce the headline.

### Light edits elsewhere

- **Overview paragraph:** add a half-sentence clarifying that Phase 2 has 8 workstreams total, with Market Validation and Site Analysis leading the June sprint.
- **What's next:** unchanged (still W3 wiring, W4 refinement on items 1+2).
- **No date commitments** for items 3–8 — only status labels, to avoid setting expectations we can't hold.

### Production

1. Update `/tmp/build_timeline.js` to insert the new section and tweak the overview line.
2. Re-render DOCX + PDF to `/mnt/documents/Neuron-Garage-Phase-2-June-Timeline.docx` / `.pdf` (overwrite).
3. Visual QA: render PDF pages to images, confirm doc is still ≤ 2 pages and the scope table fits cleanly.
4. If the Google Docs connector is linked, push the updated content to the existing Google Doc (or create one) and return the share link. Otherwise return the DOCX/PDF for drag-into-Drive.

### Out of scope

- No code, route, Supabase, or `.lovable/phase-2/` source-of-truth edits.
- No per-item delivery dates for items 3–8.
- No Week 5–6 detail.
