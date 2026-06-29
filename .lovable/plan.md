### What we are changing and why

1. **Fixing the "Something went wrong" crash on Candidate Pipeline (and any page with the bell header)**
   * **Why:** In our last update, we added live real-time notifications via Supabase Realtime (`postgres_changes`). However, in Lovable Cloud databases, table real-time must be explicitly turned on via database replication. Because the `notifications` table was not added to the publication, Supabase threw an error (`cannot add 'postgres_changes' callbacks...`), crashing the page.
   * **Fix:** We will run a quick database migration (`ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`) so real-time delivery works safely without errors.

2. **Making the Provider Evidence Review Drawer simple and easy for humans**
   * **Why:** Right now, when you click a camp row on the Provider Evidence Review page, the side drawer shows confusing developer details like "Confidence: 0.70", "Guard result JSON", and raw source code blocks. A human reviewing camp tuition doesn't need tech jargon—they just need to verify the tuition truth!
   * **Fix:** We will redesign the side drawer (`EvidenceDrawer` in `ProviderEvidence.tsx`) into a clean, grade-6 English summary with 3 clear sections:
     * **Tuition Truth:** Clearly showing the weekly price (e.g., `$295–$495 / week` or `Missing`) and how it was checked.
     * **Proof & Website:** A clean big button to open the official website, plus the saved proof screenshot / listing page.
     * **How we found it:** A simple English sentence explaining where our search looked (e.g., *"Found via targeted tuition search on Google"* or *"Found on official listing page"*), removing confusing developer code blocks and raw JSON dumps.

---

### Affected Pages & Components
* **Database Migration:** Supabase publication for `public.notifications`.
* **Provider Evidence Page:** `src/pages/ProviderEvidence.tsx` (specifically the `EvidenceDrawer` side panel).

---

### How this fits into the app safely
* The database migration only enables live push messages for the notification bell and touches no existing user data or scoring math.
* The drawer redesign is 100% UI and wording only. It does not change any background crawler scripts, pricing guards, or table rows.

---

### Safe Implementation Phases
* **Phase 1 (Crash Fix):** Run database migration to turn on Realtime for `notifications`. (1 prompt)
* **Phase 2 (Drawer Redesign):** Update `EvidenceDrawer` in `ProviderEvidence.tsx` with clean non-tech English. (1 prompt)

---

### Risks & What needs testing
* **Risks:** None. Wording and DB publication only.
* **Testing:** Once approved and built, you can go to **Candidate Pipeline** to verify the crash is gone, and then open **Market Validation -> Provider Evidence Review** and click any camp row (like *School of Rock Gahanna* or *The Little Gym of Polaris*) to see the clean new side panel!