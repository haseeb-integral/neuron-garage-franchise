# Neuron Garage WORKFLOW.md

This file explains the product workflow in plain English. Use it when deciding where a feature belongs, how screens should connect, and what should happen when a user clicks through the app.

---

## 1. Core Product Journey

The correct workflow order is:

```text
City Search → Teacher Prospects → Email Outreach → Candidate Pipeline → Onboarding
```

Plain-English version:

```text
Find Market → Find Prospects → Outreach → Qualify Candidate → Onboard Franchisee
```

This order should guide the sidebar, page CTAs, future screen design, and feature logic.

---

## 2. Feature 1: City Search / Market Scoring

### Purpose

Find the best franchise markets.

### What the user does

- Reviews ranked markets.
- Looks at scoring factors.
- Compares markets.
- Opens market details.
- Chooses a market to investigate further.

### Output

A selected market, such as:

```text
Frisco, TX
```

### Next screen

```text
Teacher Prospects
```

### Main CTA

```text
Find Teachers in This Market
```

### Important wording

Use **Market** when discussing the franchise opportunity.

Example:

```text
Frisco, TX is the selected market.
```

---

## 3. Feature 2: Teacher Prospects

### Purpose

Find teacher-operator prospects inside the selected market.

### What the user does

- Reviews teacher prospects for the selected market.
- Filters by city, fit tag, grade, status, and camp experience.
- Opens profile details.
- Enriches/reviews contact data.
- Adds promising teachers to outreach.
- Promotes only clear interested/high-confidence prospects to the pipeline.

### Important distinction

A teacher prospect is **not** a candidate yet.

They become a candidate when:

- they reply with interest,
- they book a meeting,
- or a user manually promotes them to the Candidate Pipeline.

### Normal next screen

```text
Email Outreach
```

### Common actions

```text
Find Prospects
Change Market
Export CSV
View profile
Enrich contact
Add to shortlist
Add to Outreach Campaign
Promote to Pipeline
Mark not fit
```

### Promotion behavior

When a teacher is promoted:

- Keep the teacher visible in Teacher Prospects.
- Add a Promoted badge/status.
- Disable duplicate promotion.
- Add/view the person in Candidate Pipeline.

---

## 4. Feature 4: Email Outreach

### Purpose

Email Outreach bridges Teacher Prospects and Candidate Pipeline.

This screen is a campaign control center. It should not be the heavy email-sending engine itself.

### What the user does

- Imports selected teacher prospects from Teacher Prospects.
- Adds them to outreach campaigns.
- Reviews campaign status.
- Syncs or reviews replies.
- Identifies interested teachers.
- Promotes interested replies to Candidate Pipeline.

### Recommended architecture

```text
Lovable/App UI = dashboard and control panel
Supabase = app database/status storage
SmartLead or GoHighLevel = real outbound email engine
Resend = transactional emails only, not cold outreach campaigns
```

### MVP behavior

For MVP/demo, do not call paid or live email APIs automatically.

Use:

- sample campaign data,
- safe toasts,
- mock sync behavior,
- and clear placeholder labels.

### Core sections

```text
Header
Summary cards
Campaign cards
Filters
Outreach prospects table
Outreach insights panel
```

### Common actions

```text
Import from Teacher Prospects
Add selected prospects to campaign
Create Campaign
Sync Replies
View Campaign
Pause Campaign
Promote Interested to Candidate Pipeline
Export CSV
```

### Email status values

```text
Drafted
Queued
Sent
Bounced
Paused
```

### Engagement values

```text
Not Opened
Opened
Clicked
Replied
```

### Reply status values

```text
No Reply
Follow-Up Needed
Interested
Not Interested
Meeting Booked
Promoted
```

### Next screen

```text
Candidate Pipeline
```

---

## 5. Feature 3: Candidate Pipeline

### Purpose

Qualify interested prospects through the formal franchise candidate process.

### Entry point

A teacher/prospect enters Candidate Pipeline after showing interest or being promoted.

Most common path:

```text
Email Outreach → Interested Reply → Promote to Candidate Pipeline
```

### What the user does

- Reviews candidate status.
- Moves candidates through stages.
- Adds notes.
- Schedules or tracks calls.
- Reviews fit and qualification.
- Marks candidates disqualified when needed.
- Moves signed/approved candidates to onboarding.

### Candidate rule

Candidate Pipeline is for qualification, not cold prospecting.

Cold prospects belong in Teacher Prospects or Email Outreach.

### Common actions

```text
Move stage
Add note
Assign owner
Schedule call
Review fit score
Mark disqualified
Move to onboarding
```

### Next screen

```text
Onboarding
```

---

## 6. Feature 5: Onboarding

### Purpose

Manage signed or approved franchisees after the candidate process.

### Entry point

A candidate reaches signing/final approval, then moves into onboarding.

### What the user does

- Tracks documents.
- Tracks agreements.
- Tracks setup steps.
- Tracks training tasks.
- Tracks launch readiness.

### Common onboarding areas

```text
Forms
Documents
Agreements
Training
Location setup
Launch checklist
Owner readiness
```

---

## 7. Sidebar Order

The sidebar should follow the real operational flow:

```text
Dashboard
City Search
Teacher Prospects
Email Outreach
Candidate Pipeline
Onboarding
Team Members
Settings
```

---

## 8. Main Data Flow

```text
1. User selects a market in City Search.
2. User finds teacher prospects in that market.
3. User adds selected prospects to Email Outreach.
4. Outreach campaign sends/syncs through SmartLead or GHL later.
5. Interested replies are promoted to Candidate Pipeline.
6. Qualified/signed candidates move to Onboarding.
```

---

## 9. MVP Safety Rules

Until live integrations are approved:

- Do not call paid APIs automatically.
- Do not send real emails automatically.
- Do not run real scraping automatically.
- Do not store API keys in code.
- Use sample/mock data for demos.
- Use safe toasts where integrations are not connected.

Good MVP toast examples:

```text
Sample replies synced. SmartLead sync will be connected later.
Sample data refreshed. Live source refresh will be connected later.
Sample enrichment queued for Sarah Mitchell.
```

---

## 10. Decision Rule

When deciding where a feature belongs, ask:

```text
Is this finding a market? → City Search
Is this finding people in a market? → Teacher Prospects
Is this contacting those people? → Email Outreach
Is this qualifying interested people? → Candidate Pipeline
Is this setting up signed franchisees? → Onboarding
```
