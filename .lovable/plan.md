### Wording & Verification Plan: Boston Pilot Review

1. **What we are doing and why:**
   Turn 2.1 (Tavily + literal match guard) is fully deployed and tested on Boston, MA. We will now do a visual inspection of the **Provider Evidence Review** screen in the preview to confirm the new badges and verified page snippets look clear to users.

2. **Affected pages and tables:**
   - Page: `ProviderEvidence.tsx` (Provider Evidence Review)
   - Database table: `mvs_providers` (read-only check of Boston rows)

3. **Fit into current app:**
   This is a read-only visual check. It will not touch or break any scoring math or existing city scores.

4. **Phases:**
   - **Phase 1 (Visual Check):** Open the Provider Evidence page for Boston, click a row with a Tavily badge, and verify the drawer displays the exact verified page text.
   - **Phase 2 (Next Step Decision):** Confirm whether to keep Tavily locked to Boston only, expand it to Austin/Columbus, or move to the next roadmap item (Task 8 / Card Details).

5. **Estimated turns:**
   1 prompt.

6. **Risks and Testing:**
   Zero risk (no code or database edits).