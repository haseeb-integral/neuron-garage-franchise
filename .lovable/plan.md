## What is wrong
The screenshots show the rename from Task 15 is incomplete. The small blue stacked word under "NEURON GARAGE" still says "Franchise" instead of "Franchise Development". It appears in two places:

1. **Sidebar logo** — `src/components/AppSidebar.tsx` line 122
2. **Sign-in page logo** — `src/pages/Auth.tsx` line 133

My first pass changed titles, headings, and footers, but missed the logo wordmark because "Franchise" sits alone in a short `<div>` that did not match the longer search string.

## What we will change (Option A — approved)
Only the logo wordmark. Nothing else.

- `src/components/AppSidebar.tsx` line 122: change the single blue "Franchise" line to two stacked blue lines: "Franchise" / "Development". This matches the existing "Neuron" / "Garage" pattern above it and avoids overflow from the longer word.
- `src/pages/Auth.tsx` line 133: same two-line stacked treatment.

"Neuron Garage Franchise Acquisition System" stays untouched everywhere (Team Members, Spec, User Guide, AI KB). No scoring, pipeline, database, colors, or layout code is touched.

## How to verify
1. Open the preview. Sidebar logo should read NEURON / GARAGE / FRANCHISE / DEVELOPMENT.
2. Sign out. Auth page left-side logo should show the same.
3. Collapse/expand sidebar — icon-only state unaffected.
4. Confirm no TypeScript errors.