## Audit: Why human Google looks richer than our Firecrawl result

### What our code actually does today
File: `supabase/functions/mvs-discover-providers/index.ts`, function `runGoogleSearch`.

For each of 6 queries we call **Firecrawl `/v2/search`** with:
- `limit: 6` results
- `scrapeOptions: { formats: ["markdown"], onlyMainContent: true }`
- `excludeDomains` includes `reddit.com`

For each returned result we keep `markdown` (truncated to 6000 chars per result), glue all 6 together, and send to Gemini with the price-literal guard.

The city is fed into the query as `${city} ${state}` where `city` is the raw row value — when the row already contains `"Columbus, OH"` and `state` is `"OH"`, we get **"Columbus, OH OH"**. That's the bug source.

---

### Answers to your questions

**1. Is `/v2/search` returning full markdown or just snippets?**
Full markdown. We pass `scrapeOptions.formats: ["markdown"]`, so Firecrawl scrapes each top-N result page. We are NOT limited to Google's 2-line snippet.

**2. Then why are prices still missing?**
Five concrete reasons, in order of impact:

a. **`limit: 6` per query.** Google's organic list of price-rich pages (CAP4Kids, Columbus.gov rec centers, YMCA, Metro Parks, CSG, Country Club) is longer than 6. Many price pages never enter our markdown blob.
b. **`onlyMainContent: true` strips price tables.** Camp price grids often live in sidebars, accordions, or "rates" widgets that boilerplate strippers cut.
c. **6000-char truncation per result.** Long rec-center pages with the price table near the bottom get cut before the dollar amounts.
d. **Price guard is per-page literal match.** A provider listed on page A with the price on page B gets the price dropped because the literal `$NNN` is not in A's markdown. This is correct behavior but it nukes real prices.
e. **AI Overview is invisible to `/v2/search`.** Firecrawl's search reads organic results, not the AI Overview box. The block of 8+ providers you saw at the top is not in our pipeline at all.

**3. Does Firecrawl return Google AI Overview?**
No. `/v2/search` returns organic results only. AI Overview is rendered by Google's own model and is not exposed in Firecrawl's search response.

**4. Can we capture AI Overview reliably?**
Not through Firecrawl. Two indirect options:
- Scrape `google.com/search?q=...` as a page (fragile — Google blocks, layout changes, ToS-grey, and the box doesn't always render headlessly).
- Use **Gemini with Google Search grounding** through Lovable AI Gateway — gives you a similar synthesized answer **plus** a `groundingMetadata` list of source URLs. This is the reliable path.

We should **not** treat AI Overview text as canonical proof. We can use grounded answers as **leads**, then verify each price by scraping the cited source URL.

**5. Could Gemini-with-grounding replace some Firecrawl calls?**
Yes, partially. One grounded Gemini call can return "here are 8 providers with weekly prices and the URL each came from" — cheaper than 6 Firecrawl searches. But it still needs Firecrawl follow-up to actually save evidence (markdown + screenshot) for the cited URLs.

**6. Should we `/v2/scrape` top URLs after `/v2/search`?**
Mostly **no**, because `scrapeOptions` already scrapes them. Two narrow exceptions where a second `/v2/scrape` is worth it:
- The page has price info but we have it under `onlyMainContent: true` — re-scrape with `onlyMainContent: false`.
- The page is paginated / has a "rates" subpage linked from the main page — scrape that one extra URL.

**7. Reddit/forum results — include?**
Keep `reddit.com` excluded from primary discovery (low trust, parent quotes are stale, names misspelled). But allow it as **lead-only**: if grounded Gemini cites a Reddit thread, we record it as "Needs Review" evidence and never auto-populate price from it.

**8. Why did query #4 ("kids music art gymnastics studios…") find many providers but 0 prices?**
That query targets studio listicles, which name businesses but rarely publish weekly rates. The query is doing its job (provider discovery), not pricing. This is expected, not a bug — they are two different sub-goals.

**9. The "Columbus, OH OH" duplicate-state bug**
Real. The city field already includes ", OH" in some rows. The query builder appends `state` again. Safe one-line fix:

```ts
const cleanCity = city.replace(/,\s*[A-Z]{2}\s*$/i, "").trim();
```

Then use `cleanCity` in the 6 query strings. **Yes, fix this before any further test runs** — the duplicate token measurably degrades Google relevance ranking.

---

### Root cause (one sentence)

We get full markdown from `/v2/search`, but we throttle it to 6 results × 6000 chars × `onlyMainContent`, and we ignore Google's AI Overview entirely — so a human browsing Google sees ~20 price points while we only see whichever 6–8 happen to survive those filters.

---

### Recommended approach (Phase 3 design proposal — not code)

A 3-step "richer extraction" path that keeps cost predictable:

**Step 1 — Loosen the search call (cheap, no extra calls)**
- Raise `/v2/search` `limit` from 6 → **10** for the pricing-specific query only (the other 5 stay at 6).
- For the pricing-specific query only, set `onlyMainContent: false` and bump per-result truncation from 6000 → **12000** chars.
- Apply the duplicate-state regex fix.
- Net Firecrawl cost: **+0 calls** (same number of search requests, just richer payload). Token cost on Gemini side: ~2× the pricing-query blob, ~$0.02/run.

**Step 2 — Add ONE Gemini-with-Google-Search-grounding call per run**
Single call: *"Weekly prices for kids summer camps in {city, state}. List provider, weekly price range, and the source URL."*
- Returns a structured list + cited URLs.
- We treat the list as **leads only** — provider names get merged, prices stay null until verified.
- ~$0.005 per city, 0 Firecrawl calls.

**Step 3 — Targeted `/v2/scrape` on cited URLs that we don't already have**
- Take the deduped URL list from grounding + the top 3 `/v2/search` URLs that had a provider but no price.
- Cap at **5 extra scrapes per run** (`onlyMainContent: false`, screenshot on).
- Run the price-literal guard against each scraped page's own markdown.
- Net Firecrawl cost: **+5 calls** worst case. Fits inside the existing 50-call `MVS_PIPELINE_FIRECRAWL_CAP` (Columbus used 13).

Estimated new pricing coverage: **35–50%** vs today's ~22%.

---

### Cost impact

| Item | Today | Proposed | Delta |
|---|---|---|---|
| Firecrawl `/v2/search` calls | 6 | 6 | 0 |
| Firecrawl `/v2/scrape` calls (new, capped) | 0 | up to 5 | +5 |
| Gemini extraction calls | 6 | 6 | 0 |
| Gemini grounded call | 0 | 1 | +1 |
| Total Firecrawl per city | ~13 | ~18 | +5 |
| Approx $ per city | ~$0.04 | ~$0.06 | +$0.02 |

Still well under the 50-call cap.

---

### Risks

- **AI Overview format changes** — mitigated because we use Gemini grounding, not Google scraping.
- **Grounded answers can hallucinate prices** — mitigated by the literal-match guard already in place; any price not found in the cited URL's markdown gets dropped to `null`.
- **More raw markdown per query** raises Gemini token use slightly — bounded by the per-query 12000-char truncation.
- **Reddit creeping in via grounding citations** — mitigated by tagging those leads `verification_status='needs_review'` and never auto-saving the price.

---

### Data to save for human verification

For every kept price, store (already partly stored — add the bold items):
- Provider name + URL
- The **exact source URL** the price came from
- The **markdown snippet** (±200 chars around the dollar amount) — **NEW**
- The **query or grounded prompt** that surfaced it
- `extraction_method`: `search_scrape` | `targeted_scrape` | `grounded_lead` — **NEW**
- Guard result (kept / dropped + reason) — already stored
- Screenshot of the source listing page — already stored for discovery pages; **add for targeted scrapes**

---

### Impact on the Provider Evidence Review screen

Small additions to the drawer, no schema break:
- New row "Extraction method" (search_scrape / targeted_scrape / grounded_lead).
- "Source snippet" block showing the ±200-char window around the dollar amount.
- "Grounded leads" section listing any URLs Gemini cited that we did **not** end up scraping.
- Filter chip: "Method" so a human can audit just the grounded leads first.

Phase E4 (verification buttons) is unchanged and still parked.

---

### Duplicate-state bug

**Fix it before any more test runs.** It is a one-line regex change, isolated to `runGoogleSearch`. Every measurement we take with the bug present is contaminated — Google's ranker punishes `"Columbus, OH OH"` and we cannot judge whether Step 1/2/3 work until that noise is gone.

---

### What I want you to approve next

Pick any combination:

- **A.** Apply only the one-line duplicate-state fix now, no other changes.
- **B.** Phase 3.1 — Step 1 (loosen search call + state-fix). Smoke test Columbus + Boston + Austin.
- **C.** Phase 3.2 — Step 2 (add grounded Gemini call). Smoke test same 3 cities, compare.
- **D.** Phase 3.3 — Step 3 (targeted scrape on cited URLs). Final smoke test.
- **E.** All of B+C+D in one shot.

My recommendation: **A first** (one tiny safe change), then **B**, measure, then decide on C and D from real data. Do not start Phase 4 (per-provider deep scrape) until 3.1–3.3 results are in.