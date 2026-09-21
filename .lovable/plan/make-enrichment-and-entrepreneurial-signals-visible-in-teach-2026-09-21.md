# Make enrichment and entrepreneurial signals visible in Teacher Search

## What I checked first (facts, not guesses)

From the live database right now:

- 311,924 teachers total.
- 2,303 teachers have verified enrichment facts (matches the Austin report).
- Fact labels stored: current_role_and_grade 2,030, teacher_project_lead 270, recognition_award 130, teacher_grant_recipient 45, plus a few award/lead labels.
- 86 teachers have a side-business (secondary) signal. Houston's 209 flags are **not** in the database — the Houston file carried no signal data.
- 0 verified creator signals (the Austin file had none).
- **The evidence table is completely empty (0 rows).** The detail text, the source link, the confidence and the match basis for every signal are sitting only inside each teacher's hidden raw data, not in the table the app reads. This is why the teacher panel says "No evidence links saved yet."

So today a staff member opens a teacher and sees four grey count chips and a list of label words like `current_role_and_grade`. They cannot see what the project was, what the license was, or click the source. That is not good enough.

## What we are changing and why

1. **Show the story, not the counts.** Turn each signal into a readable line with a source link.
2. **Rebuild the missing evidence records** from the data already stored, so nothing has to be re-imported.
3. **Make the list scannable** so Sam, Kaylie and Skylar can sort and filter to the best teachers in one click, using the three tiers from the methodology.
4. **Fix the importer** so confidence and detail land in the readable table every time, for San Antonio and every future city.
5. **Rewrite the methodology page**, which is still version 1.4 from July and describes Austin as "queued".

## Phase 1 — Find out why evidence records vanished (1 turn)

- Check the import batch records and the evidence table history to confirm whether the 100 links were never written or were removed with the clean-up of the 2,896 empty rows.
- Report the finding before changing anything. No code change in this phase if the cause turns out to be different from expected.

## Phase 2 — Rebuild evidence from what we already hold (1–2 turns)

- Read the stored raw fields for every teacher (`secondary_signal_sources`, `secondary_signal_details`, `secondary_signal_source_urls`, `secondary_signal_confidence`, `secondary_signal_match_basis`, and the verified fact labels) and write one evidence record per signal.
- Keep per-signal confidence (MEDIUM vs LOW) on each record instead of collapsing to one value per teacher.
- Verified facts and side-business flags stay in separate groups, as Manus requires.
- Safety: written only for teachers who currently have zero evidence rows; re-runnable without creating duplicates; no teacher fields changed.

## Phase 3 — Teacher record redesign (2 turns)

New "Enrichment & Signals" panel:

- A confidence banner at the top of each teacher: **Tier 1 — Entrepreneurial signal**, **Tier 2 — Outreach hook**, or **Tier 3 — Verified contact**, matching the three tiers in the Austin report.
- Plain-English labels instead of raw codes: `teacher_project_lead` becomes "Ran a funded classroom project (DonorsChoose)", `recognition_award` becomes "Award or recognition", `current_role_and_grade` becomes "Role and grade confirmed by district directory".
- Each side-business signal shown as its own card: what it is (e.g. "Active Texas real-estate sales licence, Williamson County, valid to 2027"), where it came from, the confidence badge, and a clickable source link.
- A short explainer under the confidence badge: MEDIUM = name and city match, LOW = common surname, verify before calling. No jargon.
- Verified and secondary blocks stay visually separate, never summed.

## Phase 4 — Make the list scannable (1–2 turns)

- Replace the grey chip cluster in the Signals column with: a green "Hook" chip carrying the top fact in words, and an amber "Side business" chip with its confidence.
- Filter bar gains a single **Tier** filter: All / Tier 1 entrepreneurial / Tier 2 hooks / Tier 3 verified only, plus a confidence filter (MEDIUM or higher).
- Sort option "Best prospects first" — Tier 1, then Tier 2 by number of hooks.
- Header counters so the team can see, per city, how many Tier 1 and Tier 2 teachers exist.

## Phase 5 — Importer hardening for San Antonio (1–2 turns)

- Write evidence records inside the same step that updates the teacher, with a stored check that stops the import if signals were found in the file but no evidence rows were written.
- Keep per-signal confidence rather than one value per teacher (needs one small database change to allow "MIXED" or per-row storage).
- Support the separate one-row-per-signal Manus sprint file as an **evidence-only** import (today it is blocked). That file is the only place the DonorsChoose project title, award name and source link exist — the City/Metro file carries labels and counts only. This is what will give Tier 2 teachers real clickable hooks.
- Review screen shows, before you press import: verified facts, side-business signals by confidence, and evidence links — with a stop warning if any read zero.

## Phase 6 — Methodology page rewrite (1 turn)

Rewrite `/expanding-teacher-search-methodology` to version 2.0 covering: the three layers, Houston and Austin results side by side, source performance table, the confidence system including the relaxed name+city rule for non-directory sources, the 7-step retooling checklist, cost table, lessons learned, and how all of this shows up in the app.

## What will not be touched

Houston teacher records, Candidate Pipeline, SmartLead campaigns and outreach rules, teacher scoring, and the existing teacher contact fields.

## Risks and testing

- Rebuilding evidence could double up records — guarded by only filling teachers with none, and by a duplicate check on teacher + class + link.
- Confidence change needs a small database rule update; it only widens what is allowed, nothing is deleted.
- After each phase: open a Tier 1 teacher (real-estate licence) and a Tier 2 teacher (DonorsChoose project) and confirm the panel shows detail, confidence and a working link.

## Turn estimate

7 to 9 turns total, one phase at a time.
