# Plan: Phase 2 Timeline Stakeholder Doc — June 2026

Deliver a concise, visual, non-technical 1–2 page Google Doc summarizing Phase 2 progress (June W1–W4) and share via Google Docs link. Also save a DOCX + PDF mirror to `/mnt/documents/` as backups.

## Document outline

**Title:** Phase 2 Development Timeline — June 2026
**Subtitle:** Neuron Garage Platform · Stakeholder Update

**1. Overview (2 sentences)**
Phase 2 expands the platform with two new market intelligence features — Market Validation and Site Analysis — backed by upgraded data pipelines. June is a 4-week sprint moving from architecture to live demo pages to backend integration and client-tested refinements.

**2. At-a-glance status strip**
A single visual row: W1 ✅ Done · W2 📋 In Progress · W3 🔧 Planned · W4 🔧 Planned.

**3. Four-week timeline (table, one row per week)**
Columns: Week · Status · Focus · Key Deliverables.

- **Week 1 — ✅ Complete** · Architecture & Planning · Locked Phase 2 scope with Manus + Lovable; finalized build sequence; vendor and scoring-helper decisions made.
- **Week 2 — 📋 In Progress (current)** · Demo Pages Live · Market Validation and Site Analysis pages shipped as visual mockups, now visible in the left sidebar. Stakeholder feedback collection and backend triage underway.
- **Week 3 — 🔧 Planned** · Backend Wiring & Calibration · Connect both features to live data; internal testing; calibration checks against known reference markets and sites.
- **Week 4 — 🔧 Planned** · Feedback & Refinement · Iterate on stakeholder feedback from the demo and Week 3 testing; polish for broader review.

**4. Featured this week — what's new in the platform**
Two short callouts (with light iconography):
- **Market Validation** — a per-city scoring view that combines demand, pricing, absorption, operator landscape, and market balance signals into one composite read.
- **Site Analysis** — a side-by-side comparison view for candidate sites with reach, demographics, school profile, competition, and accessibility factors.
Note: both pages currently show illustrative sample data; live data lands in Week 3.

**5. What's next (Weeks 3–4)**
Three bullets: live data wiring, calibration against reference markets/sites, then a client-feedback refinement pass before Phase 2 review.

**6. Footer**
Prepared June 10, 2026 · Neuron Garage × Lovable · Questions: Haseeb / Brett.

## Visual design

- Brand-aligned palette pulled from the app (deep navy `#07142f`, blue accent `#174be8`, soft bg `#f7faff`, muted text `#526078`, success green, amber for in-progress).
- Arial throughout (universally renders in Google Docs).
- Status uses both an emoji and a colored chip so it scans without relying on color alone.
- Timeline as a clean bordered table, not a wall of text. Light row shading on the current week (W2).
- Two feature callouts as a 2-column mini-table with bold feature name + 1-sentence description.
- Tight margins (0.8") so it lands at ~1.5 pages.

## How it will be produced

1. Generate `Neuron-Garage-Phase-2-June-Timeline.docx` locally with `docx-js` (matches the prior Phase 2 plain-English doc approach: Arial, proper page breaks, clean table styling). Also render a PDF mirror for preview.
2. QA: convert to images and visually check each page for overflow, spacing, color contrast, and chip alignment. Fix and re-render if needed.
3. Create a Google Doc via the Google Docs connector (TipTap → batchUpdate path), titled "Phase 2 Development Timeline — June 2026", with the same content and styling adapted to Docs (headings, table, shading, bold).
4. Return: the Google Doc shareable URL + `/mnt/documents/` artifacts (DOCX + PDF) as backups.

## Out of scope

- No code changes, no route changes, no Supabase changes.
- No edits to `.lovable/phase-2/` source-of-truth files (this is a stakeholder communication, not a SOW update).
- No Week 5–6 grace-week detail — kept off the doc to stay 1–2 pages and on the "June W1–W4" ask.
