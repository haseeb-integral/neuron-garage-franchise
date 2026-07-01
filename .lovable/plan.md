
# Phase A build now + B1 clarification (answers before build)

---

## Part 1 — Phase A: Provider Evidence UI clarity (build immediately)

**One file only:** `src/pages/ProviderEvidence.tsx`. Presentation-only.

### Change 1 — Rename the checkbox and add a tooltip
- Old label: **"Show excluded locations (38)"**
- New label: **"Include excluded locations (+38)"**
- Tooltip on hover: *"When ticked, the 38 non-camp locations are added below the active camps. When unticked, only the 228 active camps are shown."*

### Change 2 — Make the counter honest
- Checkbox **off** (default): show `184 of 228 active camps` as today, plus a small grey chip `+38 excluded (hidden)`.
- Checkbox **on**: change to `228 active + 38 excluded = 266 shown`.
- No math changes, only the label.

### Change 3 — On-screen table fallback (mirror the CSV fix already shipped)
For each table row, when the debug-log match is missing:
- `Source query` cell → fall back to `platform` in muted grey with tooltip *"No debug query recorded for this row — showing discovery platform instead."*
- `Source type` cell → same platform fallback.
- `Source URL` cell → extend the fallback chain to: `matched_provider_entry.url → source_listing_url → url → website_url`. If all four are null, show `—` (unchanged).

### Files touched
- `src/pages/ProviderEvidence.tsx` only.

### Risks
None. No data, no queries, no edge functions, no scoring, no other cities touched.

### Turns
1.

### How to test after build
1. Open `/provider-evidence?city=Austin&state=TX`.
2. Confirm counter reads `184 of 228 active camps` with a small `+38 excluded (hidden)` chip.
3. Tick the checkbox → counter reads `228 active + 38 excluded = 266 shown`.
4. Find `Austin Waldorf School` row → Source query/type now shows the platform (e.g. `sawyer`) in grey, Source URL opens the saved website.
5. No previously-visible row disappears, no price value changes.

---

## Part 2 — B1 clarification (answers to your six questions, no build yet)

You are right to push back. Copying a brand price onto a different physical location without guardrails is unsafe. Here is a corrected, safer B1 design that answers each of your concerns.

### Q1. "Is B1 copying a price from one brand/location row into another location row?"
Only under strict conditions, and only as a **suggestion**, never as a verified price. If any condition fails, we leave the row unpriced. We never copy across cities. We never overwrite an existing price.

### Q2. "When is it safe to copy a price?"
Only when **all six** of these are true:
1. Both rows are in the **same city and state** (never cross-city).
2. Both rows share the **same brand token** (e.g. both start with "idea lab kids"). Fuzzy match must have ≥2 significant shared words.
3. The unpriced row has `price_min IS NULL AND price_max IS NULL` (we never overwrite anything).
4. There are **≥2 priced siblings** in the same city, and their prices agree within **±15%**. If only one sibling exists, or siblings disagree, we skip.
5. The sibling price passes the existing $50–$5,000 sanity guard.
6. The sibling row is not itself already `derived_from_brand` (no chain copying).

If any one fails → row stays unpriced. No guess.

### Q3. "How do you prevent copying the wrong location's price?"
- Same city+state hard filter (rule 1).
- ≥2 siblings with ±15% agreement (rule 4) — a single outlier can't propagate.
- The derived row records `derived_from_provider_id`, `derived_from_price`, `derived_at`, and how many siblings agreed. One SQL can undo every derived row later.
- Central Austin vs Northwest Austin: if both are unpriced and only "Idea Lab STEM Camps" has a price, that is **1 sibling** → we skip both. If a future run finds Central Austin's actual price, then Northwest still needs its own sibling; we do not propagate Central → Northwest.

### Q4. "Will `derived_from_brand` be treated as Needs Review, not fully verified?"
Yes. Three explicit signals so no human or downstream job mistakes it for a verified price:
- `platform = "derived_from_brand"` (visible in table + CSV).
- `confidence = 0.5` (below the 0.7 threshold the tier classifier uses for "trusted").
- New row-level badge in Provider Evidence table: amber pill **"Possible brand price — needs review"**.
- Tier classifier will **exclude** these rows from median/percentile math until verified (one-line filter). They still show in the table so a human can confirm or reject.

### Q5. "Will it avoid overwriting any existing verified price?"
Yes, hard rule. The WHERE clause is `price_min IS NULL AND price_max IS NULL`. We literally cannot touch a row that already has any price value.

### Q6. "Can we instead show it as 'possible brand price found' until a human verifies it?"
Yes — that is exactly what this revised design does. The row shows amber "Possible brand price — needs review", excluded from scoring math, one click to accept or reject from the Evidence Drawer (reuses the Phase E4 verification buttons that are already stubbed as disabled — B1 will keep them stubbed and only add the amber badge; wiring Accept/Reject to write-back is a separate Phase E4 job that stays parked).

### Extra safety additions to B1 (new since your pushback)
- **Never cross-city.** Same city+state only.
- **Minimum 2 siblings** with ±15% agreement (was 1 sibling in the earlier plan — now stricter).
- **Excluded from scoring math** until human verified.
- **One-SQL revert:** `UPDATE mvs_providers SET price_min=NULL, price_max=NULL, platform=NULL, confidence=NULL WHERE platform='derived_from_brand'` — undoes every derived row in one shot if we ever regret it.

### The `min > max` swap fix (part of B1, independent and always safe)
Separate from brand copying, we also add a tiny guard so any future extractor write that produces `price_min > price_max` gets automatically swapped, and a one-time SQL fixes existing bad rows (`Idea Lab STEM Camps` $415/$45 → $45/$415). This has no false-positive risk — swapping is unambiguously correct.

### What I need from you before building B1
Please confirm the revised B1 design (same-city only, ≥2 siblings ±15%, never overwrite, excluded from scoring, amber "needs review" badge, one-SQL revert). Once you approve, B1 is 1 turn: edge function edit + one-time SQL swap-fix + UI amber badge in `ProviderEvidence.tsx`.

**Meanwhile, please approve Phase A above so I can ship it now.**
