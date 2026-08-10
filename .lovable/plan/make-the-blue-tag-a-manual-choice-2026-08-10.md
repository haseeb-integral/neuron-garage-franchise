# Make the blue tag a manual choice

## How it works today
The blue tag on a candidate card is the `fit_tag` field on the candidate record. It is set once and never updated:

- New Candidate modal: set from the old numeric fit score (80+ = High Potential, 50-79 = Follow-Up, under 50 = Not a Fit).
- Email Outreach (reply triage / promote from queue): hard-set to "Interested" or "Meeting Requested".
- Old seed rows: "Untagged".

Nobody can change it by hand, and it never reacts to stage moves or star ratings. Current data: 11 High Potential, 6 Follow-Up, 2 Interested, 1 Not a Fit, 1 Untagged.

## What we will change
Turn the tag into a simple manual label the recruiter picks.

1. **One list of allowed tags.** Keep the existing three, plus the two that outreach already writes, so no live data breaks:
   - High Potential
   - Interested
   - Meeting Requested
   - Follow-Up
   - Not a Fit
2. **Add a tag picker** on the Overview tab of the candidate detail panel, near the top with the contact summary. It saves right away when changed (same auto-save style as the rest of the tab).
3. **Stop the auto-guessing.** The New Candidate modal will no longer derive the tag from the fit score. It will default to "Follow-Up" and let the user pick a tag in the form.
4. **Leave Email Outreach as is.** When a prospect is promoted or replies, it still starts as "Interested" / "Meeting Requested". After that, a person can change it by hand.
5. **Clean up the one "Untagged" row** to "Follow-Up" so every card shows a real tag.
6. **Update the Card legend** text so it lists the real five tags and says the tag is set by hand.

## What is not touched
- The Qual composite score and the 5 star pillars: unchanged, no link to the tag.
- Stage moves, days-in-stage stripe, owner circle: unchanged.
- No database schema change. `candidates.fit_tag` is already a text column.

## Technical notes
- `src/constants/fitTags.ts`: widen `FIT_TAGS` to the five values; keep `coerceFitTag` and `DEFAULT_FIT_TAG = "Follow-Up"`.
- `src/utils/fitScore.ts` `deriveFitTag`: no longer called from the New Candidate modal (remove the call; keep or delete the helper depending on other usage).
- `src/components/candidate-pipeline/NewCandidateModal.tsx`: replace `fit_tag: deriveFitTag(...)` with a user-selected value defaulting to "Follow-Up".
- New small component `TagSelect.tsx` used in `tabs/OverviewTab.tsx`; writes `fit_tag` on `candidates` and refreshes the pipeline list so the card updates.
- `src/pages/CandidatePipeline.tsx` line 90: map through `coerceFitTag` instead of `?? "Untagged"`.
- `CardLegendPopover.tsx`: reword the "Blue tag" row.
- One data update to fix the single "Untagged" row.

## Phases and effort
- Phase 1 (1 turn): tag list, tag picker on Overview, card mapping, legend wording, data cleanup.
- Phase 2 (1 turn): New Candidate modal tag field, remove score-based guessing.

## Testing
- Open a candidate, change the tag, close the panel: the card shows the new tag.
- Reload the page: the tag stays.
- Create a new candidate: tag defaults to Follow-Up and can be changed.
- Promote a prospect from Email Outreach: still lands as Interested / Meeting Requested and can then be edited.
