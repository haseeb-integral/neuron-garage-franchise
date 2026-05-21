**SmartLead API — Technical Specification**

**Neuron Garage Prospecting App · Lovable \+ Supabase Integration**

**Document Type:** Engineering Reference  
**Audience:** Developers, contractors, technical leads  
**Last Updated:** May 20, 2026  
**Status:** Production (Phases 1–5 complete)

**1\. System Architecture Overview**

**1.1 Stack**

| Layer | Technology | Role |
| :---- | :---- | :---- |
| Frontend | React \+ TypeScript \+ Vite \+ Tailwind (Lovable) | Client-facing UI |
| Backend | Supabase (Lovable Cloud) | Database, auth, realtime, secrets |
| Serverless | Supabase Edge Functions (Deno runtime) | API proxy, webhook ingestion |
| Email Engine | SmartLead (server.smartlead.ai) | Campaign execution, lead management |
| Realtime | Supabase Realtime (Postgres pub/sub) | Live inbox push to UI |

**1.2 Security Model**

The SmartLead API key is **never exposed to the browser**. All requests from the Lovable frontend go to the smartlead-proxy Edge Function, which appends the API key server-side before forwarding to SmartLead.

Browser (React UI)  
    │  
    │  fetch('/functions/v1/smartlead-proxy?path=campaigns/')  
    ▼  
smartlead-proxy (Deno Edge Function)  
    │  Reads SMARTLEAD\_API\_KEY from Deno.env  
    │  Appends ?api\_key=... to outbound request  
    ▼  
https://server.smartlead.ai/api/v1/{path}  
    │  
    ▼  
JSON response → Edge Function → Browser

**Two-way connection:**

SmartLead (event fired: reply, bounce, open)  
    │  
    │  POST to webhook URL (registered via API)  
    ▼  
smartlead-webhook (Deno Edge Function)  
    │  Validates payload  
    │  Classifies intent (HOT / NOT\_INTERESTED / OOO / NEUTRAL)  
    │  Inserts into smartlead\_events table  
    ▼  
Supabase Realtime (table publication)  
    │  
    ▼  
Browser (React Inbox panel, live update, no refresh)

**2\. Authentication**

**2.1 API Key**

* **Type:** Query parameter

* **Header:** None (SmartLead does not use Bearer tokens)

* **Format:** ?api\_key=YOUR\_API\_KEY

* **Storage:** Supabase secret → SMARTLEAD\_API\_KEY

* **Access in Deno:** Deno.env.get('SMARTLEAD\_API\_KEY')

// smartlead-proxy/index.ts (simplified)  
const SMARTLEAD\_KEY \= Deno.env.get('SMARTLEAD\_API\_KEY')  
const BASE \= 'https://server.smartlead.ai/api/v1'

const path \= url.searchParams.get('path')  
const method \= req.method  
const body \= method \!== 'GET' ? await req.json() : undefined

const upstream \= await fetch(\`${BASE}/${path}?api\_key=${SMARTLEAD\_KEY}\`, {  
  method,  
  headers: { 'Content-Type': 'application/json' },  
  body: body ? JSON.stringify(body) : undefined,  
})

return new Response(await upstream.text(), {  
  status: upstream.status,  
  headers: { 'Content-Type': 'application/json' },  
})

**2.2 Client-Level API Keys (Agency Feature)**

SmartLead supports client-level API keys separate from the master account key. Each client key has its own rate limit (default 60 req/min) and can be scoped to a single white-label client workspace.

* **Create:** POST /api/v1/client/api-key

* **List:** GET /api/v1/client/api-key

* **Reset:** PUT /api/v1/client/api-key/reset/:id

* **Delete:** DELETE /api/v1/client/api-key/:id

**For Neuron Garage:** The current integration uses a single account-level API key. Migrating to a client-level key is recommended before adding a second client workspace to avoid key collision.

**3\. Rate Limits**

| Scope | Limit | Notes |
| :---- | :---- | :---- |
| Account-level key | 10 requests / 2 seconds | Default for all V1 endpoints |
| Client-level key | 60 requests / minute | Configurable per client key |
| Lead import batch | 400 leads / request | Hard limit on /campaigns/{id}/leads |
| Analytics window | 30 days max per call | Must paginate for longer history |
| Get campaign leads | 100 leads / page | Use offset param to paginate |

**3.1 Rate Limit Handling in the Proxy**

// Exponential backoff on 429  
async function fetchWithBackoff(url: string, options: RequestInit, retries \= 3\) {  
  for (let i \= 0; i \< retries; i++) {  
    const res \= await fetch(url, options)  
    if (res.status \!== 429\) return res  
    const delay \= Math.pow(2, i) \* 500 // 500ms, 1s, 2s  
    await new Promise(r \=\> setTimeout(r, delay))  
  }  
  throw new Error('Rate limit exceeded after retries')  
}

**3.2 Lead Import Chunking**

// Import leads in chunks of 400 with 500ms gap  
const CHUNK\_SIZE \= 400  
const DELAY\_MS \= 500

for (let i \= 0; i \< leads.length; i \+= CHUNK\_SIZE) {  
  const chunk \= leads.slice(i, i \+ CHUNK\_SIZE)  
  await pushChunkToSmartlead(campaignId, chunk)  
  await new Promise(r \=\> setTimeout(r, DELAY\_MS))  
}

**4\. Endpoint Reference — Currently Implemented**

**4.1 Campaigns**

| Method | Endpoint | Description | Used In |
| :---- | :---- | :---- | :---- |
| GET | /campaigns/ | List all campaigns | Campaigns panel |
| POST | /campaigns/create | Create new campaign | New Campaign Drawer |
| PATCH | /campaigns/{id}/status | Activate / pause / stop | Campaign status controls |
| POST | /campaigns/{id}/schedule | Set send window, timezone, days | Campaign wizard Step 2 |
| POST | /campaigns/{id}/settings | Track opens/clicks, stop on reply | Campaign wizard Step 3 |
| POST | /campaigns/{id}/sequences | Add email steps with delays | Campaign wizard Step 4 |
| GET | /campaigns/{id}/analytics | Per-campaign performance data | Analytics panel (fallback) |
| POST | /campaigns/{id}/reply-email-thread | Send reply to a lead | Inbox reply button |
| GET | /campaigns/{id}/webhooks | List registered webhooks | Connection health check |
| POST | /webhooks | Register global webhook | Register in SmartLead button |

**Critical gotcha — campaign status values:**

ACTIVATE campaign → status: "START"    ← NOT "ACTIVE"  
PAUSE campaign    → status: "PAUSE"  
STOP campaign     → status: "STOP"

**Critical gotcha — track settings use negative flags:**

{  
  "track\_settings": \[  
    "DONT\_TRACK\_EMAIL\_OPEN",  
    "DONT\_TRACK\_LINK\_CLICK"  
  \]  
}

Positive flag names like TRACK\_OPENS are rejected by the API with a 422\.

**4.2 Leads**

| Method | Endpoint | Description | Used In |
| :---- | :---- | :---- | :---- |
| POST | /campaigns/{id}/leads | Bulk import leads (max 400/req) | Import Wizard Step 4 |
| GET | /campaigns/{id}/leads | Get leads for a campaign (paginated, max 100/page) | Campaign lead view |
| POST | /campaigns/{id}/leads/pause | Pause a specific lead | Lead management |
| POST | /campaigns/{id}/leads/resume | Resume a paused lead | Lead management |
| DELETE | /campaigns/{id}/leads | Remove lead from campaign | Lead management |

**Lead import payload:**

{  
  "lead\_list": \[  
    {  
      "email": "teacher@austinisd.org",  
      "first\_name": "Sarah",  
      "last\_name": "Johnson",  
      "company\_name": "Austin ISD",  
      "location": "Austin, TX",  
      "custom\_fields": {  
        "segment": "Teacher",  
        "source": "Apollo",  
        "city": "Austin",  
        "state": "TX"  
      }  
    }  
  \],  
  "settings": {  
    "ignore\_global\_block\_list": false,  
    "ignore\_unsubscribe\_list": false,  
    "ignore\_community\_bounce\_list": false  
  }  
}

**4.3 Analytics**

| Method | Endpoint | Description | Notes |
| :---- | :---- | :---- | :---- |
| GET | /analytics/overview | Aggregate stats across all campaigns | **Use this first** |
| GET | /campaigns/{id}/analytics | Per-campaign stats | Use as fallback if overview returns empty |

**Analytics overview response shape:**

{  
  "total\_sent": 4820,  
  "total\_opened": 1205,  
  "total\_clicked": 89,  
  "total\_replied": 312,  
  "total\_bounced": 47,  
  "total\_unsubscribed": 23,  
  "open\_rate": 24.9,  
  "reply\_rate": 6.4,  
  "bounce\_rate": 0.97  
}

**Per-campaign analytics — max 30-day window:**

GET /campaigns/{id}/analytics?startDate=2026-04-20\&endDate=2026-05-20

For ranges \> 30 days, the app fetches in chunks and concatenates:

const ranges \= splitInto30DayWindows(startDate, endDate)  
const results \= await Promise.all(ranges.map(r \=\> fetchAnalytics(id, r)))  
const merged \= mergeAnalyticsResults(results)

**4.4 Email Accounts**

| Method | Endpoint | Description | Used In |
| :---- | :---- | :---- | :---- |
| GET | /email-accounts/ | List all connected sending accounts | Email Accounts tab |
| POST | /email-accounts/save | Add new SMTP account | Add SMTP modal |
| POST | /email-accounts/{id}/warmup | Toggle warmup on/off | Warmup toggle |
| GET | /email-accounts/{id} | Get single account details | Account health card |

**Email account response fields relevant to UI:**

{  
  "id": 1,  
  "from\_name": "Rani Chung",  
  "from\_email": "rani@mailerss.co",  
  "smtp\_host": "smtp.mailerss.co",  
  "daily\_limit": 15,  
  "warmup\_enabled": true,  
  "warmup\_reputation": 100,  
  "sent\_today": 0,  
  "is\_mailbox\_error": false,  
  "expiry\_date": "2027-05-18"  
}

**5\. Webhook System**

**5.1 Registration**

The webhook is registered once via the API and persists in SmartLead until explicitly deleted. The smartlead-webhook Edge Function URL is registered as the global receiver.

POST /api/v1/webhooks

{  
  "name": "Neuron Garage App Webhook",  
  "webhook\_url": "https://hqvmltmboakixpwapzfe.supabase.co/functions/v1/smartlead-webhook",  
  "event\_type\_map": {  
    "EMAIL\_SENT": false,  
    "EMAIL\_OPENED": true,  
    "EMAIL\_CLICKED": true,  
    "EMAIL\_REPLIED": true,  
    "EMAIL\_BOUNCED": true,  
    "EMAIL\_UNSUBSCRIBED": true  
  }  
}

**Note:** EMAIL\_SENT is disabled to avoid volume noise. Enable it if per-send tracking is needed.

**5.2 All Available Webhook Events**

| Event | Trigger | Payload Key Fields |
| :---- | :---- | :---- |
| EMAIL\_SENT | Email delivered to lead | campaign\_id, lead\_id, sequence\_number |
| EMAIL\_OPENED | Tracking pixel loaded | campaign\_id, lead\_id, opened\_count, first\_opened\_at |
| EMAIL\_CLICKED | Tracked link clicked | campaign\_id, lead\_id, link.url, link.clicked\_at |
| EMAIL\_REPLIED | Lead replies | campaign\_id, lead\_id, reply.body, reply.subject |
| EMAIL\_BOUNCED | Delivery fails | campaign\_id, lead\_id, bounce\_type (hard/soft), bounce\_reason |
| EMAIL\_UNSUBSCRIBED | Unsubscribe link clicked | campaign\_id, lead\_id, lead.email |

**5.3 Webhook Handler (smartlead-webhook Edge Function)**

// smartlead-webhook/index.ts (simplified)  
import { createClient } from '@supabase/supabase-js'

const supabase \= createClient(  
  Deno.env.get('SUPABASE\_URL')\!,  
  Deno.env.get('SUPABASE\_SERVICE\_ROLE\_KEY')\!  
)

Deno.serve(async (req) \=\> {  
  const payload \= await req.json()  
  const { event, lead, reply, campaign\_id, lead\_id, bounce\_type } \= payload

  // Classify intent for reply events  
  let reply\_intent \= null  
  if (event \=== 'EMAIL\_REPLIED' && reply?.body) {  
    reply\_intent \= classifyIntent(reply.body)  
  }

  // Insert into smartlead\_events (Realtime publication triggers UI update)  
  await supabase.from('smartlead\_events').insert({  
    event\_type: event,  
    campaign\_id,  
    lead\_id,  
    lead\_email: lead?.email,  
    lead\_first\_name: lead?.first\_name,  
    reply\_body: reply?.body ?? null,  
    reply\_subject: reply?.subject ?? null,  
    bounce\_type: bounce\_type ?? null,  
    reply\_intent,  
    raw\_payload: payload,  
    received\_at: new Date().toISOString(),  
  })

  return new Response(JSON.stringify({ status: 'received' }), { status: 200 })  
})

function classifyIntent(body: string): string {  
  const lower \= body.toLowerCase()  
  // OOO checked first — auto-replies often contain positive words  
  if (/out of office|on vacation|away from|back on|returning on/.test(lower)) return 'OOO'  
  if (/interested|sounds good|tell me more|yes|let's connect|schedule|call|available/.test(lower)) return 'HOT'  
  if (/not interested|remove me|unsubscribe|wrong person|no thanks|stop emailing/.test(lower)) return 'NOT\_INTERESTED'  
  return 'NEUTRAL'  
}

**5.4 Supabase Realtime Setup**

The smartlead\_events table has Realtime publication enabled. The Inbox panel subscribes on mount:

// SmartLeadInboxPanel.tsx (simplified)  
useEffect(() \=\> {  
  const channel \= supabase  
    .channel('smartlead\_events\_inbox')  
    .on(  
      'postgres\_changes',  
      { event: 'INSERT', schema: 'public', table: 'smartlead\_events' },  
      (payload) \=\> {  
        setEvents(prev \=\> \[payload.new, ...prev\])  
        setUnreadCount(c \=\> c \+ 1\)  
      }  
    )  
    .subscribe()

  return () \=\> supabase.removeChannel(channel)  
}, \[\])

**6\. Database Schema**

**6.1 Core SmartLead Tables**

**smartlead\_events**

CREATE TABLE smartlead\_events (  
  id              uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  event\_type      text NOT NULL,           \-- EMAIL\_REPLIED, EMAIL\_BOUNCED, etc.  
  campaign\_id     integer,  
  lead\_id         integer,  
  lead\_email      text,  
  lead\_first\_name text,  
  reply\_body      text,  
  reply\_subject   text,  
  bounce\_type     text,                    \-- hard | soft  
  reply\_intent    text,                    \-- HOT | NOT\_INTERESTED | OOO | NEUTRAL  
  raw\_payload     jsonb,  
  received\_at     timestamptz DEFAULT now(),  
  read\_at         timestamptz              \-- null \= unread  
);  
\-- Realtime publication: ENABLED  
\-- Index: campaign\_id, lead\_id, event\_type, received\_at

**prospect\_batches**

CREATE TABLE prospect\_batches (  
  id           uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  name         text NOT NULL,              \-- e.g. "Austin TX Teachers — May 2026"  
  source       text,                       \-- Apollo | Clay | LinkedIn Navigator | etc.  
  segment      text,                       \-- Teacher | Retired Teacher  
  city         text,  
  state        text,  
  campaign\_id  integer,                    \-- SmartLead campaign ID  
  total        integer DEFAULT 0,  
  approved     integer DEFAULT 0,  
  rejected     integer DEFAULT 0,  
  imported     integer DEFAULT 0,  
  failed       integer DEFAULT 0,  
  status       text DEFAULT 'pending',     \-- pending | importing | complete | failed  
  created\_by   uuid REFERENCES profiles(id),  
  created\_at   timestamptz DEFAULT now(),  
  updated\_at   timestamptz DEFAULT now()  
);

**prospects\_staging**

CREATE TABLE prospects\_staging (  
  id              uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  batch\_id        uuid REFERENCES prospect\_batches(id),  
  email           text NOT NULL,  
  first\_name      text,  
  last\_name       text,  
  company\_name    text,  
  city            text,  
  state           text,  
  segment         text,  
  source          text,  
  qa\_status       text DEFAULT 'pending',  \-- pending | approved | rejected  
  rejection\_reason text,  
  smartlead\_lead\_id integer,               \-- populated after successful import  
  pushed\_at       timestamptz,  
  error\_message   text,  
  created\_at      timestamptz DEFAULT now()  
);  
\-- Index: batch\_id, qa\_status, email

**campaign\_cache**

CREATE TABLE campaign\_cache (  
  id           integer PRIMARY KEY,        \-- SmartLead campaign ID  
  name         text,  
  status       text,                       \-- DRAFT | ACTIVE | PAUSED | STOPPED  
  total\_leads  integer,  
  raw\_data     jsonb,                      \-- full SmartLead response  
  last\_synced  timestamptz DEFAULT now()  
);  
\-- TTL: stale after 10 minutes, refreshed on next fetch

**7\. What Can Be Built Next — Full API Surface Map**

The following SmartLead API capabilities are **not yet implemented** in the Neuron Garage app but are fully available. These represent the next layer of the product.

**7.1 SmartProspect (Lead Sourcing Directly from SmartLead)**

SmartLead has a built-in prospect search API that returns leads by industry, job title, location, and keywords without needing Apollo or Clay. This would allow the app to source teachers directly.

| Endpoint | Description |
| :---- | :---- |
| GET /smart-prospect/search | Search prospect database by filters |
| GET /smart-prospect/industries | List available industry categories |
| GET /smart-prospect/keywords | Keyword-based prospect search |

**Build opportunity:** A native "Find Teachers" search panel inside Neuron Garage that sources prospects directly from SmartLead's database — no Apollo subscription needed for initial sourcing.

**7.2 A/B Testing on Email Sequences**

SmartLead supports sequence-level A/B variants. Each sequence step can have variant A and variant B, and SmartLead randomly distributes and tracks which performs better.

POST /campaigns/{id}/sequences  
{  
  "sequences": \[  
    {  
      "seq\_number": 1,  
      "seq\_delay\_details": { "delay\_in\_days": 0 },  
      "variant\_a": {  
        "subject": "Quick question for you",  
        "email\_body": "Hi {{first\_name}}, ..."  
      },  
      "variant\_b": {  
        "subject": "Fellow educator question",  
        "email\_body": "Hi {{first\_name}}, ..."  
      }  
    }  
  \]  
}

**Build opportunity:** Add A/B toggle in the Campaign Wizard Step 4 sequence editor. Show variant performance side-by-side in the Analytics tab.

**7.3 Lead Category Management (CRM-Level Tagging)**

SmartLead supports assigning custom categories to leads beyond the auto-detected intent. Categories can be created, listed, and applied to individual leads.

| Endpoint | Description |
| :---- | :---- |
| GET /campaigns/{id}/categories | List all categories for a campaign |
| POST /campaigns/{id}/categories | Create a new category |
| POST /campaigns/{id}/leads/{lead\_id}/category | Assign category to a lead |

**Build opportunity:** Let Kaylie/Sam create custom tags like "Called," "Meeting Booked," "Needs Follow-Up" and apply them to reply leads from inside the Inbox. Categories persist in SmartLead and enable filtered lead views.

**7.4 Global Block List Management**

SmartLead maintains a master unsubscribe/block list across all campaigns. Leads on this list are automatically skipped on import.

| Endpoint | Description |
| :---- | :---- |
| GET /block-list | View all blocked emails |
| POST /block-list | Add emails to block list manually |
| DELETE /block-list/{id} | Remove email from block list |

**Build opportunity:** A Suppression List screen inside the app showing all blocked/unsubscribed emails, with the ability to manually add domains or emails before a campaign launches (e.g., block all @austinisd.org if a district asks to be removed).

**7.5 Email Thread History per Lead**

The full email thread between the app and a specific lead (all sent emails, opens, replies) is retrievable.

GET /campaigns/{id}/leads/{lead\_id}/email-thread

**Build opportunity:** A Lead Timeline view in the Inbox or Candidate Pipeline that shows the complete conversation history with each teacher — every email sent, every open, every reply — in a threaded view before deciding to Promote to Pipeline.

**7.6 Campaign Folders**

SmartLead supports organizing campaigns into folders for better management at scale.

| Endpoint | Description |
| :---- | :---- |
| GET /campaigns/folders | List all folders |
| POST /campaigns/folders | Create a folder |
| PATCH /campaigns/{id}/folder | Move campaign to folder |

**Build opportunity:** As Neuron Garage scales to multiple cities, folders let you organize campaigns by geography (Austin, Dallas, Houston) and display them as grouped sections in the Campaigns panel.

**7.7 Sending Account Rotation Controls**

Beyond the warmup toggle, SmartLead allows per-campaign control over which sending accounts are used and at what ratios.

POST /campaigns/{id}/email-accounts  
{  
  "email\_account\_ids": \[1, 2, 3\],  
  "sending\_priority": "EQUAL"  // EQUAL | CUSTOM  
}

**Build opportunity:** When creating a campaign, let the user pick which of the 3 mailboxes to use and whether to distribute equally or prioritize one over the others.

**7.8 AI-Powered Reply Classification Upgrade**

The current intent classification is keyword-based. SmartLead has a native AI categorization feature that classifies replies into more nuanced categories using their own ML model. This runs automatically without any API call — the categorization arrives in the LEAD\_CATEGORY\_UPDATED webhook event payload.

**Build opportunity:** Subscribe to LEAD\_CATEGORY\_UPDATED webhook events and replace the keyword classifier with SmartLead's native AI tags for higher accuracy — especially useful for ambiguous replies.

**8\. Environment Variables Reference**

| Secret Name | Value Source | Used In |
| :---- | :---- | :---- |
| SMARTLEAD\_API\_KEY | SmartLead → Settings → API | smartlead-proxy |
| SUPABASE\_URL | Supabase project settings | smartlead-webhook |
| SUPABASE\_SERVICE\_ROLE\_KEY | Supabase project settings | smartlead-webhook |
| SUPABASE\_ANON\_KEY | Supabase project settings | Frontend client |

**9\. Error Reference**

| HTTP Status | Meaning | Action |
| :---- | :---- | :---- |
| 200 | Success | Process response |
| 400 | Bad request — malformed payload | Check request body shape |
| 401 | Invalid API key | Verify SMARTLEAD\_API\_KEY in secrets |
| 404 | Campaign or lead not found | Check ID; campaign may have been deleted in SmartLead |
| 422 | Unprocessable — invalid field values | Check track\_settings flags; check status values |
| 429 | Rate limit exceeded | Exponential backoff (implemented in proxy) |
| 500 | SmartLead server error | Retry after delay; log for monitoring |

**10\. Testing Checklist for New Endpoints**

Before merging any new SmartLead API feature:

* \[ \] Test against live SmartLead account (not mocked) — account has 0 campaigns initially

* \[ \] Confirm API key is read from Deno.env, not hardcoded

* \[ \] Confirm response is forwarded through proxy, not called direct from browser

* \[ \] Handle empty array \[\] response gracefully — do not error on empty campaign list

* \[ \] Handle 429 with backoff — do not surface raw rate limit error to UI

* \[ \] Verify UI shows clean empty state when SmartLead returns no data

* \[ \] For any write operation: verify the change appears in actual SmartLead dashboard within 5 seconds

* \[ \] For webhook additions: register in SmartLead, trigger event manually, confirm row in smartlead\_events

*Neuron Garage Prospecting App — Built by Integral Outbound*  
*SmartLead API V1 — Base URL: https://server.smartlead.ai/api/v1*  
*API Reference: https://api.smartlead.ai*