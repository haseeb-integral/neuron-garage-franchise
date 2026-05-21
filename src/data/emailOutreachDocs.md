**SmartLead Integration — How It Works in Neuron Garage**

**A plain-English guide for the team**

**What Is SmartLead and Why Are We Using It?**

SmartLead is the email sending engine behind the Neuron Garage prospecting system. Think of it as the post office — it takes your list of teacher prospects, sends personalized emails on a schedule, tracks who opened them, who replied, and who bounced, and then reports all of that back to us in real time.

The Neuron Garage app is the front desk. Kaylie and Sam never need to log into SmartLead directly. Everything SmartLead knows — campaigns, replies, lead statuses, sending health — flows into the Neuron Garage app automatically. The connection runs 24/7 in the background.

**The Big Picture: How Data Flows**

There are two directions data moves between SmartLead and the Neuron Garage app:

**Pushing OUT to SmartLead (things we send to SmartLead):**

* New campaigns we create from inside the app

* Teacher prospect lists we import via CSV

* Campaign schedule and settings

* Email sequences (the actual email copy with follow-up timing)

* Replies we send back to interested teachers

**Pulling IN from SmartLead (things SmartLead sends back to us):**

* Campaign performance stats (opens, replies, bounces)

* Lead statuses (who has been emailed, who replied, who bounced)

* Email account health (inbox warmup scores, daily send limits)

* Real-time events via webhook (the moment a teacher replies, we know instantly)

**The 5 Core Features Powered by the SmartLead API**

**Feature 1: Campaigns**

A campaign is a named outreach sequence aimed at a specific audience — for example, "Austin TX Teachers — Spring 2026." Each campaign has:

* A list of teacher prospects

* A series of emails (Step 1 cold outreach, Step 2 follow-up 3 days later, Step 3 final follow-up on day 7\)

* A sending schedule (Mon–Fri, 9am–5pm Central, max 40 new prospects per day)

* 3 rotating sending mailboxes (Rani Chung, Elizabeth Gray, Isabella Aquino)

**What you can do from the Neuron Garage app:**

* See all campaigns and their current status at a glance

* Create a new campaign with a built-in 4-step wizard (no SmartLead login needed)

* Activate, pause, or stop any campaign with one click

* View how many prospects are in each campaign and where they are in the sequence

* See reply rate, open rate, and bounce rate per campaign in real time

**How the campaign status system works:**  
When you first create a campaign it starts as a DRAFT — nothing sends yet. You add your leads and email sequences, then activate it. Once active, SmartLead sends emails automatically on your schedule. You can pause at any time and resume without losing your place.

**Feature 2: Lead Import Pipeline**

This is how teacher prospects get from Apollo or Clay into SmartLead. The Neuron Garage app has a built-in 4-step Import Wizard so contractors never need to touch SmartLead directly.

**The 4 steps:**

**Step 1 — Batch Info**  
Name your batch (e.g., "Austin Retired Teachers — May 2026"), select the source (Apollo, Clay, LinkedIn Navigator, DonorsChoose, Manual CSV), pick the city, state, and segment (Teacher or Retired Teacher).

**Step 2 — Upload \+ Map**  
Drag and drop your CSV file. The app reads the columns and lets you map them to the right fields: email, first name, last name, school/company, city, state, segment, source. Only the email column is required. Preview the first 10 rows before proceeding.

**Step 3 — QA Review**  
Every lead is shown in a table with validation flags — missing email, bad email format, duplicate within the batch. You approve or reject each row individually, or use "Approve All" for clean batches. Live counts show how many are approved vs. rejected.

**Step 4 — Import to SmartLead**  
Select which campaign these leads go into. The app sends them to SmartLead in chunks of 400 with a small delay between chunks to respect SmartLead's rate limits. A live progress bar shows "Batch 2 of 5 · 800 of 2,000 leads." When done, the batch record is saved showing how many were imported successfully vs. skipped.

**SmartLead automatically checks every imported lead against:**

* Global block list (anyone who has previously unsubscribed across all accounts)

* Known bounce list (emails flagged as invalid across the SmartLead network)

* Duplicates already in the target campaign

**Feature 3: Live Inbox**

The Inbox is the most important screen for daily use. Every time a teacher replies to one of our outreach emails, their reply appears here in real time — no refresh needed, no logging into SmartLead.

**How it works technically:** SmartLead fires a webhook event the instant a reply is received. That event hits our Neuron Garage server, gets stored in our database, and appears on the Inbox screen within seconds.

**Each reply card shows:**

* Teacher's name and email

* Which campaign they're from

* When the reply arrived (e.g., "2 hours ago")

* The full reply text

* An intent badge automatically assigned by the system

**The 4 intent badges:**

* 🟢 **HOT** — reply contains positive signals: "yes," "interested," "tell me more," "sounds good," "let's connect," "schedule a call"

* ⚪ **NOT INTERESTED** — reply contains: "not interested," "remove me," "wrong person," "no thanks"

* 🔵 **OUT OF OFFICE** — auto-reply detected: "out of office," "on vacation," "back on"

* 🟡 **NEUTRAL** — reply received but intent is unclear

**The unread badge:** A red number on the Inbox header shows how many new replies have arrived since you last checked. Click "Mark all read" to clear it.

**Replying directly from the app:** Click the Reply button on any HOT or NEUTRAL card to send a response directly back to the teacher. The reply is threaded — it arrives in the teacher's inbox as a continuation of the original conversation, not a new email.

**Feature 4: Analytics**

The Analytics tab gives a full performance picture across all campaigns without needing to check each one individually.

**Global KPI tiles (top row):**

* Total Emails Sent

* Open Rate (% of sent emails that were opened)

* Reply Rate (% of sent emails that got a reply)

* Interested Count (leads tagged HOT)

* Bounce Rate (% of emails that failed to deliver)

**Charts:**

* Line chart showing sends, opens, and replies over time per campaign

* Bar chart showing the reply funnel: Sent → Opened → Replied → Interested

* Per-campaign performance table with all metrics side by side

**Important note on date ranges:** SmartLead's API returns analytics in maximum 30-day windows. For longer history, the app automatically pulls in 30-day chunks and stitches them together. Analytics data is cached for 10 minutes to avoid hitting rate limits.

**Feature 5: Email Account Health**

The three sending mailboxes (Rani Chung, Elizabeth Gray, Isabella Aquino at [mailerss.co](http://mailerss.co)) are what actually deliver the emails. This screen shows their health at a glance.

**Each mailbox card shows:**

* Email address and provider (Gmail/Outlook/SMTP)

* Warmup status: Active or Inactive

* Daily send progress: "0 / 15 sent today"

* Warmup reputation score (currently 100% on all three — excellent)

* Health color: 🟢 Green (healthy), 🟡 Yellow (warmup off or approaching limit), 🔴 Red (at limit or error)

**Warmup explained:** New email accounts can't send 100 emails on day one — that triggers spam filters. SmartLead gradually increases the sending volume over 2–3 weeks while also exchanging warmup emails with other SmartLead accounts to build sender reputation. The warmup reputation score on each mailbox reflects how trusted that inbox is. All three mailboxes are currently warming up — do not send real campaigns until warmup has run for at least 2–3 weeks.

**The Connection Health Panel**

At the top of the Email Outreach page is a SmartLead Connection panel that shows the system's health at a glance:

* **API Status:** Green pill reading "Connected · \[X\] campaigns" — confirms the live link to SmartLead is working

* **Sending Mailbox:** Shows the primary active sending account

* **Recent Webhook Events:** Shows when SmartLead last fired an event to our app

* **Last Successful API Call:** Timestamp of the most recent successful SmartLead request

* **Webhook Active in Last 24h:** Yes/No indicator showing whether the two-way connection is live

If the API Status pill goes gray or red, the connection needs to be re-tested. Click the "Test Connection" button to diagnose.

**What SmartLead Does Automatically (No Action Needed)**

Once a campaign is active and leads are imported, SmartLead handles all of this without any manual intervention:

* Sends emails on the configured schedule (respecting timezone and send hours)

* Rotates between the 3 sending mailboxes automatically for deliverability

* Stops emailing a prospect the moment they reply (default setting)

* Adds anyone who clicks "unsubscribe" to a permanent global block list

* Retries soft-bounced emails automatically

* Continues warming up all mailboxes in the background daily

**What Requires a Human Action**

| Action | Who Does It | Where |
| :---- | :---- | :---- |
| Upload new prospect CSV | Haseeb / Contractor | Import Wizard in Neuron Garage app |
| QA review of imported leads | Haseeb | Import Wizard Step 3 |
| Activate a new campaign | Haseeb | Campaigns panel — one click |
| Reply to a HOT lead | Kaylie / Sam | Inbox — Reply button |
| Promote interested teacher to Pipeline | Kaylie / Sam | Inbox — Promote button |
| Add new email accounts | Haseeb | Email Accounts tab — Add SMTP |
| Write new email sequence copy | Kaylie / Integral Outbound | Campaign wizard Step 4 |

**Technical Notes for Developers**

**API Base URL:** https://server.smartlead.ai/api/v1

**Authentication:** API key passed as query parameter ?api\_key= — stored in Supabase secrets as SMARTLEAD\_API\_KEY

**Proxy Architecture:** All SmartLead calls go through the smartlead-proxy Edge Function. The API key never touches the browser.

**Webhook Receiver:** smartlead-webhook Edge Function receives real-time events from SmartLead. Events are stored in the smartlead\_events table with intent classification applied on insert.

**Rate Limit:** 10 requests per 2 seconds. The proxy implements exponential backoff on 429 responses. Lead imports are chunked at 400 leads per request with 500ms gaps.

**Key Supabase Tables:**

* smartlead\_events — all incoming webhook events (replies, bounces, unsubscribes, category updates)

* prospect\_batches — history of every CSV import batch

* prospects\_staging — individual leads pending QA or retry

* campaign\_cache — local mirror of SmartLead campaign data for fast reads

**Key Endpoints Used:**

| Action | Endpoint |
| :---- | :---- |
| List campaigns | GET /campaigns/ |
| Create campaign | POST /campaigns/create |
| Activate campaign | PATCH /campaigns/{id}/status → {"status":"START"} |
| Set schedule | POST /campaigns/{id}/schedule |
| Add sequences | POST /campaigns/{id}/sequences |
| Import leads | POST /campaigns/{id}/leads (max 400/req) |
| Get campaign leads | GET /campaigns/{id}/leads |
| Reply to lead | POST /campaigns/{id}/reply-email-thread |
| Global analytics | GET /analytics/overview |
| List email accounts | GET /email-accounts/ |
| Toggle warmup | POST /email-accounts/{id}/warmup |
| Create webhook | POST /webhooks |

**Critical API Gotcha:** Campaign status activation uses "START" not "ACTIVE". Track settings use negative flags: DONT\_TRACK\_EMAIL\_OPEN, DONT\_TRACK\_LINK\_CLICK — not positive flags.

*This document covers the SmartLead integration as built in Phases 1–5 (completed May 18, 2026).*  
*Neuron Garage Prospecting App — Built by Integral Outbound*