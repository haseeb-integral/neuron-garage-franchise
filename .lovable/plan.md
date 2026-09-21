# Teacher Search — finish the signal work, and fix two problems I found

## What is done already

- Every entrepreneurial signal and verified fact is back in the database (100 side-business records, 2,482 verified facts rebuilt from the raw import data).
- Teacher records now show a tier banner (Tier 1 side business / Tier 2 hook / Tier 3 verified contact), one card per signal with the detail, source link, confidence badge, plain-English meaning and match basis.
- The teacher list shows a "Side business" chip or a hook chip in each row, and the Signals dropdown can show only Tier 1, only Tier 2, or only MEDIUM-confidence matches.
- The import tool now saves each signal with its own confidence, saves verified facts as their own records, and will not create duplicates when you re-import the same city.
- The methodology page is rewritten to version 2.0 with Houston and Austin side by side, the confidence rules, the per-city checklist, cost table and how it all shows in the app.

I checked this live: filtering to "Tier 1" and opening Amanda Nguyen shows the amber Tier 1 banner, "Holds a real-estate licence", MEDIUM confidence, the TREC detail, the source and the match basis.

## Problem 1 — The search box times out (needs your approval)

Typing a name into the Teacher Search box returns "No prospects match" even when the teacher exists. The database is cancelling the search after 8 seconds because it reads all 311,924 rows instead of using the fast search index. The index exists; the staff access rule stops the database from using it for logged-in users.

**Fix:** add one small database function that runs the search safely on the server (the same approach the page already uses for its counters), and have the list call that function when a search term is typed. Everything else about the list stays as it is.

Affected: the Teacher Search list only. Nothing in Candidate Pipeline, City Search, Site Analysis or SmartLead.
Risk: low. If the new function fails for any reason the list falls back to the current behaviour.
Turns: 1.

## Problem 2 — Small count is wrong

With a filter applied, the footer read "Showing 1-1 of 1" while 25 teachers were listed. The total is an estimate, not a real count.

**Fix:** ask the database for the true count when a filter or search is active.
Turns: shares the same turn as Problem 1.

## Remaining planned work

**Best prospects first.** Add a sort option that puts Tier 1 teachers on top, then Tier 2, then the rest, plus small counters at the top of the list ("88 with a side-business signal, 2,303 with verified facts") so the team can see at a glance how much of a city is enriched.
Turns: 1.

## What I will not touch

Houston teacher records, hand-entered teacher details, teacher scoring, Candidate Pipeline, SmartLead campaigns.

## What to test after

1. Type a full teacher name in Teacher Search — results appear in under 2 seconds.
2. Filter Signals to Tier 1 — row count in the footer matches the rows shown.
3. Sort by "Best prospects first" — side-business teachers appear first.
