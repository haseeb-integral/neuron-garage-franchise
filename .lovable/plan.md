# Plan: Per-Camp Automatic Tuition Search (Test Case: The Little Gym of Polaris)

We will execute your exact test case in a safe, isolated step to prove how automatic per-camp searching recovers missing tuition prices.

---

### 1. What we are changing and why
Right now, our system discovers camp names (like *The Little Gym of Polaris*) from general city guide articles. If that general article didn't mention their tuition price, our system gives up and marks the camp **Incomplete**. 

We are creating a new "Per-Camp Tuition Search" step. When a camp has no price, the system will automatically search Google for `"{Camp Name} {City} {State} summer camp tuition price per week"`. It will read the search snippets and web pages (including Facebook posts, Instagram captions, and store checkout links), extract the tuition ($200/week or $149/week), verify that the dollar amount literally appears in the text, and upgrade the camp to **Complete**.

---

### 2. Affected parts of the app
* **Backend Edge Function:** `supabase/functions/mvs-discover-providers/index.ts` (adding the targeted per-camp search logic).
* **Database Table:** `mvs_providers` (updating `price_min`, `price_max`, and `confidence` columns).
* **UI Screen:** **Provider Evidence Review** screen (`/provider-evidence`) where your team reviews captured prices and source proof.

---

### 3. How it fits without breaking existing features
This new search step runs as a **safe second pass** only for camps that have a blank price (`—`). 
* If a camp already has a price, this step skips it completely.
* If the search finds no price online, the camp simply stays as-is (**Incomplete**). 
* This ensures 100% protection for existing camp data and scoring math.

---

### 4. Small safe phases

#### Phase 1: Execute Test Case for "The Little Gym of Polaris Columbus OH"
1. Build an isolated test runner inside our backend function for this exact camp.
2. Run the exact query: `"The Little Gym of Polaris Columbus OH summer camp tuition price per week"` via Firecrawl.
3. Allow the crawler to read snippets from store checkout pages, Facebook, and Instagram.
4. Run our AI extractor and strict literal-price guard on the scraped text.
5. **Report back to you in chat** with:
   * The exact search string used.
   * The top web links and text snippets found.
   * The exact dollar amount extracted (e.g., `$200` or `$149`).
   * Confirmation that the camp upgraded to **Complete**.

#### Phase 2: Wire into Main City Pipeline (After your review)
1. Once you approve the Phase 1 test report, wire this per-camp search loop into the main city discovery pipeline (`mvs-discover-providers`).
2. Add a safe rate cap (e.g. searching the top 20 unpriced camps per city run) so the pipeline stays fast (~2 minutes) and doesn't exhaust API credits.

---

### 5. Estimated Lovable turns
* **Phase 1 (Test Case & Report):** 1 turn.
* **Phase 2 (Full Pipeline Wiring):** 1 turn.

---

### 6. Risks, what not to touch, and testing
* **Risks:** Running individual searches for 150+ camps at once could slow down city runs or use too many search credits. *Protection:* We will pilot 1 camp first, then add a batch cap when rolling out to full cities.
* **Do not touch:** We will not touch any scoring formulas (`computeMvs.ts`), existing complete camps, or notification system code.
* **Testing:** We will verify the exact markdown returned for *The Little Gym of Polaris* to prove the safety guard accepts legitimate weekly tuition while rejecting non-tuition numbers (like registration fees or monthly memberships).

---

### 7. Next Step
Click **"Implement plan"** below to approve this plan. I will immediately run Phase 1 for *The Little Gym of Polaris Columbus OH* and report the live search results back to you!