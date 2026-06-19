## Where `/mvs-qa-queue` lives today
The route is wired in `App.tsx` but has **no link** in the UI — the only way to reach it is to type the URL. That's why you can't see it from inside the app.

## Where to add the entry point (most logical)
On **Market Validation** (`/market-validation`), inside the existing intro panel "What this feature does" → card **"2 · (Re)score cities"**, right next to the **Open scoring console →** button.

Reasoning: that card is already the operational/manager card (the QA queue is operational follow-up to the scoring pipeline). It's manager-only, matching the QA page's role gate. The shortlist table area below stays clean for decision-makers.

## Plan (1 small edit)
1. In `src/pages/MarketValidation.tsx`, in the "2 · (Re)score cities" card header, add a second link **"Review QA queue →"** beside "Open scoring console →" pointing to `/mvs-qa-queue`.
2. Show a small red count badge using the already-imported `QA_QUEUE_FLAGGED_COUNT` (e.g. `Review QA queue (8) →`). If the live count from `mvs_qa_queue` is preferred over the constant, we can fetch it; for now the constant matches what the page shows.
3. Add one short helper line under the buttons: *"QA queue = manager review of low-confidence week extractions."*

No new routes, no schema changes, no other pages touched. Sidebar stays as-is (we discussed adding it there earlier — skipping unless you want it too).

## Out of scope
- Adding a sidebar nav item (say the word and I'll add it under MVS Methodology).
- Live count from DB instead of the constant.
- Any change to the QA page itself.
