### Plan: Tavily Verified Answer Layer (Boston Pilot)

We will upgrade `mvs-discover-providers` to use Tavily as a fast pricing scout for Boston, enforcing a strict **Literal-Match Safety Guard**. Prices are only saved if the exact dollar number from Tavily's summary appears literally inside the real webpage body text (`raw_content`).

#### 1. What we are changing & why
- **Update `supabase/functions/mvs-discover-providers/index.ts`**:
  1. Pass `include_raw_content: true` in Tavily API calls.
  2. Extract candidate dollar amounts from Tavily's AI summary (`answer`).
  3. Search the real webpage body text (`raw_content` / `content`) to verify that the exact dollar amount appears literally.
  4. **If verified literally**: Save the price, mark `firecrawl_scraped = false`, and tag `extraction_method = "tavily_lead_v1"`.
  5. **If NOT verified literally** (or blank): Discard the AI guess and fall back to our normal Firecrawl website scrape.

#### 2. Affected parts
- **Server code only:** `supabase/functions/mvs-discover-providers/index.ts`.
- No UI layouts, Provider Evidence tables, scoring math, or other cities are touched.

#### 3. Traceability & Testing
- When you run Boston again, verified camps will display `tavily_lead_v1` in the Phase/Verification metadata on your Provider Evidence Review screen.

#### 4. Phases & Turn Estimates
- **Phase 1 (1 Turn):** Update `mvs-discover-providers/index.ts` with the verification logic and deploy.
- **Phase 2 (1 Turn):** Trigger a Force Fresh run on Boston, MA and inspect the Provider Evidence Review table.