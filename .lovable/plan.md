# Implement Summary Progress Bar & Stop Button

### 1. What we are changing
* **Add Live Summary Progress Strip:** Upgrade the top strip on `MarketValidationRollout.tsx` to include an actual animated green progress bar visual (`doneCount / totalCount`), making it obvious at a glance how close the shortlist is to 100% complete.
* **Add Cancel / Stop button:** Allow cancelling an accidental `Run` or `Force fresh` by swapping the disabled spinning button on active rows for a red **Stop** button. Clicking it instantly updates the database status to `failed` (`Cancelled by user`), halting follow-up background batches and immediately unlocking the table.

### 2. Files affected
* `src/pages/MarketValidationRollout.tsx`:
  * Import `Square` from `lucide-react`.
  * Add `onStop` callback to `CityRow` props.
  * Render a red **Stop** button when `inFlight || isInvoking` is true for that city.
  * Add `handleStop(city)` function in the main component that calls `supabase.from("mvs_pipeline_runs").update({ status: "failed", error: "Cancelled by user" }).eq("id", latestRun.id)` and immediately refetches.
  * Upgrade the top strip markup to include a smooth Tailwind `w-[...]` progress bar fill.