### Plan for Tavily Verified Answer Layer (Boston Pilot)

We are implementing your exact approved condition: we will extract candidate prices from Tavily's AI summary (`answer`), cross-verify that the exact dollar amount exists literally inside the real page text (`raw_content` / `content`) returned by Tavily, save to DB if verified (skipping Firecrawl), and fall back to Firecrawl only if unverified or blank.

#### 1. What we are changing & why
- **Update `runTavilyPilotForBoston` in `supabase/functions/mvs-discover-providers/index.ts`**:
  1. Add `include_raw_content: true` to Tavily API requests so Tavily returns the real body text of the web pages it found.
  2. Read Tavily's `answer` summary and use regex to find candidate dollar amounts (e.g. `$250`).
  3. Verify that exact dollar amount exists inside the `raw_content` or `content` field of the matching search results.
  4. **If verified**: Keep the price, skip Firecrawl (`firecrawl_scraped = false`), set `extraction_method = "tavily_lead_v1"`, and save directly to the database.
  5. **If NOT verified** (or answer has no literal camp price): Fall back to the existing Firecrawl scrape flow.

#### 2. Affected parts
- ONLY `supabase/functions/mvs-discover-providers/index.ts`. No UI, tables, scoring math, or other pages are affected.

#### 3. Compatibility
- Fits smoothly into the existing Phase 4 Boston pilot flow without changing any database schema or general discovery logic for other cities.

#### 4. Phases & Turn Estimates
- **Phase 1 (This turn)**: Implement the verification logic in `mvs-discover-providers/index.ts` and deploy the edge function. (1 turn)
- **Phase 2 (Next turn / Testing)**: Run a live test for **Boston, MA** (with forceFresh) to verify verified prices land cleanly in your DB.

#### 5. Risks & Exclusions
- Zero risk to other cities. Firecrawl is preserved as a fallback so we don't lose coverage when Tavily's summary is blank.

---

Click **Implement plan** to approve and start coding!