# Plan: Add Overlap + Cadence Section to v5 Doc

Extend `/mnt/documents/Neuron-Garage-Manus-App-Decisions-v5.docx` (and its PDF) with a new section that spells out — in plain English — exactly how Market Balance Index (MBI) overlaps with the existing CSI, and how often each score needs to refresh. Goal: Brett can read it once and have zero ambiguity.

## Where it goes

Insert a new section **right after Decision 1 (Market Saturation / CSI)** and before Decision 2 (Market Absorption). Titled:

> **Decision 1 — Deeper look: What's inside Market Balance Index, and does it really overlap with CSI?**

This keeps Decision 1's recommendation honest (it's "mostly overlap, not 100%") and gives Brett the receipts.

## Content (plain English, no jargon)

### 1. What Market Balance Index actually measures
One short paragraph: MBI is a single signal — **Coverage Ratio = kids ÷ providers** — then banded into 4 tiers (Underserved / Balanced / Competitive / Saturated, thresholds 350 / 200 / 100). It needs exactly two inputs.

### 2. What the existing CSI already measures
One short paragraph: CSI counts STEM brands (2× weight), general enrichment brands (1× weight), plus a local-provider estimate, and outputs a 0–100 saturation score per city.

### 3. Overlap table (the key visual)

| What MBI needs | Does CSI already have it? | Gap |
|---|---|---|
| Kid population (children 5–12) | Yes — Tier 1 ACS data | None |
| Provider count per city | Yes — CSI counts them today | Premium-only filter missing (CSI counts all brands; MBI wants ≥$400/week providers only) |
| 4-tier band output (Underserved / Balanced / Competitive / Saturated) | No — CSI outputs 0–100 | Need a re-band step on top of CSI |

**Honest summary line under the table:** ~90% of the plumbing is shared. The two real additions are (a) a premium-price filter on the provider list, and (b) a re-banding step. Neither needs a new Manus app — both can live inside the existing CSI pipeline.

### 4. Cadence table

| Score | Refresh cadence | Scope | Why this cadence |
|---|---|---|---|
| CSI (existing) | ~1× / year | All 817 cities | Provider counts move slowly |
| Market Balance Index | Same cycle as CSI (it's derived from CSI) | 25–50 shortlisted cities only | Just a re-band of CSI; no independent pipeline |
| Market Absorption (Decision 2) | ~5× / year per shortlisted city | 25–50 shortlisted cities only | Sellout / waitlist state changes week to week |

**Plain-English line under the table:** MBI does not need its own refresh schedule. Whenever CSI refreshes, MBI refreshes for free. That's the whole point of folding it into CSI.

### 5. Bottom line (one bolded sentence)
Build CSI once, run it yearly across all 817 cities, then derive MBI from it for the 25–50 shortlist. One pipeline, one cadence, one source of truth.

## Styling

Match v5's existing palette and structure:
- Section heading in `#174BE8` blue, same H2 style already used in the doc.
- Tables: `#EEF2F7` header row, `#CCCCCC` borders, `ShadingType.CLEAR`, DXA widths summing to content width (9360).
- Body in default Arial, muted `#526078` for supporting prose.
- Bottom-line sentence in a `#F7FAFF` callout box (same box style used elsewhere in v5).

## Build steps

1. Update `build-v5.js` (the existing generator script) — insert the new section between Decision 1 and Decision 2.
2. Re-run the script to regenerate `Neuron-Garage-Manus-App-Decisions-v5.docx`.
3. Convert to PDF via LibreOffice (same path as last build).
4. Render page images via `pdftoppm` to verify both tables render cleanly and nothing overflows.

## Out of scope

- No changes to Decision 2 content.
- No changes to v4 docs.
- No code, route, Supabase, or `.lovable/phase-2/` edits.
- No new questions for Brett — this is just making the existing recommendation more explicit.
