## Goal
Add a new "Candidate Pipeline Methodology" page so the status summary lives in the app, like the other methodology docs (CSI, MVS, SAS, Demographics).

## What I will do

1. **Create page** `src/pages/CandidatePipelineMethodology.tsx`
   - Same layout style as the other methodology pages.
   - Heading: **Candidate Pipeline — Status: Done**
   - Plain-English bullet list of every change made since the G-Form audit (Lead Sheet fields, registration warning, real activity log, change-level diffs for Lead Sheet and Process, Notes & Activity split panel, bigger Add Note box with Ctrl+Enter, filter chips, dual timestamps, Homework tab removed, smoke tests passed).
   - Short intro line explaining what the page is.

2. **Register route** in `src/App.tsx`
   - Lazy import + `registerRoutePrefetch` + `<Route path="/candidate-pipeline-methodology" />`.

3. **Add sidebar link** in `src/components/AppSidebar.tsx`
   - Inside the existing "Methodology & Docs" collapsible group.
   - Title: "Candidate Pipeline", icon: `Users` (or similar from lucide-react).
   - URL: `/candidate-pipeline-methodology`.

## Out of scope
- No changes to Candidate Pipeline code itself.
- No edits to other methodology pages.
- No new MD files on disk (the content lives in the React page, matching how the other methodology docs work).
