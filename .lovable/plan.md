# Market Validation — Badge Tooltips + Clearer Wording

## What we are changing and why

The Market Validation page shows badges in 3 places. Each has a problem:

1. **Sub-score cards (pillar badges)** — say "High confidence" / "Medium confidence" / "Limited source coverage". The words "High/Medium confidence" are unclear — they sound like the AI is sure, but they actually mean "how many premium camps fed this number". We will rename them so the meaning is obvious.
2. **City pill** (Shortlist table + Live City Deep-Dive header) — says "⚑ Limited Source Coverage". The tooltip uses the plain HTML `title=""` attribute, which often does not appear (slow, no styling, sometimes blocked by hover layers).
3. **QA Queue** — shows "(AI certainty: 75%)" as plain text with no tooltip explaining what the number means.

Fix: use the real shadcn `<Tooltip>` component (same one used elsewhere in the app) so hover always works, looks consistent, and explains the reason behind each badge.

## New wording (sub-score stamp)

Old → New (label only, colors stay the same):

- "High confidence" → **"Strong data coverage"**
- "Medium confidence" → **"Partial data coverage"**
- "Limited source coverage" → **"Limited data coverage"** (kept similar, lowercase changed for consistency)

Reason: the stamp is driven by how many premium providers feed the sub-score (see `confidenceFor()` in `LiveCityDeepDive.tsx`). "Data coverage" matches what the code actually measures. The word "confidence" stays only on the QA Queue, where it really is the AI model's own certainty.

## Tooltip content (what each badge will explain on hover)

- **City pill "⚑ Limited Source Coverage"** — "More than 20% of premium providers in this city had missing or broken registration pages we could not read. The Market Validation Score still computed, but treat it with caution until those sources are fixed in the QA Queue."
- **Sub-score "Strong data coverage"** — "X premium providers fed this sub-score. Enough data points for a stable result."
- **Sub-score "Partial data coverage"** — "Only X premium providers fed this sub-score (or Y items are in the QA queue). Number may shift after QA review."
- **Sub-score "Limited data coverage"** — the existing per-key reason (no data scraped, too few providers, watchlist empty, etc.) plus a one-line meaning.
- **QA Queue "(AI certainty: 75%)"** — "This is the AI model's own self-rated certainty for the week status it guessed. Anything under 70% lands in this queue for a human to confirm."

## Files affected

- `src/components/phase2-demo/LiveCitySourcePanels.tsx` — `ConfidenceStamp`: rename labels, swap `title` for `<Tooltip>`.
- `src/components/phase2-demo/LowConfidenceBadge.tsx` — swap `title` for `<Tooltip>`.
- `src/components/phase2-demo/ShortlistTable.tsx` — city row pill: wrap in `<Tooltip>`.
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — header pill: wrap in `<Tooltip>`; pass richer `detail` strings into `ConfidenceStamp` if needed.
- `src/pages/MVSQAQueue.tsx` — wrap "(AI certainty: X%)" in `<Tooltip>`.

No scoring math, no DB writes, no Firecrawl logic touched. Presentation-only.

## Risk

Very low. Pure label + tooltip changes. `TooltipProvider` already wraps the app (used by sidebar and other components), so no provider plumbing needed.

## Phases & turns

- **Phase 1 (1 turn)** — Update `ConfidenceStamp` labels and tooltips, update `LowConfidenceBadge`, update the two city pill sites, update QA Queue line. Run `tsc --noEmit`.

That's the whole task in one safe phase.

## What to test after

- Hover each badge on `/market-validation` city table → tooltip appears.
- Open any city deep-dive → hover the header pill and each sub-score stamp → tooltips appear with clear text.
- Open `/mvs-qa-queue` → hover "AI certainty: X%" → tooltip explains the 70% threshold.
- Confirm wording reads: "Strong data coverage", "Partial data coverage", "Limited data coverage" on sub-score cards.

Waiting for your approval before I start Phase 1.
