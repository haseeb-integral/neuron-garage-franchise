# Build Plan: Strict Camp View & Excluded Locations Tab

## 1. What we are changing and why
Currently, our raw discovery lists grab all kid-friendly places from Google Maps and search engines—including public parks, baby daycares (Bright Horizons), and free retail workshops (The Home Depot). When these places sit in our headline numbers, they make it look like we have 122 "missing camp prices" when in reality those locations don't sell weekly summer camp tuition.

We will implement **Option 2 (Strict Camp View)**:
* Headline counters and catch-up scanners will only count actual summer camps.
* Non-camp locations and baby daycares will be cleanly separated into an "Excluded Locations" drawer/tab so no raw data or proof is hidden or lost.

---

## 2. Affected Pages, Components, and Flows
* **`src/components/phase2-demo/LiveCityDeepDive.tsx`**: 
  * The headline provider counter (`provCount`).
  * The **Missing Prices Catch-Up Queue** banner and scanning loop.
  * The **Premium Providers table** section at the bottom of the card.
* **Database & Scoring Helpers (`computeMvs.ts`)**: 
  * *Zero changes required.* The scoring math already filters for `ELIGIBLE_CATEGORIES` and premium tiers.

---

## 3. Fit and Compatibility
* This change is purely presentation and UI filtering. 
* All 295 discovered rows remain safely stored in `public.mvs_providers`. 
* MVS Composite and Pillar scores will continue to recompute dynamically using Brett's rule ("one calibrated number everywhere") without disruption.

---

## 4. Safe Phases & Estimate

### Phase 1: Update Headline Counters & Catch-Up Filtering (1 Turn)
* Define `activeCamps` by filtering out providers whose category is classified as `childcare-excluded` or unclassified retail/parks.
* Update the **Missing Prices Catch-Up Queue** banner so it only scans unpriced *summer camps* (skipping daycares/parks).
* Update the headline summary text at the top of the Deep Dive card to display: `X Active Summer Camps (Y Excluded Daycares & Parks)`.

### Phase 2: Add "Excluded Locations" Collapsible Table (1 Turn)
* Under the live **Premium providers table**, add a clean collapsible toggle/drawer labeled **"Excluded Locations (Y)"**.
* When expanded, display the excluded daycares, parks, and retail workshops with a clean gray badge explaining the exact reason (e.g., *Baby Daycare*, *Public Park*, *Free Retail Workshop*).

---

## 5. Risks & What Not to Touch
* **Do not modify `computeMvs.ts`**: The core MVS scoring algorithm must remain untouched.
* **Do not delete DB rows**: Never run `DELETE` queries on `mvs_providers` to hide non-camps. All raw discovery evidence must be preserved for audit trails.

---

## 6. Testing Plan
* **Manual Verification**: Open the **Boston, MA** Deep Dive card.
* Verify the headline counter reads actual summer camps.
* Click **Run Missing Prices Catch-Up** and confirm it no longer queues up Bright Horizons or The Home Depot.
* Expand the new **Excluded Locations** table and confirm all daycares/parks appear with their respective exclusion labels.