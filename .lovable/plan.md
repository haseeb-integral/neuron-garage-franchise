# Refresh the SmartLead reference guides safely

## What we will change and why

Compare our saved guides with [SmartLead's official reference](https://api.smartlead.ai/introduction), including its full linked API reference. Correct old examples and claims. Keep a clear line between what SmartLead offers and what this app actually does.

This is a **document-only update**. It will not change campaigns, send emails, change mailbox settings, or change the app's connection.

### Which documents and pages are affected

- **SmartLead API Spec** — `src/data/smartleadSpec.md`, shown at `/smartlead-spec`.
- **Outreach Spec** — `src/data/outreachSpec.md`, shown at `/outreach-spec`.
- **Outreach Guide** — `src/data/emailOutreachDocs.md`, shown at `/email-outreach-docs`.
- Their existing Markdown download buttons use these same documents. No new page or menu link is needed.

There is no separate SmartLead API Methodology page in the current menu. The Outreach Guide explains how the connection works. The Outreach Spec describes the app's rules. Together with the API Spec, these are the three existing references to update.

## What the review found

The current saved documents already include September and October updates. They are not untouched June copies. The official reference does not establish when each difference was introduced. The report will say **“documented now; introduction date unknown”**, rather than claim every difference was added after June.

| Topic | What needs correction |
| --- | --- |
| API address and key | The app's V1 address and server-only query-parameter key still match the official introduction. Keep them. |
| Request limits | Our guides state a fixed 10 requests per 2 seconds. The introduction says limits depend on the plan. The detailed guide lists Standard 60/minute and 1,000/hour, Pro 120/minute and 3,000/hour, and separate limits for some calls. Describe the app's existing pacing separately. Do not claim the account's plan was verified. |
| Campaign status | The app already sends POST with START, PAUSED, or STOPPED. The API Spec incorrectly says PATCH and PAUSE/STOP. The detailed provider page also contradicts itself in notes and examples. Keep START; cite the exact conflict instead of copying examples that use ACTIVE. |
| Settings | The detailed endpoint is POST. Negative tracking flags remain supported. Separate optional provider settings from settings the app offers. |
| A/B email versions | The old spec's variant_a/variant_b example is stale. The current sequence reference describes seq_variants. The current reference also documents a separate sequence-analytics read for per-version results. Do not claim that reading email text alone supplies performance results, or that the app already uses the new statistics call. |
| Analytics | The current account-wide reference uses analytics/overall-stats-v2 with dates. The app currently attempts analytics/overview, then campaign totals. Document that gap without silently changing calls. |
| Dates and totals | analytics-by-date uses start_date, end_date, and time_zone, with a 30-day range limit. That is not a limit on every analytics call. The app's current aggregate helper does not perform the date-window stitching described in the guides. Remove that false claim. SmartLead also warns that unique people and percentages cannot safely be added across separate date windows. Explain the app's current formulas separately from provider formulas. |
| Webhooks | The app registers callbacks per campaign. The old spec describes a global POST /webhooks route. The current provider documents campaign webhooks and a separate /webhook/create route with user/client/campaign association. Describe what is installed versus what is available. Callback registration and a working API key do not prove reply delivery is working. |
| Categories and block lists | Replace old guessed routes with the documented account category routes and paginated domain/email block-list routes. Keep the app's own do-not-email safeguards unchanged. |
| SmartProspect | The old guessed /smart-prospect/search paths do not match the current search-contacts reference, which uses a separate prospect-api address. Mark this as provider capability, not a shipped teacher-search feature. |
| User guide | Remove fixed mailbox names/counts, unverified live warmup claims, the old four-category explanation, and the stale import table description. Describe the current saved-copy mailbox view, seven reply categories, and actual import records. |
| Connection proof | Record the November 19 read-only check separately: the new key returned 7 email accounts and 0 campaigns. This proves those two reads, not campaign writes, analytics with real data, or inbound replies. Do not put temporary connection history into the daily user guide. |

## Phase 1 — Update the three documents

**Estimate: 1–2 Lovable turns.**

1. Refresh the API Spec with a dated comparison section, exact source links, correct examples, and clear labels: installed, provider-documented, or not yet verified.
2. Correct the Outreach Spec's descriptions of what the app does now. Do not change its business rules.
3. Refresh the Outreach Guide in plain English. Remove false guarantees of instant updates or fully automatic behavior where the installed flow or a live test does not support them.
4. List remaining connection/code checks separately. Any actual feature repair needs its own plan and approval.

**Stop after Phase 1** and report the changed files and key corrections for review.

## Phase 2 — Check the pages and downloads

**Estimate: 1 Lovable turn, after Phase 1 review.**

1. Open all three pages while signed in.
2. Check headings, tables, links, and phone-width text.
3. Download each Markdown file and confirm it matches its page's updated document.
4. Check that the existing menu links still work.
5. Give a final summary of corrected claims, unresolved provider conflicts, and checks not yet run against real campaigns.

No campaign will be created or started as part of this check.

## Risks and safeguards

- **Conflicting official examples:** use detailed endpoint fields, disclose disagreements, and mark untested write behavior. No automatic runtime changes.
- **False change dates:** compare present documentation with saved documents; do not invent a June baseline or release date.
- **False feature claims:** check current app code before calling something installed. New provider features remain labeled as optional.
- **False success claims:** empty campaigns cannot prove lead pushes, launch, A/B results, or reply delivery. Keep those checks open.
- **Protect existing work:** no edits to Reply Triage, Analytics code, Import Wizard, Outreach Queue, password setup, portal forms, calendar actions, database tables, access rules, or secrets.
- **Privacy:** do not include API keys, prospect records, or private backend addresses in examples.

## Sources for the corrections

- [Introduction](https://api.smartlead.ai/introduction)
- [Rate limits](https://api.smartlead.ai/guides/rate-limits)
- [Campaign status](https://api.smartlead.ai/api-reference/campaigns/update-status)
- [Campaign settings](https://api.smartlead.ai/api-reference/campaigns/update-settings)
- [Sequence configuration](https://api.smartlead.ai/api-reference/campaigns/update-sequences)
- [Sequence analytics](https://api.smartlead.ai/api-reference/campaign-statistics/sequence-analytics)
- [Overall analytics](https://api.smartlead.ai/api-reference/analytics/overview)
- [Analytics by date](https://api.smartlead.ai/api-reference/campaigns/get-analytics-by-date)
- [How metrics are calculated](https://api.smartlead.ai/api-reference/analytics/how-metrics-are-calculated)
- [Campaign webhooks](https://api.smartlead.ai/api-reference/campaigns/save-webhooks)
- [Scoped webhook creation](https://api.smartlead.ai/api-reference/webhooks/create)
- [Lead categories](https://api.smartlead.ai/api-reference/leads/categories)
- [Domain and email block lists](https://api.smartlead.ai/api-reference/utilities/domain-block-list)
- [SmartProspect search contacts](https://api.smartlead.ai/api-reference/smart-prospect/search-contacts)

## Aesthetics

Keep the current document pages, colors, type, navigation, and download buttons. This update changes reference content, not the page design.