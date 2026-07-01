
## What is left in Phase B

Here is the score card for Phase B:

| Phase | What it does | Status |
|---|---|---|
| B1 | Brand price propagation (amber "possible brand price") | ✅ Done |
| B2 | Directory-first queries (ActivityHero, Sawyer, CampPage) | ✅ Done |
| B2.2 | Hybrid brand + directory hints to Gemini | ✅ Done |
| B3 | **Google AI Overview / Answer Box scraper (Apify)** | ❌ **Not built — only remaining piece** |
| B4 | Manual Verify / Reject / Edit UI | ✅ Done |
| G | Guard-dropped pills in table + CSV | ✅ Done |
| UX-1 | Quiet chips + loud actions only on amber rows | ✅ Done |

So the only thing left is **B3**.

---

## Plan for B3 — Google AI Overview scraper

### What it is in plain words

When you Google "Code Ninjas Chicago summer camp price per week", Google now shows a small AI summary box at the top that often says the price directly, even when the actual website hides it behind a booking wall.

Right now our crawler asks Firecrawl to search the web and read pages. It does **not** read that AI summary box. Apify has a ready-made scraper ("Google Search Scraper" / AI Overview actor) that pulls that box as clean text.

**We will add a new fallback step:** when a provider still has no price after Firecrawl + directory + brand steps, we ask Apify for the AI Overview text, then send that text to Gemini for a price. If Gemini finds one, we save it as `price_needs_review = true` (amber "Needs human review") — same safety net as brand propagation.

### Why this should lift the missing count

Today's crawler fails on 3 kinds of camps:
1. Sites with a booking wall (Sawyer, Enrollsy, Jovial) — Firecrawl gets a login page.
2. Facebook / Instagram / Nextdoor listings — no clean markdown.
3. Sites where the price is a PDF or an image.

Google's AI Overview already reads these for us and writes one sentence like "Code Ninjas Chicago summer camps are $349/week." That is exactly what we need.

Expected lift on a fresh city: **+15 to +35 priced camps** on top of what Firecrawl+brand+directory finds. Rows land as amber "Needs human review" so a person confirms them.

### Files to touch

1. **New secret**: `APIFY_API_TOKEN` (I will request it via `add_secret` before writing code).
2. **`supabase/functions/mvs-discover-providers/index.ts`**
   - Add `fetchAiOverview(query)` helper that calls Apify actor `apify/google-search-scraper` with `resultsPerPage=1` and `saveHtml=false`, returns the `aiOverview.content` string.
   - Add new step **B3** in the catch-up loop, after brand + directory: if still unpriced, call `fetchAiOverview` with `"{provider name} {city} summer camp price per week 2026"`, then reuse the existing Gemini extractor with a small prompt tweak (`source: "google_ai_overview"`).
   - Mark saved rows: `platform = 'google_ai_overview'`, `price_needs_review = true`, `matched_query = the AI Overview text` (so the drawer shows the exact sentence and the user can verify).
3. **`src/pages/ProviderEvidence.tsx`**
   - Add `google_ai_overview` to the platform label map so the drawer says "Google AI Overview" not a blank.
   - No new columns.
4. **`src/pages/MVSMethodology.tsx`**
   - Add one line to Section 5 (Crawler Evolution) noting Step 9 = AI Overview fallback.

### Safety guards (kept from earlier phases)

- Apify call is wrapped in try/catch + 20-sec timeout. If it fails or returns no AI Overview, we skip and move on — nothing crashes.
- Extracted price still goes through `PRICE_RULES` guards (min $50, max $2500/wk, no phone numbers, etc.).
- Every B3 price is stored as `price_needs_review = true` → shows as amber "Needs human review" chip → user must click Verify. Nothing sneaks into the score silently.
- Budget guard: only run B3 on providers still unpriced after B1 + B2 (small subset, ~20-40 per city). Cost is ~$0.005 per call.

### Turns estimate

- 1 turn: add secret + write edge function change + typecheck + deploy.
- 1 turn (optional): update methodology doc + drawer label.

Total: **1-2 turns**.

---

## Your testing questions

### Force Fresh vs Catch-Up Missing Prices button — which to hit?

**Hit "Catch-Up Missing Prices"** — do NOT Force Fresh.

Reason:
- Force Fresh throws away the current 200+ good priced camps and rebuilds the whole city from zero (30-45 min, uses a lot of Firecrawl credits).
- Catch-Up only runs on the ~20-40 rows that still say "no price" and appends B3 as the new final step. Takes ~3-5 min, no risk to existing good data.
- If B3 lifts the priced count, you keep all the old wins AND get the new ones.

### Which city to test on?

**Chicago.** Reasons:
- Big city → lots of providers → good sample size to see the lift.
- We have not run catch-up there since B2.2 shipped, so the "before" number is a clean baseline.
- Not Austin (already at 6 unpriced, no room to show lift) and not Columbus/Boston (already fully cooked, small residual).

### How B3 lifts prices differently vs existing crawler

| Step | Existing crawler | New with B3 |
|---|---|---|
| Booking-wall sites (Sawyer, Jovial) | Gets login page → drops | Reads Google's AI summary → gets price |
| Facebook / Instagram listings | No markdown → drops | AI Overview quotes the post → gets price |
| PDF price sheets | Firecrawl skips | Google indexed the PDF → AI Overview quotes it |
| Sites where price is an image | Blank → drops | Google OCR'd it → AI Overview has the number |

Concretely on Chicago I expect: current unpriced ~30-50 → after B3 catch-up ~10-20 unpriced, with 15-30 new **amber rows** for you to Verify with one click.

---

## What I will NOT touch

- Force Fresh flow (unchanged).
- Existing scoring, Provider Explorer, Evidence Drawer layout, UX-1 chips.
- Any other city's data.
- The 90/120 day freshness policy.

---

## Ask for approval

Reply **"go B3"** and I will:
1. Request the `APIFY_API_TOKEN` secret.
2. Ship the edge function change + drawer label + methodology line in one turn.
3. Tell you exactly which button to hit on Chicago and watch the before/after with you.
