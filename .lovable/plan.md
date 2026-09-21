# CAN-SPAM unsubscribe enforcement

Goal: no campaign can go live, and no leads can be pushed, unless every email step has the `{{unsubscribe}}` tag.

## What is already there

- `src/lib/canSpam.ts` has the tag and a checker.
- The New Campaign drawer already blocks launch-time creation when a step has no tag (and no mailing address).
- Unsubscribe page, unsubscribe function, do-not-email list: all done.

## What is missing (this is what we build)

### Part 1 — Warnings inside the step editor
In the New Campaign drawer, for each email step:
- A small grey hint under the body box: "Include {{unsubscribe}} in your email to add an unsubscribe link (required)."
- An amber warning under the box while the tag is missing: "CAN-SPAM requires an unsubscribe link. Add {{unsubscribe}} to this email step."
- Saving a draft stays allowed. Only turning a campaign on is blocked.

### Part 1b — Block the real Launch button
The Launch button lives on the Campaigns list, not in the drawer. Today it turns a campaign on with no check. We add a check there: before sending the "START" call, read that campaign's steps and refuse if any step has no tag. The error toast says: "Cannot activate: one or more email steps are missing the {{unsubscribe}} tag. CAN-SPAM requires an unsubscribe link in every outgoing email."

### Part 2 — Gate on pushing leads
In the push-leads function, before anything else, read the campaign's email steps. If any step has no tag, stop and return this error:
"Campaign sequences are missing {{unsubscribe}} tag. Add an unsubscribe link to all email steps before pushing leads. This is required for CAN-SPAM compliance."
This runs for the preview (dry run) too, so the problem shows up early. Everything else in that function stays exactly as it is.

### Part 3 — Compliance badge on the campaign list
Next to each campaign name, a small shield:
- Green shield, tooltip "Compliant" — every step has the tag.
- Red shield, tooltip "Missing unsubscribe" — at least one step does not.
- Grey/blank while it is still loading or the steps could not be read.
To respect the rate limit (10 calls per 2 seconds), steps are fetched a few campaigns at a time and the result is kept for 10 minutes in memory, so a refresh does not re-fetch everything.

## Technical notes

- New shared helper `sequencesMissingUnsubscribe(sequences)` in `src/lib/canSpam.ts`, reading `email_body` / `body` / `subject` shapes SmartLead returns, so frontend and function use the same rule.
- Frontend calls stay on `smartlead-proxy` via `callSmartLeadProxy("/campaigns/{id}/sequences")`. No direct SmartLead call from the browser.
- The edge function calls SmartLead server-side with `Deno.env.get("SMARTLEAD_API_KEY")`, `npm:` imports only.
- Status value stays `START`. `track_settings` negative flags untouched.
- Badge cache: simple module-level Map with a 10-minute timestamp, batched in groups of 5 with a short pause.

## Files touched

- `src/lib/canSpam.ts` (add helper)
- `src/components/email-outreach/NewCampaignDrawer.tsx` (hints + warnings)
- `src/components/email-outreach/SmartLeadCampaignsPanel.tsx` (badge + launch pre-flight)
- `supabase/functions/smartlead-push-leads/index.ts` (push gate)

## Not touched

Reply Triage, Analytics, Import Wizard, Outreach Queue, webhook, mailboxes.

## Risk

Low. Only new blocks and new labels. Existing behaviour is unchanged when a campaign is already compliant. Watch out: campaigns with no steps at all — those count as not compliant and cannot launch or receive leads.

## Turns

1 turn for all three parts.

## What to test after

1. New campaign: delete `{{unsubscribe}}` from a step — amber warning shows; you can still save a draft.
2. Press Launch on a campaign whose steps have no tag — it refuses with the toast.
3. Push leads (preview first) to that same campaign — it refuses with the compliance error.
4. Campaign list shows green shields for good campaigns, red for bad.
