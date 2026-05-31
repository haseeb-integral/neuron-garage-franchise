# Plain-English Execution Plan — rewrite

## What you're getting

One new document, written for a human (you and Brett), not for me. No tickets, no file paths, no ASCII tables. Arial throughout, generous spacing, clear headings, proper page breaks. Delivered as **PDF + DOCX**, both clean.

Working title: **`Neuron-Garage-Phase-2-Plan-Plain-English`** (`.pdf` + `.docx`).
Lives in chat as downloads. Markdown source kept in repo at `.lovable/phase-2/phase-2-plan-plain-english.md` so it's reproducible.

The technical execution plan (`phase-2-execution-plan.md` + its exports) stays as-is for me to follow. This new doc is the human layer on top.

## Structure of the new doc

1. **One-paragraph summary** — what Phase 2 is, why, and the 4+2 week shape.
2. **The 9 items, grouped into 3 tiers** based on how ready they are to build:
   - **Tier A — Ready to build** (Items 1 Market Validation, 2 Site Analysis, 3 Notes & Activity tab)
   - **Tier B — Needs Brett's spec first** (Items 4 Candidate-facing form, 5, 6, 7)
   - **Tier C — Likely slips past the 6-week window** (Items 8 Video Training, 9 CSI app)
   Each item gets 3–4 sentences: what it is, what we'll show on screen, what success looks like. No formulas, no file names.
3. **Who does what** — one short section: Manus = heavy data work, Lovable = display + workflow. Two bullets, not a table.
4. **The 6-week shape** — Week 1, Weeks 2–4, Weeks 5–6 grace. One short paragraph each.
5. **Risk register, ranked** — every risk tagged Low / Medium / High with a one-line "what we'll do if it happens." Examples:
   - High: Items 4–9 specs never arrive → ship Tier A only, call it a win.
   - High: LeafSpring doesn't score lower than Trinity in Site Analysis → weights get reworked before rollout.
   - Medium: Scraper (Firecrawl) gets blocked on camp sites → fallback to manual review queue.
   - Medium: Map/isochrone costs spike → cap usage, add a meter.
   - Low: Small towns missing census data → flag with a "low confidence" badge.
6. **What "done" looks like** — 4 bullets, plain English.
7. **What I need from Brett to start** — 3 bullets (lock the SOW, fill TBDs for items 3–9, confirm map vendor or let me pick).

## Formatting fixes (the real issue last time)

Built with `docx` library directly (not pandoc), so I control fonts and spacing:
- Arial 11pt body, Arial 16pt H1, Arial 13pt H2, Arial 11pt bold H3.
- 1-inch margins, US Letter.
- Real bullet lists (not unicode dots).
- No wide tables — anything tabular becomes a short bullet list.
- Page breaks before each tier and before the risk register.
- PDF generated from the same DOCX via LibreOffice so fonts match exactly.
- QA gate: render every page to image, look for clipped text, wrong fonts, overflowing content. Fix and re-render until clean.

## What I will NOT do this turn

- Touch `phase-2-sow.md` or the existing `phase-2-execution-plan.md`.
- Change app code.
- Re-export the SOW (it's fine as-is; only the execution plan was the problem).
- Invent any new scope.

## Deliverables

- `Neuron-Garage-Phase-2-Plan-Plain-English.pdf`
- `Neuron-Garage-Phase-2-Plan-Plain-English.docx`
- `.lovable/phase-2/phase-2-plan-plain-english.md` (source)
- One line in `CHANGELOG.md`
