# Build Plan: Speed Up Missing Price Catch-Up (45 Camps Per Run)

To test and catch up the remaining unpriced providers in Columbus (and your other 12 cities) much faster, we will increase the background AI check limit from 15 to 45 camps per run.

---

### 1. What we are changing and why
* **Increase Check Limit:** Right now, each city scan checks a safety limit of **15 camps** missing prices. We will increase this limit to **45 camps per run** so missing prices get filled 3x faster.
* **Batch Chunking Protection:** To prevent the cloud server from crashing or getting blocked by Google, we will run those 45 camps in 3 rapid consecutive mini-batches of 15.

### 2. Affected parts of the app
* **Backend Edge Function:** `supabase/functions/mvs-discover-providers/index.ts` (missing price catch-up search block).
* **Database Table:** `mvs_providers` (saving verified weekly tuition dollar amounts).

### 3. How it fits without breaking existing features
* This change only updates background backend AI crawler settings.
* All existing city composite scores, calculation rules, table filters, UI cards, and CSV exports remain 100% untouched.

### 4. Small safe phases
* **Phase 1 (Update Batch Limit):** In `mvs-discover-providers/index.ts`, change `.limit(15)` to `.limit(45)` and process the camps in 3 consecutive batches of 15. Deploy the edge function.

### 5. Estimated Lovable turns
* Phase 1: 1 turn.
* **Total:** 1 turn.

### 6. Risks, what should not be touched, and testing
* **Risks:** Checking 45 missing camps on Google will increase a single city's background scan time from ~1 minute up to ~2.5 minutes.
* **What should not be touched:** Do not touch `LiveEngineCard.tsx`, `CityCompetitors.tsx`, `ProviderEvidence.tsx`, or any scoring formula helpers.
* **Testing:** Trigger a force refresh on Columbus and confirm via database query that another large batch of missing camps gets tested and priced.

### 7. Approval
Please review this simple English plan and click **Implement plan** below to approve and start Phase 1!