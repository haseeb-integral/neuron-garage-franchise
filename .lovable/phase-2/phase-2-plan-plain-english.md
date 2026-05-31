# Phase 2 — Plain-English Plan

*Companion to the formal SOW and the technical execution plan. This is the human-readable layer. If anything here conflicts with the SOW, the SOW wins.*

---

## Summary

Phase 2 turns the Neuron Garage acquisition platform from a research tool into something Brett can run a real franchise pipeline on. There are 9 items in scope. We are giving ourselves 4 weeks to build, plus a 2-week grace window for fixes and items that land late. Nothing gets built until Brett locks the SOW. Heavy data work is handled by Manus; everything you see on screen is handled by Lovable.

---

## The 9 items, in 3 tiers

We grouped the 9 items by **how ready each one is to build today** — not by how important they are. Tier A is what we can start on the day the SOW is locked. Tier B needs Brett to write the spec first. Tier C is honest about what probably slips past 6 weeks.

### Tier A — Ready to build on day one

**Item 1 — Market Validation Engine.** Scores every city on the shortlist for whether the market actually wants what Neuron Garage sells. You'll see a single calibrated score per city, with the six things that drive it shown underneath, plus a one-click branded PDF report. Success means LeafSpring-class markets land at the bottom and the obvious top markets (Bay Area suburbs, Seattle Eastside, North Dallas, NoVA, Boston) land at the top.

**Item 2 — Site Analysis Engine.** Type in a school address, get a score for whether that specific building is a good site. Compare up to 4 sites side-by-side. Branded per-site PDF report with isochrone maps (10 and 15 minute drive). The single most important gate here: **LeafSpring's address must score materially lower than Trinity's**. If it doesn't, weights get reworked before we ship.

**Item 3 — Notes & Activity tab redesign.** Brett demos his Google Form, we rebuild that form inside the candidate detail's Notes & Activity tab so entries are structured and searchable instead of a wall of text.

### Tier B — Needs Brett's spec before we can start

**Item 4 — Candidate-facing form and page.** The candidate fills it in, logs back in to see their own status. We need Brett to decide what fields the form asks for and what the candidate sees on the other side. We can scaffold the login/security side in Week 1 without the spec, but the actual form is blocked.

**Items 5, 6, 7.** These are listed in the SOW as "TBD — Brett to fill." We can't sequence work on them until Brett writes 1–2 paragraphs each on what they are and what success looks like.

### Tier C — Probably slips past 6 weeks

**Item 8 — Video Training module.** New ask from Sam's May 29 call. The videographer needs to shoot the live Austin and Telluride camps first, then we wrap a player and tracking around the footage. The shoot timing alone probably pushes this past 6 weeks.

**Item 9 — 4th Manus app (CSI / market saturation index).** Sam wants this stand-alone, separate from the Market Balance Index in Item 1. Needs its own architecture pass with Manus before we can scope it.

---

## Who does what

- **Manus** owns the heavy data work: scraping camp websites, extracting registration status, cleaning the data, and writing it into the database. They run on their own cadence.
- **Lovable (me)** owns everything you see on a screen: the scores, the sliders, the formula drawers, the PDF reports, the new pages, the candidate login. I read from the data Manus produces — I don't recreate it.

---

## The 6-week shape

**Week 1 — Architecture lock.** SOW signs off. Brett picks the map vendor (or lets me default to Mapbox). I lock the shape of the data Manus is going to hand me. Manus stands up the absorption pipeline on a 3-city pilot. No user-facing work ships this week.

**Weeks 2 to 4 — Build.** Tier A ships in this window. Item 1 wires up first, then Item 2's site analyzer, then the PDF reports for both, then the Notes & Activity tab. Manus expands their pipeline to the full 25-city shortlist. If Brett gets the specs in for any Tier B item early in Week 2, those slot into Week 3 or 4.

**Weeks 5 to 6 — Grace.** Bug triage from Brett and Sam reviewing Tier A. Any Tier B items with specs from Week 2 land here. The LeafSpring-vs-Trinity calibration test happens here — if it fails, weight rework happens here too.

---

## Risks, ranked

**High risk**

- *Specs for Items 4 through 9 never arrive.* What we do: ship Tier A on its own and call it a win. Tier A alone is genuinely useful.
- *LeafSpring scores as high as Trinity in Site Analysis.* What we do: pause the rollout, rework the weights, re-test. This is the calibration gate that protects the whole product's credibility.
- *Manus data shape changes mid-build.* What we do: I lock the data contract in Week 1 and version it. Any changes after that are a new ticket, not a silent break.

**Medium risk**

- *Firecrawl gets blocked or rate-limited on camp websites like Sawyer or CampMinder.* What we do: use the human-QA queue as the fallback — anything the scraper can't read confidently gets a screenshot and a four-button correction.
- *Map / isochrone API costs spike if Site Analysis gets used heavily.* What we do: add a usage meter, cap at 100 sites/month, alert before the cap is hit.
- *The "one calibrated number everywhere" rule drifts and different screens show different scores.* What we do: every screen reads from one shared helper; we add a check that fails the build if a screen tries to compute its own score.

**Low risk**

- *Census data is thin in small markets (Telluride-class).* What we do: show a "low confidence" badge on those cities. The SOW already accepts this.
- *PDF report generation is slow.* What we do: generate in the background, notify when ready. Not a blocker.

---

## What "done" looks like for Phase 2

- Tier A is live: Market Validation, Site Analysis, and the new Notes & Activity tab. Both PDF reports generate cleanly.
- The LeafSpring-vs-Trinity calibration test passes.
- The external-proxy markets (Bay Area, Seattle Eastside, North Dallas, NoVA, Boston) land in the top quartile of the 25-city shortlist.
- Tier B and C items are either shipped (if specs arrived early) or have a clean handoff into Phase 2.5 with their specs written.

---

## What I need from Brett to start

1. **Lock the SOW.** One message that says "SOW is locked." After that, no scope changes mid-build without a new turn.
2. **Fill the TBD sections** for Items 3 (full spec, not just the Notes & Activity tab), 5, 6, 7, 8, and 9 — 1 to 2 paragraphs each is enough.
3. **Confirm the map vendor**, or tell me to default to Mapbox. This is the only Week 1 decision that blocks me.
