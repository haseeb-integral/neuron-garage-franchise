# Phase 2 — Living Status

> Update this file whenever an item moves. Stamp date + who updated. Log the same change in `CHANGELOG.md`.

## Status legend

- `not-started` — no work yet
- `architecting` — spec being written / debated
- `spec-locked` — SOW section locked, ready to build
- `in-progress` — Lovable is building it
- `shipped` — live in app (or, for Manus items, live in pipeline)
- `blocked` — waiting on input or decision

## Items

| # | Item | Version | Owner (Manus / Lovable) | Status | Last updated | By |
|---|------|---------|--------------------------|--------|--------------|-----|
| 1 | Market Validation Engine (1A) | 1.0 | Manus (collection + scoring) + Lovable (display + PDF report UI) | demo-mockup-shipped · 9-gap polish (LOV-1..5 stubs present) | 2026-06-10 | Haseeb |
| 2 | Site Analysis Engine (1B) | 1.0 | Manus (isochrone + ACS) + Lovable (compare UI) | in-progress · live engine wired end-to-end with real Overpass + Mapbox + ACS data; v0.3 Trinity 63.32 vs LeafSpring 45.96 (gap +17.36 pt, Trinity ranked higher). Calibration gate per Sam brief v2 p.12 is **qualitative** ("materially lower") — no numeric threshold in client docs; prior "≥20" was a Lovable-invented gate, now retracted. **Lever B (pillar reweight) BLOCKED** — Sam pins weights 0.25/0.25/0.20/0.15/0.15 (brief v2 p.9); rework requires Brett approval. Awaiting Brett confirmation on whether +17.36 satisfies "materially lower" or a second anchor pair should be added. | 2026-06-16 | Haseeb |
| 3 | Candidate Pipeline | 1.5 | Lovable | not-started | 2026-05-30 | Haseeb |
| 4 | Teacher Search | 1.5 | Lovable | not-started | 2026-05-30 | Haseeb |
| 5 | SmartLead integration | 1.5 | Lovable | not-started | 2026-05-30 | Haseeb |
| 6 | Mailboxes / sending health | 1.0 | Lovable | not-started | 2026-05-30 | Haseeb |
| 7 | Video Training / Onboarding | 1.0 | TBD | not-started | 2026-05-30 | Haseeb |
| 8 | 4th Manus app — Market Saturation / CSI | 1.0 | Manus | not-started — decide if stand-alone or folded into 1A | 2026-05-30 | Haseeb |

## Blockers / open decisions

- Item 8: stand-alone Manus app vs folded into Feature 1A Market Balance Index? Awaiting Brett + Sam call.
- Items 3–7: need Brett-level specs before they can move to `architecting`.
- Overall timeline: 4 weeks + 2 weeks grace, **starts when Brett's Google Doc SOW is locked**, not before.
