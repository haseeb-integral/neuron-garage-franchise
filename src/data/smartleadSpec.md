# SmartLead API — Technical Specification

**Neuron Garage Prospecting App · Engineering reference**

**Reviewed:** November 19, 2026

**Scope:** Installed integration, current provider documentation, and checks still needed.

## 1. Review basis and evidence

The source is [SmartLead's official introduction](https://api.smartlead.ai/introduction) and its linked full API reference. The saved app documents already included September and October updates; they were not unchanged June copies. A difference from those documents does **not** establish a June-to-November release date. For the capabilities below, the introduction date is unknown unless a dated release source is supplied.

Use three labels throughout this reference:

- **Installed:** confirmed in the current app source. This is not a claim that every live flow has passed.
- **Provider-documented:** present in the official reference; it may not be installed here.
- **Needs live verification:** a write, response mapping, callback, or account-specific behavior still needs a controlled check.

### Comparison with the older spec

| Older claim | Current finding |
| --- | --- |
| Fixed 10 requests per 2 seconds for every V1 endpoint | Provider limits depend on plan, with additional endpoint limits. App pacing is not a shared quota guarantee. |
| PATCH status with PAUSE / STOP | App uses POST with START / PAUSED / STOPPED. Provider notes and examples conflict; detailed fields support these app values. |
| Global POST /webhooks registration | App registers per campaign. Provider also documents a separate singular /webhook/create association-based API. |
| A/B payload uses variant_a / variant_b | Current sequence reference describes seq_variants. Current app campaign drawer submits a single body per step. |
| Sequence text read supplies A/B performance | Provider documents a separate sequence-analytics endpoint. It is not used by the current aggregate helper. |
| All analytics have a 30-day limit and app stitches ranges | The limit is explicitly documented for analytics-by-date. Installed aggregate code does not split date ranges. |
| Global analytics uses analytics/overview | Installed code attempts that path; current detailed reference specifies analytics/overall-stats-v2. Compatibility needs checking. |
| Four reply buckets and keyword-only classification | Installed handler uses seven buckets, rule checks, and an AI fallback. |
| prospect_batches holds import history | Current direct import wizard writes teacher_import_batches and prospects_staging. |
| SmartProspect uses /smart-prospect/search | Current contact search uses a separate prospect-api address and POST /search-email-leads/search-contacts. |
| Exactly three mailboxes, all currently warming | Account count and warmup state are live data, not fixed rules. |

## 2. Architecture and secret handling

**Installed:** React calls `supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload, query } })`. The browser does not call SmartLead directly and does not receive the private key.

```text
Staff page
  -> authenticated POST to smartlead-proxy
  -> server reads SMARTLEAD_API_KEY
  -> server calls https://server.smartlead.ai/api/v1/{endpoint}
  -> provider response returns through the app function

SmartLead callback
  -> smartlead-webhook
  -> smartlead_events and suppression handling
  -> staff inbox / reply views
```

The proxy validates a signed-in user's claims. It does not perform a staff-role lookup itself. Staff-only pages are not a substitute for server-side role enforcement; do not describe the proxy as staff-verified. Mailbox and unsubscribe sync functions explicitly check staff access. Lead push validates sign-in and uses caller-context reads; it does not explicitly call `is_staff`. This review changes no access rules.

Server jobs such as lead push and mailbox/unsubscribe sync also call SmartLead from server-side code. Thus **browser traffic uses the proxy**, but not every server-to-provider call goes through that function.

**Provider authentication:** `api_key` query parameter on the outbound V1 request. SmartLead provider auth is separate from the app's sign-in token. Base address and authentication still match the official reference.

Store `SMARTLEAD_API_KEY` through the secure secret panel. Replacing an existing value uses the secure replacement form. Never put it in a document, browser code, committed environment file, or logs. Lovable Cloud supplies its managed database connection credentials; users do not fetch service credentials from a separate dashboard.

### Proxy request and response contract

```json
{
  "endpoint": "campaigns",
  "method": "GET",
  "query": {}
}
```

`payload` is the optional provider JSON body; `query` holds extra provider query parameters. Leading slashes are stripped. Successful provider objects/arrays are returned as JSON. For a provider failure the proxy normally returns **app HTTP 200**, with `{ "ok": false, "status": 401, "endpoint": "campaigns", "method": "GET", "error": { "message": "Invalid API Key" } }` as an example failure shape. App authentication/configuration failures can return non-200 directly.

A caller must inspect the JSON error as well as the app HTTP status. Some older helpers only check the function client's `error`; this is a remaining review item, not a repair made in this documentation update.

## 3. Request limits and retries

[Introduction](https://api.smartlead.ai/introduction) says limits vary by subscription. The [detailed guide](https://api.smartlead.ai/guides/rate-limits) currently lists:

| Plan | Per minute | Per hour | Burst |
| --- | --- | --- | --- |
| Standard | 60 | 1,000 | 10/second |
| Pro | 120 | 3,000 | 20/second |
| Enterprise | Custom | Custom | Custom |

These are **provider-documented**, not a verified description of this account's plan. All calls on the same key share the plan budget.

Additional limits documented now:

- `GET /campaigns/{id}/leads-statistics`: 10 requests per 60 seconds per account, across campaigns.
- `GET /campaigns/all-leads-activities`: 10 per 60 seconds per account.
- `GET /analytics/mailbox/domain-wise-health-metrics`: 10 per 60 seconds per account.
- `GET /campaigns/{id}/leads`: at most 10 concurrent requests per account; client keys have a per-key scope. Excess calls queue; after 30 seconds a queued call can receive 429.

Dedicated endpoint limits stack with plan limits. Their 429 body can be plain text and may lack rate-limit headers. The guide recommends a wait of up to 60 seconds when no retry delay is given. Else honor `Retry-After` and available quota headers.

**Installed pacing:** proxy makes up to three attempts on 429, waiting 1, 2, and 4 seconds. Mailbox sync waits 250 ms before reads and retries 429. Unsubscribe sync waits 250 ms between pages/campaigns and retries 429. Direct import sends up to 400 leads with a 500 ms gap. Master Pool push uses 100-lead chunks and does not implement the proxy's retry loop. These separate waits do not enforce a shared per-minute/per-hour budget. Coordinated pacing and endpoint-specific retry handling require a separate approved code phase.

## 4. Installed endpoint map

Paths below are relative to the V1 base. Installation means a call exists in source, not that a controlled live write was performed during this review.

| Method | Path | App use |
| --- | --- | --- |
| GET | /campaigns | List campaigns |
| POST | /campaigns/create | New campaign |
| POST | /campaigns/{id}/status | Launch, pause, stop |
| POST | /campaigns/{id}/schedule | Days, times, time zone, gap, daily cap |
| POST | /campaigns/{id}/settings | Tracking / stop conditions |
| GET / POST | /campaigns/{id}/sequences | Read email text for checks / save steps |
| GET / POST | /campaigns/{id}/email-accounts | Read / assign senders |
| POST | /campaigns/{id}/leads | Direct imports, Test Mode, Master Pool pushes |
| GET | /campaigns/{id}/leads | Lead reads and unsubscribe sync |
| GET | /campaigns/{id}/analytics | Aggregate helper fallback |
| GET | /analytics/overview | Aggregate helper's initial attempt; differs from current detailed reference |
| POST | /campaigns/{id}/reply-email-thread | Staff reply tools |
| GET / POST | /campaigns/{id}/webhooks | Read / register campaign callbacks |
| DELETE | /campaigns/{id}/webhooks/{webhookId} | Remove campaign callback |
| GET | /email-accounts | Sending account list and sync |
| POST | /email-accounts/save | Add SMTP sender |
| POST | /email-accounts/{id}/warmup | Warmup on/off |

### Campaign status and settings

**Installed:** `POST /campaigns/{id}/status` with `START`, `PAUSED`, or `STOPPED`. Launch uses `START`, never `ACTIVE`.

**Provider conflict:** [status reference](https://api.smartlead.ai/api-reference/campaigns/update-status) lists POST and fields START / PAUSED / STOPPED / ARCHIVED, but its note says PAUSE / STOP and some code examples send ACTIVE. The short documentation index also says PATCH. Do not change the app based on these conflicting summaries. Verify pause/stop on an approved test campaign before any repair.

[Settings reference](https://api.smartlead.ai/api-reference/campaigns/update-settings) documents POST and negative `track_settings` flags: `DONT_TRACK_EMAIL_OPEN`, `DONT_TRACK_LINK_CLICK`, and `DONT_TRACK_REPLY_TO_AN_EMAIL`; `[]` enables tracking. The app currently uses the first two. It sends `REPLY_TO_AN_EMAIL` for stop-on-reply, or `CLICK_ON_A_LINK` otherwise. Provider overview prose and the listed stop-setting fields are inconsistent; this also needs a controlled live check.

Other documented provider options include plain-text sending, follow-up percentage, AI sender/provider matching, and company-domain auto-pause on replies. These are not automatically added to the app by updating this spec.

### Sequences and A/B versions

[Sequence update reference](https://api.smartlead.ai/api-reference/campaigns/update-sequences) documents POST, `seq_number`, `subject`, `email_body`, `seq_delay_details.delay_in_days`, and IDs for updating steps. It describes `seq_variants` for A/B tests and says active campaigns must be paused before editing.

The installed drawer submits one subject/body per step. Its existing compliance helpers understand `seq_variants` returned by SmartLead and check each version separately. That does **not** establish an installed A/B editor or results table.

For results, [sequence analytics](https://api.smartlead.ai/api-reference/campaign-statistics/sequence-analytics) documents:

```text
GET /campaigns/{id}/sequence-analytics
start_date=<ISO 8601 timestamp>
end_date=<ISO 8601 timestamp>
time_zone=<IANA zone, defaults UTC>
```

Response: `data.sequences[]`, each with `seq_number`, `subject_line`, `total_stats`, and `variants[]`. Versions carry `id`, `variant_label`, `is_baseline`, and `stats` including sent/open/reply/bounce/positive-reply counts and percentages. Configuration text and performance are separate reads. The installed aggregate helper does not use this result endpoint.

### Lead imports and suppression

Provider still documents a **400-lead maximum per import**. App Master Pool push chooses smaller 100-lead chunks; direct import uses 400. Required provider field is email; names, company, and custom fields are optional.

Master Pool push selects verified `valid` emails, optionally `catch_all`, with a maximum request selection of 5,000 and default query limit 1,000. It excludes existing queue entries and addresses in `suppressed_emails`. It sends `ignore_global_block_list: false`, `ignore_unsubscribe_list: false`, and `ignore_duplicate_leads_in_other_campaign: false`.

A successful import response is not proof an email reached a prospect. Master Pool pushes write queue state `pushed`; other queue actions use states such as assigned, sending, sent, failed, snoozed, suppressed, and promoted. A queue label `sent` may describe a successful push, not recipient delivery. Counts and partial import errors need read-back verification.

## 5. Analytics: actual app behavior versus provider rules

**Installed:** `src/lib/smartleadAnalytics.ts` tries `/analytics/overview`, then lists campaigns and reads `/campaigns/{id}/analytics` one at a time. It normalizes selected count fields, sums campaign counts, computes rates locally, and caches for 10 minutes. Refresh bypasses that cache. It does not request dates or split long periods into 30-day windows. Do not claim historical charts or per-version results from this helper.

App formulas are open/sent, reply/sent, click/sent, bounce/sent, and interested/reply, multiplied by 100. These are **app-calculated ratios**, not guaranteed to match SmartLead's native dashboard formulas. Zero/missing data or an error must not be described as verified zero activity.

**Provider-documented current reads:**

| Endpoint | Date fields | Notes |
| --- | --- | --- |
| /analytics/overall-stats-v2 | start_date, end_date, timezone | Account-wide totals; detailed current replacement/reference for overview |
| /campaigns/{id}/analytics-by-date | start_date, end_date, time_zone | Inclusive calendar dates; maximum 30-day range |
| /campaigns/{id}/sequence-analytics | ISO start_date, end_date, time_zone | Step and version breakdown |

[Provider metric rules](https://api.smartlead.ai/api-reference/analytics/how-metrics-are-calculated) distinguish raw events from unique people. Raw events may be additive; distinct-person counts are not additive across date windows. Do not sum window-level unique counts or average percentages to reconstruct a long period.

For Global Analytics the reference gives open rate = unique opens / unique leads, bounce rate = bounces / unique leads, positive reply rate = positive replies / replies, and reply rate = replies / unique opens, falling back to unique leads when open tracking is off. Different endpoints can attribute counts to send date, reply date, or event date. Positive categories are mutable, so recategorizing a lead can change historical totals. Always check the specific endpoint's metric definitions.

## 6. Webhooks and replies

**Installed registration:** the connection panel lists callbacks per campaign and registers `POST /campaigns/{id}/webhooks` with `name`, `webhook_url`, and `event_types`. Existing matching receiver URLs are skipped. New campaigns need callback coverage; no campaign means there is nothing to register.

[Campaign callback reference](https://api.smartlead.ai/api-reference/campaigns/save-webhooks) documents this path but uses LEAD_REPLIED / LEAD_OPENED / LEAD_CLICKED / LEAD_BOUNCED / LEAD_UNSUBSCRIBED examples. Installed registration uses EMAIL-prefixed event names. [Events reference](https://api.smartlead.ai/api-reference/webhooks/events) and real payloads must be checked before changing accepted names.

A separate [association-based API](https://api.smartlead.ai/api-reference/webhooks/create) uses `POST /webhook/create`, with association type and event map for user/client/campaign scope. It is provider-documented, not the app's installed registration flow. Do not substitute generic `/webhooks` examples.

The installed receiver reads several alternative event/campaign/lead fields, stores payload and reply classification in `smartlead_events`, and adds recognized unsubscribe, bounce, and complaint emails to `suppressed_emails`. It uses seven categories: INTERESTED, MEETING_REQUEST, INFO_REQUEST, SOFT_NO, WRONG_PERSON, NOT_INTERESTED, and OOO. Rule checks run first; an AI fallback can classify unclear messages; unresolved replies need human review.

**Limits:** current receiver source does not verify a provider signature/shared callback secret. It logs insert failures yet returns `{ok:true}`; that acknowledgement alone is not proof the event was saved. Payload/event-name mapping, replay handling, delivery retry, persistence, and inbox visibility require a separate safety review and live callback test. No callback was triggered in this document phase.

## 7. Mailboxes and unsubscribe sync

Mailbox sync explicitly verifies staff, pages `/email-accounts` in sets of 100, and saves `email_accounts`. It reads current cached numeric campaigns and their assigned mailboxes into `campaign_mailbox_assignments`. It never deletes mailbox records. Campaign links are replaced only after a successful provider read; delete-and-insert is not an atomic replacement. Partial failures are reported.

Warmup status can come from `warmup_details.status` or `warmup_enabled`; reputation is clamped to 0–100. Sending limit maps from `message_per_day` or `daily_limit`; sent-today maps from `daily_sent_count` or `daily_sent`. Missing counts can default to zero, so current provider response mapping needs checking before treating every card as exact live health.

[Warmup settings](https://api.smartlead.ai/api-reference/email-accounts/warmup-settings) still document POST with `warmup_enabled`. Additional documented options include min/max warmup counts, weekday-only warmup, and automatic adjustment. The app's toggle only sets `warmup_enabled`. Mailbox count, reputation, and warmup readiness must be read from current data.

Unsubscribe sync reads **campaign IDs in the local cache**, then pages each campaign's leads with `status=unsubscribed`. It does not query a global provider block-list endpoint. Missing/stale cached campaigns can limit coverage. It adds new suppressed emails, reports failed campaigns, and does not erase prior suppressions.

The installed timer is configured for 07:00 UTC: 2:00 AM Central in winter and 1:00 AM in summer. Staff can run the same check manually. The timer uses its private stored pass and a database claim limiting it to one run per 20 hours; the manual button's 60-second wait is a browser control, not a shared server rate limiter. Hosted timer execution was not tested during this review.

## 8. Compliance rules — preserved, not newly changed

Every email step and every A/B version must contain `{{unsubscribe}}` and the saved company mailing address. Empty sequences fail. The drawer warns while editing; launch and Master Pool push/dry-run check compliance. List shields cache checks for 10 minutes, while launch rechecks live text.

The company address lives in `company_settings`; admins edit it. Browser and server reuse the mailing-address validation rule. Master Pool pushes filter the local do-not-email list before import. Recognized callback suppressions and unsubscribe sync provide additional inputs.

**Scope caveat:** these controls do not prove every legacy direct-import or manual queue path uses the same server gate. The old direct wizard and Test Mode perform their own provider lead imports. Test Mode is a convenience for adding test recipients, not a provider-enforced protection against later real lead additions. Inspect each path in a separate approved review before claiming universal enforcement.

## 9. App data reference

| Table | Current purpose |
| --- | --- |
| teacher_import_batches | Import batch history |
| prospects_staging | Direct wizard's staged/QA rows |
| teacher_prospects | Master Teacher Pool |
| outreach_queue | Teacher/campaign push and follow-up work state |
| campaign_cache | Campaign mirrors and cached aggregate analytics; do not assume integer-only IDs |
| smartlead_events | Received callback payload, reply message/ID, category, confidence, explanation |
| suppressed_emails | Local do-not-email addresses |
| company_settings | Company mailing address and timer bookkeeping |
| email_accounts | Saved sending mailbox information |
| campaign_mailbox_assignments | Saved campaign-to-mailbox links |

This table is a descriptive reference, not executable schema. The old illustrative CREATE TABLE blocks were removed because they did not match current fields. No tables or access rules changed in this review.

## 10. Other provider capabilities — not newly installed

| Capability | Current documented route / source | Status |
| --- | --- | --- |
| Client API keys | /client/api-key and reset/delete operations; [reference](https://api.smartlead.ai/api-reference/clients/api-keys) | Account-level key remains installed; no verified client-specific quota claim |
| Lead categories | GET /leads/fetch-categories; POST /leads/categories; PATCH/DELETE /leads/categories/{id}; [reference](https://api.smartlead.ai/api-reference/leads/categories) | Provider supports global and custom categories; do not confuse them with the app's seven reply buckets |
| Block lists | GET /leads/get-domain-block-list; POST /leads/add-domain-block-list; DELETE /leads/delete-domain-block-list with id; [reference](https://api.smartlead.ai/api-reference/utilities/domain-block-list) | Separate from installed local suppression and campaign unsubscribe sync |
| SmartProspect contacts | POST https://prospect-api.smartlead.ai/api/v1/search-email-leads/search-contacts; [reference](https://api.smartlead.ai/api-reference/smart-prospect/search-contacts) | Separate API host; not installed as a teacher-source replacement |
| Move campaigns to folders | POST /campaigns/update-folder; [reference](https://api.smartlead.ai/api-reference/campaigns/update-folder) | Do not use the old guessed folder CRUD paths or confuse deliverability-test folders with campaign folders |
| Mailbox reallocation | POST /campaigns/{id}/reallocate-mailboxes | Provider capability; not claimed as an app control |
| Deliverability tests / expanded inbox tools | Separate sections in the full official reference | Not automatically installed by this documentation refresh |

The old guessed SmartProspect, folder, block-list, and category examples are not implementation instructions. Account eligibility and exact request bodies must be checked before adding these capabilities.

## 11. Connection evidence and remaining checks

**Read-only check on November 19, 2026:** authenticated requests through the deployed app proxy returned 7 email accounts and an empty campaign list. The replacement key was accepted for these reads. No campaign was created, launched, paused, stopped, or changed, and no email was sent.

This does not verify:

1. This account's plan quota or endpoint throttling under load.
2. Live campaign creation, schedules, settings, status writes, and partial draft-save failures.
3. Current overall-stats-v2 response mapping or date-boundary/unique-count math.
4. A/B editor/results support or the new sequence-analytics integration.
5. Per-campaign callback registration, event names, authenticated delivery, saved rows, or inbox arrival.
6. Warmup toggle writes, mailbox field mappings, partial link replacement, or real send counts.
7. Unsubscribe filter compatibility, full cache coverage, timer execution, and legacy push gate coverage.
8. Import partial-success counts and prevention of unsafe write retries after uncertain delivery.

Each runtime change needs a separate plan and approval. Retest reads safely; check provider state before retrying a write whose delivery is uncertain. A failed call should preserve the provider status and body rather than be treated as empty data.

## 12. Reference links

- [Introduction and API versions](https://api.smartlead.ai/introduction)
- [Authentication](https://api.smartlead.ai/authentication)
- [Rate limits and concurrency](https://api.smartlead.ai/guides/rate-limits)
- [Campaign status](https://api.smartlead.ai/api-reference/campaigns/update-status)
- [Campaign settings](https://api.smartlead.ai/api-reference/campaigns/update-settings)
- [Sequence configuration](https://api.smartlead.ai/api-reference/campaigns/update-sequences)
- [Sequence analytics](https://api.smartlead.ai/api-reference/campaign-statistics/sequence-analytics)
- [Overall analytics](https://api.smartlead.ai/api-reference/analytics/overview)
- [Campaign analytics by date](https://api.smartlead.ai/api-reference/campaigns/get-analytics-by-date)
- [Metric calculation rules](https://api.smartlead.ai/api-reference/analytics/how-metrics-are-calculated)
- [Campaign webhooks](https://api.smartlead.ai/api-reference/campaigns/save-webhooks)
- [Scoped webhook creation](https://api.smartlead.ai/api-reference/webhooks/create)
- [Webhook events](https://api.smartlead.ai/api-reference/webhooks/events)
- [Warmup settings](https://api.smartlead.ai/api-reference/email-accounts/warmup-settings)

*Neuron Garage Prospecting App — Built by Integral Outbound. Document review only; no runtime changes.*
