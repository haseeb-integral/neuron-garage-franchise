### 1. Answers to your questions

**Why did we stubbornly use `site:hisawyer.com` or complex queries before?**
Originally, the idea was "precision over noise." If we searched standard Google, we were worried the AI would get confused by ads, blog articles mentioning national averages, or random reviews. So the old code tried to force Google to only look inside specific booking platforms (like Sawyer) or exact website URLs. But as you proved, real people search naturally (`whetstone columbus camp price 2026`), and Google's search engine is smart enough to pull the exact answer to the top snippet. Our over-engineered filters actually blinded us to the best answers.

**If we use simple natural Google queries, do we still need Tavily?**
**No, we do not need Tavily.** Firecrawl’s Search endpoint (`/search`) already lets us search Google. If we give Firecrawl plain natural queries like `"[Provider Name]" Columbus camp weekly price tuition` and remove the dumb AI guardrails that drop valid prices, Firecrawl + Google Search snippets will find the prices just fine. Skipping Tavily keeps our app simpler, saves money, and avoids needing a brand new API key.

---

### 2. What we are changing and why (Updated Plan)

We are simplifying the entire Catch-up Crawler to act like a real human searching Google:
1. **Plain Natural Search Queries:** Instead of restricting searches to exact domains or `site:` filters, the background catch-up worker will search Google naturally: `"[Provider Name]" [City] summer camp tuition price per week`.
2. **Remove Dumb Guardrails:** We will delete the hyper-strict instruction (`"Only return if exact dollar amount explicitly appears in markdown"`) and relax the regex checker so that package prices (e.g., $165 on KidsLinked) and snippet answers (e.g., $120 on Whetstone) are accepted.
3. **Deconstruct Subpaths:** For camps with direct websites (like `schoolofrock.com`), we will allow the crawler to check obvious pricing subpages like `/camps` or `/music-camps`.

---

### 3. Affected Pages, Components, APIs, & Tables

- **Edge Function:** `supabase/functions/mvs-discover-providers/index.ts` (updates to `catchupBatch`, query generation, and price selection guards).
- **Database Table:** `public.mvs_providers` (saving newly discovered `price_min`, `price_max`, `confidence`, and `source_listing_url`).
- **UI:** None touched (the existing Evidence Drawer `ProviderEvidence.tsx` will automatically show the new data).

---

### 4. How the change fits without breaking existing features

All normal discovery pipelines (Maps, Yelp, ActivityHero) stay exactly as they are. This change only upgrades the **Missing Price Catch-up** job (`catchupBatch`) that runs in the background for unpriced camps.

---

### 5. Small Safe Phases

#### Phase 1: Natural Queries & Looser Guardrails in Catch-up Engine
- In `index.ts` (`catchupBatch`), change the fallback Google Search query to a simple natural sentence: `"${p.name} ${city} summer camp price tuition per week"`.
- Remove the `"Only extract if explicitly appears..."` prompt constraint and widen `priceOk` regex so prices found in Google Search snippets or directory images/banners aren't discarded.
- Deploy the updated `mvs-discover-providers` edge function.

---

### 6. Estimated Turns

- **Phase 1:** 1 turn

---

### 7. Risks, What NOT to touch, & Testing

- **What not to touch:** Do not edit scoring weights, `marketView.ts`, or database schemas.
- **Risks:** Natural queries might occasionally bring in a price from a different location if two camps share a name. We protect against this by keeping city names inside the search query and requiring a minimum AI confidence score (>= 0.7).
- **Testing:** Trigger Catch-up for Columbus, OH. Check `Allegro Studios`, `School of Rock Gahanna`, and `Whetstone Community Center` in the database to verify they successfully capture real prices ($165, real tuition, $120/$144).

---

### 8. Waiting for Approval

Please review this simplified plan. Once you click "Implement plan", I will update the Edge Function.