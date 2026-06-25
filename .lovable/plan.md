## What we are changing and why

Three small UI refinements on the Pricing Acceptance card only, to improve readability before we copy the layout to the other 4 cards.

### 1. Move Weight preview slider below Trust
The card currently shows the weight slider near the top, before Result/Evidence/Trust. We will move it so the reading order becomes:
- Result
- Evidence  
- Trust
- Weight preview
- Formula / Sources

Only the Pricing Acceptance card changes. The other 4 cards keep their current layout.

### 2. Remove "Market:" from the meaning chip
The colored band chip currently says "Market: weak premium pricing". We will remove the "Market:" prefix so it reads "Weak premium pricing". This also cleans up the chips on the other 4 cards because they share the same helper.

### 3. Cleaner Trust section
Current Trust section crams confidence + detail + Data chip into one paragraph. We will split it into two clean lines:
- Line 1: "Medium confidence" (or High / Low)
- Line 2: "8 of 12 providers had readable prices." (the detail sentence)
- Keep the existing "Data: partial" chip beside the detail.

Only the Pricing Acceptance card gets this cleaner layout.

## Which files are affected
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — card JSX reordering, band label helper edit, and Trust section reformatting.

## What is NOT touched
- Scoring math, weights, slider logic, popovers, backend, Firecrawl, Supabase, edge functions, pipeline logic, or saved data.
- The other 4 Market Validation cards.
- Global confidence logic for non-Pricing cards.

## Risk and testing
Very low risk — only UI copy and ordering changes. After implementation we will smoke test the Pricing Acceptance card to confirm the new reading order and cleaner Trust line.