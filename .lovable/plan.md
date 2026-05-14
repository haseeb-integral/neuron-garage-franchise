## Issues

1. **No default name** in the Save Search dialog — user has to type one from scratch.
2. **Saved searches "disappear"** after saving. They actually exist (stored in `saved_searches` table) and are loaded into `savedSearches` state, but they're hidden inside the **preset dropdown at the top right** (the one currently labeled "Custom"). Most users won't think to look there. After loading one, the dropdown shows "Custom" — the saved name is never displayed.

This is a UI discoverability problem, not a data problem. (Also — yes, this acts like an internal CRM: the rows are per-user via RLS, you stay signed in, and they persist across sessions.)

## Fix (frontend only, `src/pages/CityScoring.tsx`)

### 1. Auto-default name in the Save dialog
When the dialog opens, prefill `saveSearchName` with a smart default that the user can edit:
- If a built-in preset is currently active → `"<PresetName> – <MMM D>"` (e.g. `"Affluent Suburbs Model – Nov 14"`).
- Otherwise (Custom) → use the highest-weighted category as the hint: `"<CategoryLabel>-heavy – <MMM D>"` (e.g. `"Demand-heavy – Nov 14"`).
- Field is fully editable, autofocus + select-all so a quick keystroke replaces it.

### 2. Make saved searches visible (two changes)

**a. Dedicated "Saved Searches" dropdown next to the preset dropdown.**
A second `<Select>` shows up only when the user has ≥1 saved search. Trigger label = `"Saved (3)"` collapsed, opens to show each name + trash icon. Selecting one loads it (same `handleLoadSavedSearch` path). This is the obvious place users will look — separate from the built-in presets.

**b. After loading, show the saved name in the page subtitle.**
Replace the "Manually adjusted master weights — no preset matches" line with `Loaded saved search: "<name>"` while a saved search is active. Track `activeSavedSearchId` in state; cleared as soon as the user moves a slider or picks a preset.

Keep the existing entries inside the preset dropdown too (under the "Saved Searches" section header) — harmless, and helps users who already learned that path.

### 3. Tiny polish
- Toast on save now says `Saved "<name>" — find it under the Saved dropdown` so the location is obvious the first time.

## Risk
Low. ~40 LOC in one file. No DB changes, no scoring/filter logic touched.

## Verification
1. Click Save Search → name field is prefilled, editable, Enter saves.
2. After save, toast points to the new "Saved" dropdown; the name appears there.
3. Selecting it loads weights AND the subtitle shows `Loaded saved search: "<name>"`.
4. Moving any slider clears the subtitle indicator.
5. Trash icon in the new dropdown deletes without loading the search.
