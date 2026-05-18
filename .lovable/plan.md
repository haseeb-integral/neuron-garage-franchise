# Plan: lock in the lesson + push all pending doc updates to GitHub

## Part A — Why I missed it, and the rule to prevent a repeat

**What I missed.** I proposed dropping the `school_level IN (1,4)` filter and writing all K–12 schools into a column literally called `public_elementary_count`. The schema name was about to lie about its contents. You caught the naming/semantics drift. I should have caught it the moment "what we store" changed.

**Why I missed it.** I optimized for the data-fetch change and treated the column name as a sunk cost ("UI already reads it, don't disturb"). That's exactly the wrong instinct when meaning changes.

**Rule to add (one paragraph in `AGENTS.md`, Non-Negotiable Rules section):**

> **Rule 10 — Name-vs-Meaning check.** Before any change to what a column, table, signal_key, enum value, file, or function *contains*, re-read its current name out loud. If the new contents would make the name misleading to a new reader, the **rename is part of the same change** — not a follow-up task. Call this out explicitly in the plan: "Field X currently means A. After this change it will mean B. Therefore rename / split / add sibling." Never silently widen a field's meaning. The same rule applies to scope words like "elementary", "active", "verified", "public" — if you stop honoring the qualifier, the qualifier must leave the name.

Same idea, project-knowledge framing — added as a one-liner to `mem://index.md` Core so it applies to every future session:

> *Before changing what any named thing contains, re-read its name. If the new meaning makes the name misleading, rename in the same change — never silently widen scope.*

## Part B — Fix the MD mistake about "May 15 K–6 only"

You're right — I framed "middle/high school teachers are out of scope" as a May 15 lock. It isn't. `TEACHER_IDEAL_PROFILE.md` line 46 already says scope is a starting point and can expand. The website only locks **campers** at K–6, not staff.

Edits:

1. **`TEACHER_IDEAL_PROFILE.md` § "What This Is NOT"** — change the line *"We are NOT recruiting high school teachers as the primary target (wrong age group)"* to:
   > "Middle and high school teachers are **not the primary target** for the Location Director role, but they are **in scope** as secondary candidates — especially STEM, shop, maker, robotics, and art teachers. They are often summer-available and a strong fit for camp staffing. Fit scoring should rank them below K–6 and retired teachers, not exclude them."
2. Add a new **Segment 4 — Middle / High School STEM, Maker, Shop, Art Teachers (Secondary)** with reasoning (summer-free, hands-on subject match, camp-staff pipeline) and a "lower base weight than K–6, boosted by hands-on subject" note.
3. **Fit scoring table** — move "High school teacher only" out of *Neutral/lower* and reword: *"Middle/high school teacher, hands-on subject (STEM/maker/shop/art) — moderate fit"* and *"Middle/high school teacher, purely academic — lower fit"*.
4. **`GLOSSARY.md`** — update Teacher Search line: *"finds K–6, retired, camp, and secondary middle/high hands-on teachers in target cities."*

## Part C — Doc-sync drafts to push (the ones queued from the last turn + this turn's fixes)

All five live docs. I'll write them in one batch once you say go.

1. **`PROJECT_CONTEXT.md` § 2** — note column rename on `us_cities_scored`: `public_elementary_count` → `public_school_count`, `public_elementary_enrollment` → `public_school_enrollment`; two new derived columns `public_elementary_count` / `public_elementary_enrollment` (low_grade ≤ 5 subset). Note seed function now stores all open K–12 public schools, elementary as derived subset.
2. **`HOW_IT_WORKS.md`** — short paragraph in the City Search section: "Public schools vs public elementary — we store all open public schools per city; the 'elementary' number is a derived subset where `lowest_grade_offered ≤ 5`. Camp scoring still uses the elementary subset (K–6 camper base). UI label unchanged."
3. **`APIS.md`** (NCES section) — clarify: all open public schools (any grade) are captured per city; elementary is a derived subset, not a filter applied at fetch.
4. **`GLOSSARY.md`** — add *"Elementary-serving school = NCES open school with `lowest_grade_offered ≤ 5`"* + the Teacher Search wording update from Part B.
5. **`OPEN_TASKS.md`** — add three new deferred items under City Search and one under Teacher Search:
   - **City Search: add "Total public schools" widget alongside "Public elementary"** (uses new `public_school_count`) — low risk.
   - **Rename `private_elementary_count` / `charter_elementary_count` → `_school_count` + add elementary-subset siblings** when GreatSchools is wired (currently unpopulated).
   - **Decide whether `score_franchise_supply` should blend elementary + middle/high once camp-staff enrichment teachers are part of recruiting** — needs Sam.
   - **Teacher Search: expand sourcing queries to middle/high STEM/maker/shop/art teachers as Segment 4** (per Part B).
6. **`AGENTS.md`** — add Rule 10 (Name-vs-Meaning check).
7. **`mem://index.md`** Core — add the one-liner version of Rule 10.

## Part D — GitHub push

Lovable auto-syncs every edit to `haseeb-integral/neuron-garage-franchise` `main` in real time. So writing the files = pushing to GitHub. No extra step needed; I'll confirm the diff list in chat after the writes.

## What I will NOT do in this pass

- No code changes. Database column rename + seed function are already done and verified (Boston: 129 total / 94 elementary). This pass is docs + rules only.
- No re-seed. Doc fixes don't require touching data.

## Acceptance

- 6 doc files updated, 1 memory file updated, all visible on `main` within seconds of write.
- One-line diff summary posted in chat per Doc-sync Mode A.
- You can paste the new Rule 10 into any future Lovable / Cursor / Claude session and the agent will be obligated to flag name-vs-meaning drift before acting.

Say **go** and I'll write all 7 files in one batch.
