# Can a new user trust the MVS numbers today? Honest audit + safe add-ons

## 1. What the page already shows to build trust

For the overall score and the 5 sub-scores, the page already shows:

- The **number** (0–100) for each pillar and the overall MVS.
- A **plain-English meaning chip** (e.g. "Strong premium pricing", "Balanced market").
- A **weight chip** (e.g. 25%) and a **preview slider** to test sensitivity.
- A **Confidence stamp** (High / Medium / Low) per card.
- An **inputs list** (the raw numbers that fed the score, like provider count, median price, coverage ratio).
- **"How this score is calculated"** — the formula in plain text.
- **"Where the data comes from (N)"** — list of sources per pillar.
- A **Data Sources strip** at the top (providers, weeks, ACS, watchlist, last refreshed, QA open count).
- A **National Operators** panel (evidence for Scaled Operator).
- A **Premium Providers — live** table with source chips and a link icon to the original listing.
- A **coverage warning** when more than 20% of sources are broken.
- A **header note**: "Computed from N providers and M week rows."

**Verdict in simple words:** The page already tells you the score, what it means, what went in, the formula, and where the data came from. For a careful user, this is a solid base. But a brand-new user (Sam, Brett, a teacher) still has 4 trust gaps. They cannot easily answer: *"How fresh is this? How sure are you? What would change the score? Can I click one provider and see the proof?"*

---

## 2. The 4 trust gaps a new user will still feel

| # | Gap | Why it hurts trust |
|---|-----|---|
| A | **Freshness per pillar** | The page shows one "last refreshed" date at the top. But Pricing came from a scrape last week, ACS is from 2023, the watchlist updated today. A user cannot tell which input is stale. |
| B | **Confidence reasoning is hidden** | The Confidence stamp says "Medium" but the *why* is in a tooltip. New users miss it. They also do not see how many providers / sources actually contributed vs. how many were expected. |
| C | **No click-through from a number to its proof** | The Pricing card shows "median $X". A user cannot click that number and see the 6 providers and the exact price rows that produced it. Trust drops when the math is a black box. |
| D | **No "what could be wrong" honesty** | The page never lists known limitations (e.g. "ACS income is 2023", "only 8 of 14 providers had readable price pages", "no weekend camps counted"). Honesty about limits *increases* trust, not decreases it. |

There is also a small 5th gap: no **peer benchmark** ("Austin scores 72; the median across 23 scored cities is 64"). Without a reference point, a number on its own feels arbitrary.

---

## 3. Safe add-ons I recommend (UI only, no math changes)

All of these read data already on the page or already in Supabase. None change scoring, weights, Firecrawl, edge functions, or pipeline logic. None re-add Market Absorption.

### Tier A — biggest trust lift, lowest risk (do first)

**A1. "Why this confidence" line under each card's chip.**
One short sentence built from existing data, e.g.
*"Medium confidence — based on 8 of 14 providers with readable prices, 2 sources broken."*
Reads `provCount`, coverage ratio, and `qaOpenCount`. Pure UI.

**A2. Per-input freshness pills.**
Next to each row in the inputs list, show a tiny date pill: `ACS 2023`, `Scraped Jun 22`, `Watchlist today`. Reads the timestamps already on `providers`, `weeks`, and `acs`. No backend change.

**A3. "Known limitations" expandable below the 5 cards.**
A short bullet list generated from the same signals already on the page:
- "X of Y provider pages were unreadable (see QA Queue)."
- "ACS income data is from 2023."
- "Z providers had no price; excluded from Pricing Acceptance."
This is honest and increases trust, not decreases it.

### Tier B — medium lift (do after Tier A is tested)

**B1. Click a number → see the rows behind it.**
On the Pricing card, make "median $X" clickable. It opens a small popover listing the exact providers and prices that fed that median. Same for "provider count" on Market Depth, "categories" on Enrichment Diversity. Uses the `providers`/`weeks` arrays already in memory.

**B2. Peer benchmark line on the header.**
Under the big MVS number, one line: *"Median of 23 scored cities: 64. Austin is in the top quartile."* Reads from the existing scored-cities list. Read-only.

### Tier C — nice to have (only if Brett asks)

**C1. "What if a weight changed" delta hint.**
When the user drags a weight slider, show *"MVS would move 72 → 68"* live. Already computed in `computeMvs`; just surface the delta.

**C2. Source-level trust badge in the Premium Providers table.**
A tiny dot per row: green if scraped clean, yellow if partial, red if in QA queue. Uses fields already on `mvs_providers`.

---

## 4. What I will NOT touch

- Scoring math, weights defaults, `computeMvs`, `useLiveMvs`.
- Firecrawl, Supabase tables, edge functions, pipeline.
- Market Absorption (stays removed). Weekly absorption evidence (stays removed).
- The premium providers table structure, National Operators panel, Data Sources strip.

---

## 5. Suggested phasing (so you can test between each)

| Phase | What | Est. turns |
|---|---|---|
| 11.1 | Tier A1 + A2 (confidence reason line + per-input freshness pills) | 1 turn |
| 11.2 | Tier A3 (Known limitations panel) | 1 turn |
| 11.3 | Tier B1 (click-a-number popovers) | 1–2 turns |
| 11.4 | Tier B2 (peer benchmark line) | 1 turn |
| 11.5 | Tier C1 + C2 (only if you want them) | 1 turn |

**Risks:** very low. All UI-only, all reads existing data. The one thing to watch is the click-a-number popovers (B1) — they need careful filtering so the rows shown match exactly what the formula used. I will mirror the same filter `computeMvs` uses, not invent a new one.

**My recommendation:** approve **Phase 11.1 first** (confidence reason line + freshness pills). That single phase closes the two biggest trust gaps in one small, safe change. Then test, then decide on 11.2.

Please tell me: approve 11.1 only, or approve 11.1 + 11.2 together?
