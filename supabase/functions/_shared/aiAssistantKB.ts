// Knowledge base for the Neuron Garage AI Assistant.
// Consumed by the `users-guide-ai` edge function as grounding context.

export const ASSISTANT_KNOWLEDGE_BASE = `
# NEURON GARAGE FRANCHISE — INTERNAL RECRUITING CONSOLE

## Who this tool is for
Three core users today: Kaylie Reed (founder), Sam, and the Neuron Garage
team — including Brett, Haseeb (engineering), and the marketing/recruiting
franchise staff. It is an internal SaaS, not public-facing. Optimize answers
for clarity over polish. The audience is non-technical except for Haseeb and
Brett.

## What Neuron Garage is
Kaylie Reed's franchise education company. The Franchise Acquisition System
helps the team find brilliant elementary school teachers in the right U.S.
cities and walk them all the way to signing as franchisees.

## The four features (build order matches sidebar order)

### 1. City Search — "Where should we open next?"
- Type a city or browse all U.S. metros. Each gets a score out of 100.
- 46 underlying metrics across 6 categories: kids & families, schools,
  income & growth, competitor density, climate/lifestyle, registration
  friction.
- Filter by state, tier (A / B / C), or registration status.
- Open any city to see the full breakdown — every number, every source.
- Compare up to 3 cities side-by-side.
- Master sliders auto-rebalance to 100%. Sub-metric weights do NOT — they
  are typed as relative-importance numbers and normalized on Apply.
- Every score has a "Show Formula" affordance. No black boxes — ever.
- Data sources: US Census ACS, BLS, BEA, FRED, NCES CCD — all wired.
- 38 non-registration states are hard-coded business logic.
- Next action: hit "Find Teachers in this City" to jump to Teacher Search
  pre-filtered.

### 2. Teacher Search — "Who in that city should we talk to?"
- Pulls elementary teachers in the chosen city and scores each for fit.
- Inputs: years of experience, leadership roles, side hustles (e.g.
  DonorsChoose campaigns, Teachers Pay Teachers, tutoring), school quality,
  enrichment signals.
- Filter by city, fit score, tag, or enrichment status.
- Open a teacher card to see bio, school info, signals, contact details.
- Bulk-tag, bulk-promote, or export a shortlist.
- "Promote" lands a teacher in the Candidate Pipeline as a New Lead.
- Outreach Intelligence panel suggests best time of day + channel.
- Teacher type enum is fixed: "active" | "retired" | "camp_enrichment".
- Data sources: Apollo (have access), Apify (connected), DonorsChoose
  (not yet wired), GreatSchools (waiting on Brett's API key), Firecrawl
  for enrichment scraping.

### 3. Email Outreach — "How do we start the conversation?"
- Full inbox built on top of Integral Leads (our SmartLead-powered sending
  engine).
- 6-panel layout: SmartLead Connection, Email Accounts, SmartLead
  Campaigns, Prospect Batches, Import Wizard, Inbox.
- Import Wizard supports Apollo, Clay, LinkedIn Navigator, CSV, manual.
  Maps fields, dedupes, assigns to a campaign.
- Real-time inbox via webhook → realtime — replies land the moment a
  teacher writes back.
- 4 reply intent chips: Interested, Not Now, Not Interested, Question.
- Every email is AI-personalized using known teacher signals. No
  copy-paste blasts.
- Gotcha: SmartLead "track_settings" uses NEGATIVE booleans
  (DONT_TRACK_OPEN, DONT_TRACK_CLICK). Set carefully.
- Next: promote interested replies into the Candidate Pipeline.

### 4. Candidate Pipeline — "Who's getting close to signing?"
- Kanban board with 7 stages: New Lead → Engaged → Qualified → Immersion
  → Confirmation → Signing → Disqualified.
- Each card has a six-criteria 1–5 qualification scorecard: capital,
  motivation, market knowledge, time commitment, leadership, culture fit.
- Tabs per candidate: Overview, Lead Sheet, Qualification, Homework,
  Committee Votes, Notes/Activity, Stage History.
- "Days in stage" prevents cards from going stale.
- Selection Committee votes are cast during the Immersion stage.
- Hard gate: a card cannot drop into "Signing" without passing
  "Confirmation". The gate is enforced by design — do not bypass.

## Dashboard
Not a feature — it's the "what should I do next?" home screen. The orange
Next Action card surfaces the single most important next step across the
four features (e.g. "Find teachers in {city}", "Reply to {candidate}").

## Onboarding
Phase 2. The code and the /onboarding route still exist but onboarding has
been removed from the spec for now. Focus is on getting the first signed
franchisees through the door.

## Design principles baked into every screen
1. Always one screen ahead — every page has a clear next step.
2. Show the math — every calculated number has a "Show Formula" reveal.
3. AI helps, you decide — suggestions never override human judgment.
4. Built for three people — Kaylie, Sam, Team. Clunky-but-clear beats
   pretty-but-mysterious.

## Tech stack (only mention if asked)
React + TypeScript on Lovable. Backend is Lovable Cloud (Supabase).
Auth is email/password only — Google/MS/SSO intentionally removed.
Hosted at neuron-garage-franchise.lovable.app. GitHub repo:
haseeb-integral/neuron-garage-franchise.

## Roles on the team
- Kaylie Reed — founder
- Sam — senior exec, owner of scoring engine logic
- Brett — operations / API access (GreatSchools key, etc.)
- Haseeb — engineering
- Recruiting staff — daily users of Teacher Search, Email Outreach,
  Candidate Pipeline

## Common questions & answers

Q: Where do I start?
A: The Dashboard. The orange Next Action card tells you exactly what to do.

Q: Can I trust the scores?
A: Yes — every score has "Show Formula". The inputs and weights are
visible. If something looks off, tell Brett or Haseeb.

Q: What if I promote the wrong teacher?
A: Move the card to Disqualified in the Candidate Pipeline. They stay in
Teacher Search for future review. No harm done.

Q: Who can see what I do?
A: Everyone on the team sees the same data. There is no private view —
that is intentional.

Q: What happens after Signing?
A: Phase 2 — onboarding. The code is parked while we focus on the first
signed franchisees.

Q: How do I find a teacher in a specific city?
A: Open City Search, find the city, then click "Find Teachers in this
City". Teacher Search opens pre-filtered.

Q: How do I send a personalized email?
A: Open Email Outreach → pick or create a campaign → use the Import Wizard
to load prospects → the AI personalizes each email using teacher signals.

Q: A candidate replied — what now?
A: Tap the Interested chip on their reply in Email Outreach, then promote
them into the Candidate Pipeline as a New Lead.

Q: How do I move someone to Signing?
A: Drag the card forward through each stage in Candidate Pipeline. The
system enforces that Signing can only be reached after Confirmation.
`.trim();
