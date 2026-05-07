# Neuron Garage DESIGN.md

This file is the design memory for the Neuron Garage franchise operations app. Use it as the source of truth for future screens, Lovable prompts, GitHub/Codex work, mockups, slide visuals, and any migration to another platform.

The goal is not to create a trendy generic SaaS interface. The goal is a calm, credible, premium operations dashboard that feels trustworthy for a franchise client, easy for non-technical users, and consistent across every workflow.

---

## 1. Product Context

Neuron Garage is a franchise operations and growth dashboard. The app helps the team:

1. Find and score attractive local markets.
2. Find teacher prospects inside those markets.
3. Run email outreach to teacher prospects.
4. Promote interested prospects into the candidate pipeline.
5. Onboard qualified franchisees.

Core workflow:

```text
City Search → Teacher Prospects → Email Outreach → Candidate Pipeline → Onboarding
```

Plain-English journey:

```text
Find Market → Find Prospects → Outreach → Qualify Candidate → Onboard Franchisee
```

Important language rule:

- A **city** is a geographic place, such as Frisco.
- A **market** is the business opportunity area being evaluated, usually a city plus state, such as Frisco, TX.
- A **teacher prospect** is not yet a candidate.
- A person becomes a **candidate** only after showing interest or being promoted into the Candidate Pipeline.

---

## 2. Design Philosophy

### Core feeling

The UI should feel:

- Clean
- White
- Calm
- Structured
- Premium but not flashy
- Operational, not marketing-heavy
- Easy to scan in a meeting/demo

### Visual direction

Use a white-first dashboard language:

- Page background: white or almost-white.
- Cards/components: white.
- Borders: very light and thin.
- Shadows: none or extremely subtle.
- Primary action color: blue.
- Orange should not be used as a main action color. Use orange only for warning, pending, or secondary accent states.

### Avoid

Do not use:

- Heavy gray blocks
- Purple gradients
- Large decorative gradients
- Dark dashboard panels
- Big heavy shadows
- Orange primary CTAs
- Oversized chips or badges
- Excessive card borders inside card borders
- Generic startup/AI styling
- Random abstract graphics that do not help the workflow

---

## 3. Color System

### Primary colors

```text
Primary Blue:       #174BE8
Primary Blue Hover: #123FC5
Deep Navy Text:     #07142F
Main Body Text:     #34445F
Muted Text:         #526078
Secondary Muted:    #66728A
Soft Muted:         #8794AB
```

### Backgrounds and borders

```text
Page Background:        #FFFFFF
Alternative Page BG:    #F8FBFF only when slight separation is needed
Card Background:        #FFFFFF
Card Border:            #E7EDF5
Inner Border:           #EDF2F8
Input Border:           #DBE4F2
Soft Blue Surface:      #EEF4FF
Soft Green Surface:     #E6F7EF
Soft Gold Surface:      #FFF4DF
Soft Gray Surface:      #EEF2F7
```

### Semantic colors

```text
Success Green:      #0EA66E
Success Text:       #0A8F5A
Warning Gold:       #F59E0B
Warning Text:       #B7791F
Danger Red:         #EF4444
LinkedIn Blue:      #0A66C2
Facebook Blue:      #1877F2
Purple Accent:      #7C3AED
Cyan Accent:        #0891B2
```

### Usage rules

- Blue = primary actions, active screen, selected tab, main progress.
- Green = positive status, high fit, enriched, completed.
- Gold/orange = pending, follow-up, needs attention.
- Red = destructive or not a fit.
- Gray = neutral status, promoted/archived, secondary information.

---

## 4. Typography

### Font family

Use Inter across the app.

```css
font-family: 'Inter', sans-serif;
```

### Type scale

Use compact dashboard typography.

```text
Page H1:        24px / 28px, 800-900 weight
Section H2:     18px / 24px, 800-900 weight
Card Title:     14px-16px, 700-900 weight
Body:           14px, 400-500 weight
Small Body:     12px, 400-600 weight
Micro Label:    10px-11px, 700 weight, uppercase only when useful
Metric Number:  20px-24px, 900 weight
```

### Text color rules

- Titles: `#07142F`
- Body text: `#34445F` or `#526078`
- Helper text: `#66728A`
- Placeholder/tertiary text: `#8794AB`
- Links/actions: `#174BE8`

### Copy style

Use operational language, not vague marketing language.

Good:

```text
Find teacher-operators for Frisco, TX
Promote to Candidate Pipeline
Sync Replies
Add to Outreach Campaign
```

Avoid:

```text
Unlock AI Magic
Supercharge Growth
Revolutionary Outreach Intelligence
```

---

## 5. Layout System

### Page shell

- Max content width: roughly `1280px` to `1360px`.
- Main background: white.
- Use consistent page padding: `12px-24px` depending on viewport.
- Avoid giant vertical gaps.
- Keep screens compact enough for demo views.

### Grid strategy

Common dashboard page:

```text
Header
Primary context card
Summary/KPI card row
Main content grid
  Left: table/work area
  Right: insights panel
```

For main grid:

```text
Desktop: minmax(0, 1fr) + 300px/320px right panel
Tablet: stacked
Mobile: stacked
```

### Spacing

```text
Between page sections: 12px-16px
Inside cards: 12px-20px
Between compact controls: 8px-12px
Table row height: 52px-58px when compact
Large card radius: 12px-16px
Input/button radius: 8px-10px
```

---

## 6. Card System

### Standard card

Use this style for most components:

```text
Background: #FFFFFF
Border: 1px solid #E7EDF5
Radius: 12px or 16px
Shadow: 0 1px 2px rgba(15,23,42,0.02) or none
Padding: 12px-20px
```

### Card rules

- Cards should be white, not gray.
- Use light border to define sections.
- Avoid heavy nested cards.
- If stats sit inside one larger context card, prefer one shared container with separators instead of separate heavy cards.
- KPI cards should be compact, with icon left, text right.

### Metric cards

Preferred pattern:

```text
[icon box]  Title
            Big number
            small trend/status
```

Icon box:

```text
Size: 32px-40px
Radius: 8px-10px
Background: soft blue/green/gold/cyan
Icon: 15px-18px
```

---

## 7. Buttons

### Primary button

```text
Background: #174BE8
Hover: #123FC5
Text: white
Height: 36px-40px
Radius: 8px-10px
Font: 12px-14px bold
```

Use for:

- Find Prospects
- Create Campaign
- Promote to Candidate
- Save changes
- Apply action

### Secondary button

```text
Background: #FFFFFF
Border: #DBE4F2
Text: #174BE8
Hover background: #F4F7FF
Height: 32px-40px
```

Use for:

- Export CSV
- Change Market
- Run Prospect Search
- Sync Replies
- View Report

### Destructive button

```text
Border/Text: #EF4444
Background: #FFFFFF
Hover background: #FFF5F5
```

Use only for:

- Not a Fit
- Remove
- Archive/Delete type actions

### Button rules

- Do not use orange as primary button color.
- Do not create very tall buttons in table rows.
- Prefer 3-dot menus for row actions if space is tight.

---

## 8. Inputs, Filters, and Search

### Inputs

```text
Background: #FFFFFF
Border: #DBE4F2
Text: #07142F
Placeholder: #8794AB
Height: 36px-40px
Radius: 8px-10px
Focus: no ugly black/blue ring; keep subtle border or soft blue ring only if needed
```

### Filter bar

Use a compact white card.

Recommended structure:

```text
[Search field flexible width] [City] [Fit Tag] [Grade] [Status] [Checkbox filter]
```

Filters should stay in one row on wide screens when possible.

### Dropdown labels

Use specific labels, not vague labels:

- Use `Fit Tag`, not `Tag`.
- Use `All Fit Tags`, not `All Tags`.
- Use `All Status`, not `All Enrichment` unless the status specifically means enrichment.

---

## 9. Tables

### Table style

```text
Container: white card with light border
Header: white or #FBFCFE
Header text: #8794AB, 10px-11px, bold
Rows: white
Row divider: #EDF2F8
Hover: #F7FAFF
Row height: 52px-58px
```

### Table rules

- Keep rows compact.
- Use badges/chips sparingly.
- Do not let chips dominate a row.
- Use row 3-dot menu for secondary actions.
- Selection checkboxes should not produce heavy focus rings.
- Pagination should be compact and aligned bottom-right.
- Empty space below table should be reduced by showing enough rows or aligning adjacent panel height.

### Row action menu

Use a 3-dot menu when multiple actions exist.

Common row actions:

```text
View profile
Enrich contact
Add to shortlist
Add to Outreach Campaign
Promote to Pipeline
Mark not fit
```

---

## 10. Badges and Chips

### Chip style

```text
Height: 18px-24px
Radius: full
Padding: 6px-10px horizontal
Font: 10px-12px bold
```

### Fit tag chips

Use compact labels in tables:

```text
High Potential → High
Follow-Up → Follow
Not a Fit → Not Fit
Untagged → Untagged
```

Full labels can appear in drawer/details or as hover title.

### Status chips

```text
Enriched: green
Pending: gold
Promoted: gray
Interested: green/blue
No Reply: gray
Follow-Up Needed: gold
Not Interested: gray/red depending context
```

### Rules

- Never let a tag chip become a large pill that widens the table row.
- Long labels should be shortened in tables.
- Use full text in detail drawers if needed.

---

## 11. Drawers, Modals, and Sheets

### Drawer style

```text
Background: white
Width: 420px-500px desktop
Border left: #E7EDF5
Header: white with bottom border
Section cards: white with light border
```

### Drawer content pattern

For profile/details drawers:

```text
Header:
- Name/title
- subtitle/location
- key score badge

Sections:
- Contact
- Background
- AI Fit Score / Reasoning
- Tags
- Notes
- Primary actions
```

### Modal style

```text
White background
Light border
Rounded 16px
Clean header
Compact footer actions
No heavy overlays or large colorful areas
```

---

## 12. Navigation and Sidebar

### Sidebar order

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

### Workflow order

```text
City Search → Teacher Prospects → Email Outreach → Candidate Pipeline → Onboarding
```

### Active navigation

- Active item: blue background or blue accent with white text.
- Inactive items: navy/slate text on white background where possible.
- Keep sidebar calm and consistent.

---

## 13. Screen Patterns

## 13.1 City Search / Market Scoring

Purpose:

- Score and compare markets.
- Choose a market to investigate.
- Move into Teacher Prospects.

Core sections:

```text
Header actions
Scoring weights / filters
Ranked Markets list
Selected Market detail panel
Right insights column
Market Details drawer
Compare modal
Report preview
```

Key rule:

Use `Market`, not `City`, when discussing the business opportunity.

Main CTA:

```text
Find Teachers in This Market
```

---

## 13.2 Teacher Prospects

Purpose:

- Find teacher-operator prospects inside a selected market.
- Review fit and contact enrichment.
- Add prospects to outreach or promote directly only when appropriate.

Core sections:

```text
Header with market-specific title
Market Context card
Compact summary cards
Filter bar
Teacher prospects table
Sourcing Insights right panel
Teacher profile drawer
```

Correct title pattern:

```text
Frisco, TX Teacher Prospects
```

Important actions:

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

Workflow rule:

Teacher Prospects should feed Email Outreach first. Promote to Pipeline is allowed for manually identified strong leads or interested prospects, but the normal workflow is Outreach first.

---

## 13.3 Email Outreach

Purpose:

Email Outreach is the bridge between Teacher Prospects and Candidate Pipeline. It should be a campaign control center.

It should not be the heavy email-sending engine itself. The app should function as a dashboard/control panel, while SmartLead or GoHighLevel can handle real sending later.

Recommended architecture:

```text
Lovable/App UI = dashboard and control panel
Supabase = app database and status storage
SmartLead or GHL = real outbound campaign engine
Resend = transactional emails only, not cold outreach campaigns
```

Previous screen:

```text
Teacher Prospects
```

Next screen:

```text
Candidate Pipeline
```

Core sections:

```text
Header:
- Email Outreach or Frisco, TX Email Outreach
- Export CSV
- Sync Replies
- Create Campaign

Summary cards:
- Active Campaigns
- Prospects in Outreach
- Replies
- Interested Leads

Main left area:
- Campaign cards
- Filters
- Outreach prospects table

Right insight panel:
- Outreach Insights
- Reply Status Breakdown
- Recommended Next Step
```

Core actions:

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

Email status values:

```text
Drafted
Queued
Sent
Bounced
Paused
```

Engagement values:

```text
Not Opened
Opened
Clicked
Replied
```

Reply status values:

```text
No Reply
Follow-Up Needed
Interested
Not Interested
Meeting Booked
Promoted
```

Campaign status values:

```text
Draft
Active
Paused
Completed
```

MVP rule:

Do not call paid/live email APIs automatically. Use sample data, safe toasts, and mock sync behavior until the real integration is approved.

---

## 13.4 Candidate Pipeline

Purpose:

- Qualify interested prospects.
- Move candidates through formal franchise qualification stages.

Entry point:

```text
Email Outreach → interested reply → Promote to Candidate Pipeline
```

Candidate stages should be treated as formal qualification, not cold prospecting.

Common actions:

```text
Move stage
Add note
Assign owner
Schedule call
Review fit score
Mark disqualified
Move to onboarding
```

---

## 13.5 Onboarding

Purpose:

- Manage signed/approved franchisees after candidate qualification.
- Track forms, documents, agreements, training, setup, and launch tasks.

Entry point:

```text
Candidate reaches final signing/approved stage → Onboarding
```

---

## 14. Integration Design Rules

### Scraping and market intelligence

Use the app as a control panel, not as the scraper itself.

Preferred real data architecture:

```text
City/market entered
→ Apify pulls structured local data
→ Firecrawl extracts useful website content
→ Gemini normalizes, summarizes, and scores
→ Supabase stores structured results
→ Lovable/app displays results
```

Use cases:

- Apify: structured scraping, Google Maps, schools, competitors, local enrichment businesses.
- Firecrawl: website crawling and page content extraction.
- Gemini: scoring, summarization, normalization, structured market intelligence.

### Email outreach

Preferred architecture:

```text
Teacher prospects selected
→ App adds them to outreach campaign
→ SmartLead or GHL sends sequence
→ SmartLead/GHL tracks replies and engagement
→ Webhook/API updates Supabase
→ App displays status
→ Interested leads promoted to Candidate Pipeline
```

Do not store API keys in code. Use secure environment variables only.

---

## 15. Interaction Rules

### Toasts

Use toasts for MVP placeholder behavior, but avoid making important features toast-only forever.

Good MVP toast examples:

```text
Sample replies synced. SmartLead sync will be connected later.
Sample data refreshed. Live source refresh will be connected later.
Sample enrichment queued for Sarah Mitchell.
```

### Placeholder behavior

If a live backend/API is not connected, buttons should either:

1. Open a sample modal/drawer, or
2. Show a clear safe MVP toast.

Do not silently do nothing.

### Promotion behavior

When a teacher is promoted:

- Keep the teacher visible in the current screen.
- Add a `Promoted` status badge.
- Disable duplicate promote actions.
- Add/view the person in Candidate Pipeline.

---

## 16. AI Prompting Rules for Future Screens

When asking an AI agent or Lovable to create/edit a screen, include:

```text
Use Neuron Garage DESIGN.md.
White-first dashboard style.
All cards/components should use white background with very light thin borders.
Use blue primary actions, not orange.
Keep spacing compact and table rows tight.
Match existing City Search and Teacher Prospects visual language.
Do not touch backend, auth, Supabase, env variables, secrets, RLS, or paid APIs unless explicitly requested.
Use safe MVP behavior for live API actions.
```

For Email Outreach specifically:

```text
Create Email Outreach as the bridge between Teacher Prospects and Candidate Pipeline.
It should be a campaign control center, not the actual email-sending engine.
Use sample/mock outreach data for MVP.
Do not call SmartLead, GHL, Resend, or paid APIs automatically.
```

---

## 17. Quality Checklist Before Approving a Screen

Before merging any UI screen, check:

- Does it follow the workflow order?
- Is the page background white or almost white?
- Are all major sections white cards with light borders?
- Are primary buttons blue?
- Are table rows compact?
- Are chips/badges small and readable?
- Are filters aligned and not wrapping badly on desktop?
- Does every visible button do something useful, open a modal, navigate, or show a safe toast?
- Are placeholder/live API actions clearly marked as MVP behavior?
- Does the screen avoid orange-heavy legacy styling?
- Does it look consistent with City Search and Teacher Prospects?

---

## 18. Current Approved Visual Direction Summary

```text
White background.
White cards.
Thin light borders.
Inter typography.
Deep navy headings.
Muted slate body text.
Blue primary buttons.
Compact KPI cards.
Compact table rows.
Small chips.
Right-side insight panels.
Safe MVP actions.
No heavy orange primary UI.
No generic AI gradients.
```

This file should be updated whenever a new screen is approved or the design language changes.
