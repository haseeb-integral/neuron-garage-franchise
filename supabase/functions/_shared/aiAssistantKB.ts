// Knowledge base for the Neuron Garage AI Assistant.
// Consumed by the `users-guide-ai` edge function as grounding context.
// Kept in lock-step with the User's Guide (src/data/userGuideMarkdown.ts)
// and the Full Specification (src/data/specMarkdown.ts).

export const ASSISTANT_KNOWLEDGE_BASE = `
# NEURON GARAGE FRANCHISE — INTERNAL RECRUITING CONSOLE (v1.4 · May 31, 2026)

## Who this tool is for
Three core users today: Kaylie Reed (founder), Sam, and the Neuron Garage
team — including Brett, Haseeb (engineering), and the marketing/recruiting
franchise staff. It is an internal SaaS, not public-facing. Optimize answers
for clarity over polish. Audience is non-technical except for Haseeb and
Brett.

## What Neuron Garage is
Kaylie Reed's franchise education company. The Franchise Acquisition System
helps the team find brilliant elementary teachers in the right U.S. cities
and walk them all the way to signing as franchisees.

## Key numbers (May 31, 2026)
- 817 U.S. cities pre-scored in us_cities_scored (population >= 50,000).
- 38,196 public K-12 schools (NCES CCD).
- 12 live SOW metrics across 3 categories: Demand, Operator & Venue Supply,
  Competitive Opportunity.
- 30 deployed edge functions.

## The four features (build order = sidebar order)

### 1. City Search - "Where should we open next?"
- Type a city or browse all U.S. metros. Each gets a score out of 100.
- 12 SOW metrics in 3 categories (Demand, Operator & Venue Supply, Competitive
  Opportunity), plus demographics, schools, incomes, growth.
- Filter by state, Tier (A / B / C / D), or registration status.
- Open any city to see the full breakdown - every number, every source.
- Compare up to 3 cities side-by-side.
- Master sliders auto-rebalance to 100%. Sub-metric weights do NOT - they
  are typed as relative-importance numbers and normalized on Apply.
- Every score has "Show Formula". No black boxes - ever.
- Data sources: US Census ACS, BLS, BEA, FRED, NCES CCD - all wired.
- 38 non-registration states are hard-coded business logic.
- City Notes: teammates leave shared comments on a city's drawer.
- Export Raw Signals as XLSX.
- Ask AI on a city follows the 3-tier Operator & Venue Supply rule so the AI quotes the same
  number you see on screen.
- ONE CALIBRATED NUMBER EVERYWHERE: pillar + composite scores on the
  table, "Why this tier?" popover, selected-market right panel, Compare
  modal, and XLSX export all read from the same recomputed helper.
  If they ever disagree, it's a bug - tell Haseeb.
- Two displayed numbers, same truth: Total Score (school-grade scale,
  e.g. 91) and Weighted Composite Index (raw engine math, e.g. 63).
  Order and tiers are identical; only the displayed number shifts.
- Next: hit "Find Teachers in this City" to jump to Teacher Search
  pre-filtered.

### 2. Teacher Search - "Who in that city should we talk to?"
- Pulls elementary teachers in the chosen city and scores each for fit.
- Inputs: years of experience, leadership roles, side hustles (DonorsChoose
  campaigns, Teachers Pay Teachers, tutoring), school quality, enrichment
  signals.
- Filter by city, fit score, tag, enrichment status, teacher type.
- Teacher type enum: "active" | "retired" | "camp_enrichment".
- Open a teacher card to see bio, school info, signals, contact details.
- Saved Lists: group teachers across cities (e.g. "Texas shortlist").
- Bulk Action Bar: bulk-tag, bulk-promote, or export a shortlist.
- Market Context Banner at the top reminds you the city's tier + why.
- Next Best Action Strip suggests the single best move on this screen
  right now.
- "Promote" lands a teacher in the Candidate Pipeline as a New Lead.
- Outreach Intelligence panel suggests best time of day + channel.
- Data sources: Apollo (have access), Apify (connected), DonorsChoose
  (not yet wired), GreatSchools (waiting on Brett's API key), Firecrawl
  for enrichment scraping.

### 3. Email Outreach - "How do we start the conversation?"
- Two pools, one screen. The Viewing toggle at the top flips between:
  * Master Teacher DB - every teacher we know about. Our owned recruiting
    asset, growing every time you import a CSV.
  * SmartLead - the subset we've pushed into a live campaign.
- Import any CSV into the Master Pool - Lovable AI figures out the column
  mapping for you, no manual matching required.
- Preview duplicates and verification quality before a single row hits the
  database.
- Push verified leads to a SmartLead campaign with a live filter preview
  that tells you exactly how many will go.
- Triage replies in SEVEN colored buckets: Interested, Meeting, Info,
  Soft No, Wrong Person, Not Interested, OOO. Green replies promote
  straight into the Candidate Pipeline.
- Every outbound email is AI-personalized using known teacher signals.
  No copy-paste blasts.

WARM-UP STATUS (important):
SmartLead is in mailbox WARM-UP right now. The small numbers in the
SmartLead / Warm-Up pill are internal staff + warm-up pool sends.
WE ARE NOT EMAILING TEACHERS YET. The third pill, Live Outreach, stays
disabled until warm-up completes.

TRANSACTIONAL EMAIL (separate from SmartLead):
Edge functions send-transactional-email, process-email-queue,
weekly-data-health-digest, handle-email-suppression, handle-email-unsubscribe
power password resets, weekly digests, and unsubscribe handling. Staff
don't manage these directly. See Email Outreach Docs in the sidebar.

Gotcha: SmartLead "track_settings" uses NEGATIVE booleans
(DONT_TRACK_OPEN, DONT_TRACK_CLICK). Set carefully.

### 4. Candidate Pipeline - "Who's getting close to signing?"
- Kanban board with 7 stages: New Lead -> Engaged -> Qualified -> Immersion
  -> Confirmation -> Signing -> Disqualified.
- Each card has a six-criteria 1-5 qualification scorecard: capital,
  motivation, market knowledge, time commitment, leadership, culture fit.
- Tabs per candidate: Overview, Lead Sheet, Qualification, Documents,
  Homework, Committee Votes, Notes/Activity, Stage History.
- Documents tab covers FDD, FA, Step 2/4 uploads, candidate compliance
  files. Stored in the candidate_documents Supabase bucket.
- Selection Committee votes cast during the Immersion stage. Manual votes
  supported.
- Score Override: if a teammate's gut disagrees with the formula they can
  override the score with a written reason. Every override is written to
  the compliance audit log (candidate_compliance_audit table) via the
  log_compliance_change trigger.
- Export Packet: one-click bundle of score + notes + key docs for a
  committee review.
- Days-in-stage prevents stale cards: green <=3, amber 4-7, red 8+.

HARD GATES (by design - do not bypass):
- A card cannot drop into "Signing" without first passing "Confirmation".
- 16-DAY FDD GATE: a candidate cannot sign within 16 days of receiving the
  FDD. The gate appears in the Documents tab and blocks the stage move if
  the clock hasn't run.

CARD ANATOMY:
- Left stripe = days in stage (green/amber/red).
- Initials circle = candidate avatar (identity only).
- "Qual" pill = composite of 5 star-pillar ratings (Teaching, Leadership,
  Financial, Market Fit, Culture Fit). Hidden until at least one is rated.
- Blue tag = short qualitative status (Interested / High Potential /
  Follow-Up).
- "Day N" = days in current stage, resets on move.
- Small letter circle = owner's first initial; hover for full name.

## Dashboard
Not a feature - the "what should I do next?" home screen. The orange
Next Action card surfaces the single most important next step across the
four features (e.g. "Find teachers in {city}", "Reply to {candidate}").

## Neuron AI - the global ⌘K assistant
Press Cmd+K (Mac) or Ctrl+K (Windows) on any screen. The global Neuron AI
assistant knows the page you're on and the row you've selected. It can:
- Explain any score or formula in plain English.
- Answer "what should I do next?" questions.
- Pull facts from the Spec, the User's Guide, and live database tables.
- Suggest follow-up questions.
It is a DOMAIN assistant, not a free-form chatbot. Off-topic asks get
politely steered back to the four features.

## Notifications (header bell)
The bell icon in the top-right header surfaces real-time alerts:
- New reply in Email Outreach.
- Candidate stale in pipeline (8+ days in a stage).
- SmartLead campaign hit warm-up milestones.
- Data-health rules tripped (Haseeb / Brett see these first).
Click to read, mark-as-read, or jump straight to the source.

## Database Health & Observability
For Haseeb and Brett (manager / admin roles only). Surfaces:
- Row counts and freshness for cities, schools, teachers, candidates.
- Invariant rules - things that should always be true. Green/yellow/red.
- Outlier checks on key scoring columns (composite_score_default,
  population, median_household_income, etc).
- 30-day history per domain and an open / closed incident log.
Powered by db_health_snapshot, db_health_run_rule, db_health_outliers,
and db_health_history_for SECURITY DEFINER functions.
If you're not Haseeb or Brett, you won't see this - that's intentional.

## In-app reference docs (sidebar)
- Full Specification - complete v1.4 product spec (technical).
- User's Guide - this plain-English guide (downloadable as .md).
- Demographics Methodology - how City Search numbers are computed.
- Email Outreach Docs - SmartLead integration + transactional email infra.
- Observability Guide - how the data-health surface works.
- SmartLead Spec - full integration contract.

## Onboarding
Phase 2. The code and /onboarding route still exist but onboarding is out
of scope for Phase 1. Focus is on getting the first signed franchisees
through the door.

## Phase 2 roadmap (source of truth = .lovable/phase-2/)
9-item SOW:
1. Market Validation 1A - Tier-1 stamp on every city using latest SOW data.
2. Site Analysis 1B - real estate / site fit overlay on city scores.
3. Candidate Portal - self-serve portal for franchisee applicants.
4. Candidate Pipeline 1.5 - pipeline polish, better docs + scorecard.
5. Teacher Search 1.5 - faster filters, better fit-score model.
6. SmartLead 1.5 - live outreach unlock after warm-up.
7. Mailboxes - per-recruiter inbox management.
8. Video Training module - onboarding & training videos for franchisees.
9. Manus CSI app - standalone CSI scoring app (CSI v2 already uploaded).

## Design principles baked into every screen
1. Always one screen ahead - every page has a clear next step.
2. Show the math - every calculated number has a "Show Formula" reveal.
3. AI helps, you decide - suggestions never override human judgment.
4. Built for the team - Kaylie, Sam, recruiting staff. Clunky-but-clear
   beats pretty-but-mysterious.

## Tech stack (only mention if asked)
React + TypeScript on Lovable. Backend is "the system" (managed Postgres +
Auth + Edge Functions + Storage + Realtime). Auth is email/password only -
Google/MS/SSO intentionally removed. Hosted at
neuron-garage-franchise.lovable.app.

## Roles on the team
- Kaylie Reed - founder
- Sam - senior exec, owner of scoring engine logic
- Brett - operations / API access; co-approver with Haseeb
- Haseeb - engineering
- Recruiting staff - daily users of Teacher Search, Email Outreach,
  Candidate Pipeline

## Common questions & answers

Q: Where do I start?
A: The Dashboard. The orange Next Action card tells you exactly what to do.

Q: Can I trust the scores?
A: Yes - every score has "Show Formula". The "one calibrated number
everywhere" rule means the same recomputed value shows up on the table,
the popover, the right panel, the Compare modal, and the export. If
anything looks off, tell Haseeb or Brett.

Q: Why two numbers - Total Score and Weighted Composite Index?
A: Same truth, two scales. Weighted Composite Index is the raw engine
math used to sort cities and assign Tiers A-D. Total Score is the same
number on a school-grade scale (e.g. 91 vs 63). Order and tiers are
identical - only the displayed number shifts.

Q: Are we emailing teachers yet?
A: Not yet. SmartLead is in mailbox WARM-UP. The numbers in the
SmartLead / Warm-Up pill are internal staff + warm-up pool sends. Live
Outreach stays disabled until warm-up completes.

Q: What if I promote the wrong teacher?
A: Move the card to Disqualified in the Candidate Pipeline. They stay in
Teacher Search for future review. No harm done.

Q: Who can see what I do?
A: Everyone on the team sees the same data. There is no private view -
that's intentional.

Q: Why can't I drop a card into Signing?
A: Two gates. The Confirmation gate (Signing only opens after Confirmation
passes) and the 16-day FDD gate (no signing within 16 days of FDD
receipt). Both enforced; neither is a bug.

Q: What's the difference between Master Teacher DB and SmartLead?
A: Master Pool = every teacher we know about (our owned asset). SmartLead
= the subset currently in a live campaign. Toggle at the top of Email
Outreach.

Q: How do I find a teacher in a specific city?
A: City Search -> open the city -> "Find Teachers in this City". Teacher
Search opens pre-filtered.

Q: How do I send a personalized email?
A: Email Outreach -> import or pick a list -> the AI personalizes each
email using teacher signals -> push to a SmartLead campaign.

Q: A candidate replied - what now?
A: Tap the Interested chip on their reply, then promote them into the
Candidate Pipeline as a New Lead.

Q: How do I move someone to Signing?
A: Drag the card forward through each stage in Candidate Pipeline. The
system enforces that Signing only opens after Confirmation passes AND
the 16-day FDD clock has run.

Q: What is Neuron AI?
A: The global Cmd+K (or Ctrl+K) assistant on every screen. It knows the
page you're on and can explain scores, answer "what's next?", and pull
facts from the spec and live database.

Q: What's in the bell icon?
A: Notifications - new replies, stale candidates, warm-up milestones,
data-health alerts. Click to read or jump straight to the source.

Q: What's the Database Health page?
A: A data-health surface for Haseeb and Brett. Row counts, invariants,
outlier checks, incidents. Not visible to non-managers.

Q: What's coming in Phase 2?
A: Nine items including Market Validation 1A, Site Analysis 1B, Candidate
Portal, Teacher Search 1.5, SmartLead 1.5, Mailboxes, Video Training,
and the Manus CSI app. Source of truth lives in .lovable/phase-2/.
`.trim();
