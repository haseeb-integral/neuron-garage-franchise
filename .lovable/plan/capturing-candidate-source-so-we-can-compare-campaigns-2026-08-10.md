# Capturing candidate source so we can compare campaigns

## Short answer

Three levels is the right amount. It is not too detailed — as long as the
first two levels are picked from short fixed lists and only the third one is
free text. The rule of thumb: anything you want to **group by** in a report
must be a dropdown; anything that is just context can be free text.

Today the candidate record has only one field, `source` (free text). It is
almost empty: 20 of 21 candidates have no source at all, and one says
"Discovery Day". So there is no risk in changing the shape now.

## What we would capture

| Level | Field | How it is entered | Example |
|---|---|---|---|
| 1 | Source Type | dropdown, fixed list | Outbound Email |
| 2 | Source Name | dropdown, depends on Type | SmartLead |
| 3 | Campaign | text / picked from our campaign list, optional | Houston Teachers – Apr 2026 |

Proposed Level 1 list (the only list we should rarely change):
Outbound Email, Referral, Paid Ads, Organic / Web, Event, Social, Broker /
Partner, Other.

Proposed Level 2 examples per type:
- Outbound Email → SmartLead, Manual email
- Referral → Existing franchisee, Employee, Friend / family, Other
- Paid Ads → Google Ads, Meta Ads, LinkedIn Ads
- Organic / Web → Website form, Google search, Franchise portal
- Event → Discovery Day, Trade show, Webinar
- Social → LinkedIn, Facebook, Instagram, YouTube
- Broker / Partner → named brokers

We also keep a small free-text "Source notes" box for the odd story that does
not fit ("met at a school board meeting").

## Why three and not more

- One field only (today) means we can never answer "are ads or referrals
  better?" without reading text.
- Two fields answer "which channel works?" but not "which campaign works?".
- Four or more (adding sub-campaign, ad group, keyword) is real marketing
  attribution. That belongs in the ad platform, not in this app, and staff
  will not fill it in by hand.

## Filling it in automatically where we can

Many candidates start as a teacher prospect that we emailed through
SmartLead. When a candidate is created from a prospect that has a SmartLead
campaign, we set Source Type = Outbound Email, Source Name = SmartLead, and
Campaign = the campaign name, with no typing. Staff can still change it.
Hand-added candidates get the dropdowns, defaulted to blank so the fields
stay honest.

## Where it shows up

- **Qualification Process → Step 1** — the three fields sit where the single
  "Source" dropdown is today, auto-saving on blur like the rest of Step 1.
- **Overview tab** — read-only summary line: `Outbound Email · SmartLead ·
  Houston Teachers – Apr 2026`.
- **Reporting** — a simple "Where candidates come from" panel: candidate
  count and stage-conversion by Source Type, then by Campaign. This is the
  whole reason for the change, so it should ship, not be optional.

## Technical notes

- New columns on `candidates`: `source_type text`, `source_name text`,
  `source_campaign text`, `source_notes text`. Keep the existing `source`
  column for one release and backfill it into `source_type` /
  `source_name`, then stop writing to it.
- The Level 1 / Level 2 lists live in a small `candidate_source_options`
  table (type, name, active, sort order) so the lists can be edited without
  a code release, with normal RLS plus GRANTs for staff read and admin write.
- Auto-fill reads the prospect's `smartlead_campaign_id` and resolves the
  name from the existing campaign cache.
- Reporting is one grouped query over `candidates` joined to
  `candidate_stage_history` for conversion counts.

## Phases

- **Phase 1 (1 turn)** — add the columns and the options table, seed the
  lists, backfill the one existing value.
- **Phase 2 (1 turn)** — Step 1 UI (three linked dropdowns + notes,
  auto-save) and the Overview read-only summary line.
- **Phase 3 (1 turn)** — auto-fill from SmartLead when a candidate comes
  from a prospect.
- **Phase 4 (1 turn)** — the "Where candidates come from" reporting panel.

## Risks and testing

- Risk: staff skip the fields. Mitigation: Source Type is part of the Step 1
  completion check, so a step cannot be marked complete without it.
- Do not touch: stage logic, scoring, exports other than adding the new
  columns, the teacher prospect tables.
- Test: add a candidate by hand and pick each level; create one from a
  prospect in a SmartLead campaign and confirm the three values fill in;
  confirm Overview shows the summary and the old "Discovery Day" candidate
  now reads Event · Discovery Day.
