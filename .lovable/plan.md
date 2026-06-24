
## What is broken

When you click a saved row in **Saved Sites**, the card shows the address but spins on **Running…** forever. In your screenshot it has been 10+ minutes with no result.

Two real bugs, found in `src/pages/SiteAnalysis.tsx`:

1. **`handleLoadSavedSite` auto-triggers a re-run.** After adding the new slot it calls `runSlot(newId, { preferCache: true })`. So even though the saved row already has a full score snapshot, we throw it away and recompute.
2. **The re-run never starts.** `runSlot` reads `slots.find(...)` from a stale closure (the slot was just added in the same tick). The find returns `undefined`, the function returns early, and the slot is stuck on `status: "loading"` forever. That is the perpetual "Running…" you see.

So the card is doing the wrong thing (re-running) AND failing silently while it does it.

## What other apps do (standard pattern)

Looked up the common pattern for "saved item → open in workspace" flows (Notion saved views, Figma saved frames, analytics dashboards, Stripe saved reports):

- Clicking a saved item **opens the snapshot instantly**. No recompute.
- The card/panel shows a clear **"Saved snapshot · <date>"** label so you know it is not live.
- A separate **Refresh** button re-runs the live engine when the user asks.
- The saved entry **stays in the saved list** — opening it is a read, not a move.

This matches the guidance in our own stack-overflow context: "soft-hide or display saved" — show saved data immediately, never auto re-run.

## What we will change

Answering your two sub-questions:

- **Should it re-run on load?** No. It should show the saved snapshot instantly.
- **What happens to the saved-list entry?** It stays in the list, untouched. Loading is a read.

### Plan

**Phase 1 — Fix load-saved behaviour (1 turn)**
- In `handleLoadSavedSite`, accept the full `SavedSiteRow` (not just `inputs`).
- Build a `SiteScoreResult` directly from `snapshot_json` (pillars + composite + geo are already stored there).
- Set the new slot to `status: "ready"` with that result and a new flag `fromSnapshot: true` plus `snapshotCreatedAt`.
- Remove the `setTimeout(() => runSlot(...))` call. No auto re-run.
- Saved Sites list is not modified.

**Phase 2 — Make "saved vs live" visible + add Refresh (1 turn)**
- On a card where `fromSnapshot === true`, show a small label: `Saved snapshot · Jun 23`.
- Replace the spinner "Running…" pill with a **Refresh score** button on snapshot cards. Clicking it calls the existing `runSlot(id)` (no `preferCache`) to do a fresh live compute. Once it returns, `fromSnapshot` flips off and the label disappears.
- The existing "Why different from saved?" chip already covers the compare case for live cards, so no change there.

**Phase 3 — Safety fixes so this class of bug can't recur (1 turn)**
- Fix the stale-closure bug in `runSlot`: use a `slotsRef` (or pass the slot object in) so `runSlot` never silently returns because the slot "doesn't exist yet".
- Add a hard timeout (e.g. 90s) around the `compute-sas` invoke. If it exceeds, set `status: "error"` with a clear message instead of hanging on "Running…".
- Log a console warning if `runSlot` is ever called with an unknown id (so we see it instead of it dying silently).

### Files touched
- `src/pages/SiteAnalysis.tsx` — `handleLoadSavedSite`, `runSlot`, `CandidateCard` (snapshot label + Refresh button), `SlotState` (add `fromSnapshot`, `snapshotCreatedAt`).
- `src/components/site-analysis/SavedSitesDrawer.tsx` — pass the full saved row to the load handler (small prop change).

### Not touched
- `useSavedSites` hook, DB schema, `compute-sas` function, scoring math, export pipeline, hidden-cards logic.

### Risks
- Snapshot JSON shape: need to confirm `pillars`, `composite`, and optionally `geo` are present on existing saved rows. If `geo` is missing on old rows, the map widget on the card may be empty until user hits Refresh — acceptable, and we will show a small "Map unavailable in snapshot — click Refresh" note in that case.
- Refresh button must be disabled while a run is in progress to prevent double-clicks.

### What you should test after each phase
- **Phase 1:** Click a saved row → card opens instantly with the saved score, no spinner.
- **Phase 2:** "Saved snapshot · <date>" label visible. Click Refresh → spinner → live result, label disappears.
- **Phase 3:** Disconnect network, click Refresh → after ~90s you see a clear error, not endless spinner.

### Turn estimate
3 small turns total.
