## Add Week 2–4 progress rows for items 1 & 2 into v5 of the timeline doc

You're right — v4 missed adding the weekly progress sub-rows for Market Validation (1A) and Site Analysis (1B). I'll extend the v4 build script to add this, keeping everything else intact, and output a new file so v4 stays untouched.

### What gets added

Inside the **live blocks** for Item 1 (Market Validation) and Item 2 (Site Analysis) — right after the "Live demo details / Stubbed items" content and before the "Decision questions" — insert a small **Weekly Progress** sub-section with 3 rows:

| Week | Status | Milestone | Description |
|------|--------|-----------|-------------|
| Week 2 | ● In Progress | Demo Pages Live | Market Validation and Site Analysis shipped as visual mockups, now visible in the left sidebar. Stakeholder feedback collection and backend triage underway. |
| Week 3 | ● Planned | Backend Wiring & Calibration | Connect both features to live data, run internal testing, and calibrate scores against known reference markets and sites. |
| Week 4 | ● Planned | Feedback & Refinement | Iterate on stakeholder feedback from the demo and Week 3 testing; polish both features for broader review. |

- Same 3-row block appears under both Item 1 and Item 2 (the text references "both features", so it's the shared cross-feature roadmap)
- Rendered as a proper docx table with the same styling as the existing Full Phase 2 Scope table (DXA widths, light grey borders, light header shading, ShadingType.CLEAR)
- Status dot color: amber `#D97706` for "In Progress", grey `#6B7280` for "Planned"

### What stays exactly the same

- Full Phase 2 Scope table at the top — untouched
- Items 1 & 2 live blocks (what's live / stubbed / decision questions / default) — untouched
- Items 3–8 "Questions for Brett" blocks — untouched
- Closing note to Brett — untouched

### Output

- New file: `/mnt/documents/Neuron-Garage-Phase-2-June-Timeline-v5.docx` (v4 kept)
- PDF: `/mnt/documents/Neuron-Garage-Phase-2-June-Timeline-v5.pdf`
- Visual QA via `pdftoppm` on the Item 1 and Item 2 pages to confirm the new tables render without clipping

### Out of scope

- No code, route, Supabase, or `.lovable/phase-2/` edits
- No new questions or content beyond the 3 rows you supplied
- No timeline dates added beyond "Week 2 / 3 / 4" labels you provided
