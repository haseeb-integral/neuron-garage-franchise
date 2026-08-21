# Fix Teacher CSV Column Mapping

## What I found

The attached file is `ng-teachers-TX-2026-08-21.csv`.

It has 27 columns. It does **not** include a column for `experience_years` or `teacher_type`. Those two fields cannot be imported from this file because the values are not present.

The current mapper also has a bug. It starts with safe built-in matches, but the AI result can replace them with a less accurate match.

## Phase 1 — Make mapping reliable

**Estimate: 1 Lovable turn**

- Expand the built-in header list for common Experience and Teacher Type names, such as:
  - Experience, Years Experience, Years of Experience, Teaching Experience
  - Teacher Type, Educator Type, Role Type, Employment Type
- Keep built-in exact and alias matches locked. AI may fill missing matches only. It may not replace a match already found.
- Prevent one CSV column from being assigned to more than one app field.
- Normalize hidden characters, extra spaces, dashes, and capitalization in headers.

## Phase 2 — Make missing columns clear

**Estimate: 1 Lovable turn**

- Split the mapping screen into:
  - Matched fields
  - App fields not found in this CSV
  - Extra CSV columns not used
- Clearly show that Experience and Teacher Type are absent from this exact file, rather than making them look like failed matches.
- Keep manual dropdown mapping available.
- Add a mapped-field count before import.

## Phase 3 — Test the real file

**Estimate: 1 Lovable turn**

- Test the attached Texas CSV against all 27 headers.
- Confirm fields such as full name, work email, grade level, phone, signals, sources, and dedupe key map correctly.
- Confirm blank count fields still save as `0`.
- Confirm Experience and Teacher Type remain blank because the file has no source values for them.
- Test a small sample import in Add + Enrich mode so existing teacher rows receive new values.

## Areas affected

- Import to Master Teacher Pool mapping screen
- CSV field preparation
- Add new and enrichment imports
- Import review and count display

No Teacher Search filters, scoring, SmartLead flow, or existing teacher records will be changed.

## Risks and safeguards

- A loose alias could map the wrong column. Aliases will use exact normalized header matches only.
- Existing records could be overwritten. The current Fill Blanks and Overwrite choices will remain unchanged.
- The import must not invent Experience or Teacher Type values. Missing source values will stay blank.
