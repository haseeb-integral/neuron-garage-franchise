
# Market Validation Confidence — Rewording (approved, badge name = "Limited Source Coverage")

## What I will change (text only, no logic)

| File | Current | New |
|---|---|---|
| `src/components/phase2-demo/LowConfidenceBadge.tsx` | Badge label: "Low conf." / "Med. conf."  •  Tooltip: "Routed to human QA queue (confidence < 0.7)" | Badge label: **"Limited Source Coverage"** (both levels)  •  Tooltip: "More than 20% of premium providers in this city had missing or broken registration pages. Treat the MVS score with caution." |
| `src/pages/MarketValidation.tsx` (line ~265) | "**QA note:** …" | "**Source coverage note:** …" |
| `src/pages/MarketValidation.tsx` (line ~530) | "QA queue = manager review of low-confidence week extractions flagged by the pipeline." | "QA queue = manager review of week extractions where the AI was unsure (AI certainty < 70%). The 'Limited Source Coverage' badge on a city means more than 20% of premium providers had missing or broken registration pages — treat that city's MVS score with extra caution." |
| `src/pages/MVSQAQueue.tsx` (line ~437) | "(75% confidence)" | "(AI certainty: 75%)" |

No backend, no scoring math, no DB, no Firecrawl logic touched.

## Then I will give you the 2 Google Doc paragraphs

- **Para 1 — Before:** plain English description of where "confidence" appeared and how each one was calculated (per-week AI 0–1, city low-confidence badge from broken pages, sub-score high/med/low).
- **Para 2 — After:** what the new labels say and why ("Limited Source Coverage", "AI certainty", "Source coverage note") and confirmation that no scoring logic changed.

---

**Please switch to build mode so I can apply the 4 edits.** Plan mode is read-only; the edits above will run as soon as you switch.
