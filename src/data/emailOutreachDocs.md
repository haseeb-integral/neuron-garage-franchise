# Outreach Guide — Neuron Garage

**Plain-English team guide · Updated November 19, 2026**

## 1. What SmartLead does

SmartLead sends outreach emails from the mailboxes assigned to a campaign. A campaign is a named list of people, a set of emails, and a sending schedule.

The Neuron Garage app helps the team import teachers, prepare campaigns, review replies, and move interested people into the Candidate Pipeline. The app and SmartLead are separate systems. A saved teacher, an imported lead, and a delivered email are not the same thing.

## 2. Where to work

On **Email Outreach**, choose the right scope at the top.

**SmartLead scope:**

- **Act on replies:** review replies and choose what happens next.
- **Campaigns & sending:** view campaigns and the Outreach Queue.
- **Mailboxes:** view saved sending-account details, refresh them, change warmup, or sync unsubscribes.
- **Setup & reference:** check the connection, set the company mailing address, and view analytics.

**Master Teacher DB scope:**

- Review the Master Teacher Pool.
- View recent imports and enrichment runs.
- Pick verified teachers to push to a campaign.

The menu also has **Outreach Spec** for app rules and **SmartLead API Spec** for the detailed connection reference. Each guide has a **Download .md** button. That downloads a text file you can keep or give to another reviewer.

## 3. Before starting a real campaign

1. Save the real company postal address in **Company mailing address**. An admin must do this.
2. Check the sending mailboxes. Do not assume every account is ready just because it appears in the list.
3. Review the schedule, time zone, daily limit, and assigned mailboxes.
4. Check every email version for the unsubscribe tag and company address.
5. Use an approved test recipient before sending to real teachers.
6. Check that the campaign has a registered reply connection and confirm a test reply appears in the app.

SmartLead's warmup guide recommends at least 14 days for new accounts and often 21–30 days for new domains. Time alone does not prove a mailbox is ready. Review its health and delivery results too.

## 4. Import teachers into the Master Pool

This is the recommended starting point when you want teacher records and their evidence in the app.

1. Choose **Import to Master Pool**.
2. Upload the CSV. The importer recognizes the 27-column Manus format.
3. Review the field mapping and preview.
4. Choose **Fill blanks only** for a safer repeat import. **Overwrite** can replace existing values.
5. Review the new, updated, and skipped counts.

The importer keeps signal text and does not replace a filled field with a blank. Records are checked for duplicates. Import history is saved in the app.

An import into the Master Pool does **not** start emailing those teachers.

## 5. Push verified teachers to SmartLead

Pick the teachers and destination campaign, then use **Dry run** first. It shows what the push would do without importing anyone.

The Master Pool push checks:

- Every email step and every A/B version for the unsubscribe tag and saved address.
- Teachers already recorded in that campaign's queue.
- The app's do-not-email list.
- Email verification status. Valid emails are the normal choice; catch-all emails are optional and less certain.

The push sends groups of 100. Read the success, skipped, and error counts. A record pushed into SmartLead is not proof an email was delivered.

### Older direct-import option

**Import to SmartLead** is a separate four-step tool: batch details, upload and map, review, then import. It sends approved rows directly to the chosen campaign in groups of up to 400. It records the batch and staged rows in the app.

This older tool is not the same as the Master Pool push. Do not assume it has all of the same checks. Use the Master Pool route when you need its verification and do-not-email review.

## 6. Create and manage campaigns

The new-campaign window walks through the name, sending schedule, sender/settings choices, and email steps. New email bodies include the unsubscribe tag and saved address. Do not remove either.

- **Draft:** prepares the campaign without starting normal scheduled outreach. Read any warnings; a saved draft can still need setup work.
- **Launch:** starts sending under the saved schedule once setup and checks pass.
- **Pause:** pauses the campaign.
- **Stop:** stops the campaign. Confirm the result before assuming it changed.

A campaign can use multiple assigned mailboxes. There is no fixed rule that it always uses three. Choose the senders shown in the app.

### Test Mode

Test Mode adds test recipients using the chosen test email and, when requested, email aliases. Use an address you own or have approval to test. Make sure that mailbox accepts aliases.

Test Mode is not a permanent lock that prevents someone from adding real leads later. Check the actual lead list before launch. Launching a test campaign can send real test emails.

### Email versions

SmartLead supports A/B versions: two or more versions of an email step. The app's checks inspect each version returned by SmartLead. A compliant Version A does not cover Version B.

The current app campaign window writes one subject and body per step. Do not assume an A/B editor or a live side-by-side results table exists here just because SmartLead supports them.

## 7. Unsubscribe and address rules

Every email step and every version must contain:

1. `{{unsubscribe}}`, which SmartLead uses to make the unsubscribe link.
2. The saved company mailing address.

The app warns while you write. The campaign launch check and Master Pool push refuse missing items. The campaign list uses a shield: green means the saved check passed; red means something is missing; no shield means a result is not ready. The list check can be up to 10 minutes old. Launch checks the email text again.

If the company address is not set, these launch and Master Pool push checks refuse to proceed. An admin can save or change the address in **Setup & reference**. Check existing email bodies after changing it; saving the address does not rewrite every old email for you.

The app also has its own do-not-email list. Recognized unsubscribe, bounce, and spam reports add addresses. Master Pool pushes skip those addresses. Do not treat a queue-only label as proof an address was added to the shared do-not-email list.

## 8. Sync unsubscribes

The app has a backup check for unsubscribes, in addition to reply alerts.

- **Automatic time:** configured for 07:00 UTC each day. This is 2:00 AM Central in winter and 1:00 AM in summer.
- **Manual button:** use **Sync Unsubscribes** in Mailboxes. Read the number added and any failed campaigns.
- **Button wait:** after a manual run, the button waits 60 seconds before another press.
- **Last new unsubscribe:** the time the latest new address was added, not the time every check ran.

The sync checks campaigns saved in the app's campaign list. Refresh campaigns so newly created ones are included. If a campaign fails, it is not fully checked. A result with zero new addresses does not prove there have never been unsubscribes.

## 9. Review replies

SmartLead can send reply alerts to the app through a registered callback. A callback is the connection that tells the app an event happened. It must be set up for the campaign. Its presence alone does not prove every reply is arriving.

Replies are saved and placed into seven groups:

| Group | Meaning |
| --- | --- |
| Interested | Clear interest |
| Meeting request | Wants a call |
| Information request | Needs an answer or more details |
| Soft no | Not now or later |
| Wrong person | Another contact may be needed |
| Not interested | Clear no or opt-out |
| Out of office | An automatic away message |

The app uses wording checks and an AI fallback. These suggestions can be wrong. Read the actual reply before acting. Unclear or low-confidence replies need a person to review them.

Staff can correct a group, reply in the email thread, snooze work, or promote a suitable teacher to the Candidate Pipeline. Promotion rules depend on the group and confidence; an interest badge is not proof a franchise agreement exists.

A working account connection does not prove incoming replies work. After setting up a new campaign, confirm a test reply reaches the app and is saved correctly.

## 10. Use the Outreach Queue

The queue tracks app work for each teacher and campaign. It can show queued, assigned, sending, pushed, sent, failed, snoozed, suppressed, or promoted states. Some replies are shown by matching saved reply events rather than a single queue state.

Read the action and result, not just the label. In some paths **sent** means a lead was imported into SmartLead. It does not prove the prospect received an email. For a failed action, review the saved error before retrying. Avoid repeating an import if you do not know whether the first attempt reached SmartLead.

## 11. Read analytics carefully

The Analytics section shows saved campaign totals and app-calculated rates. Data can be cached for 10 minutes; **Refresh** asks for new data.

The current summary tries an overall read and falls back to reading campaign totals. It does not currently build date-window history or fetch SmartLead's separate per-version performance report.

App rates use these comparisons:

- Open rate: opens divided by sends.
- Reply rate: replies divided by sends.
- Bounce rate: bounces divided by sends.
- Interested rate: interested count divided by replies.

SmartLead's own reports can use different rules, such as counting unique people rather than email events. One person may receive several emails. Some reports group replies by the day sent; others use the day answered. This can make totals differ.

Do not add daily unique-person counts to make a monthly count; the same person can appear on several days. Missing data or a failed read should not be treated as proof of zero activity.

## 12. Manage mailboxes

Mailbox cards show a saved copy of sending-account information. The number of accounts and their names come from current data, not a fixed list.

Each card can show the address, provider, warmup status, reputation, send limit/progress, and attached campaigns. Reputation colors are app labels: green at 80 or higher, amber from 50 to 79, red below 50. They are not a guarantee of delivery.

- **Refresh Mailboxes:** asks SmartLead for current accounts and links from the saved campaign list.
- **Warmup On/Off:** requests a warmup change, then refreshes the information.
- **Add SMTP:** adds a sending account with the required account details.
- **Last synced:** tells you how old the saved copy is.

A refresh does not delete old mailbox cards. A mailbox removed in SmartLead may still appear in the saved copy. Failed reads keep prior details, so check the warning and sync time. Missing provider fields may show defaults; a zero send count alone is not proof nothing was sent.

## 13. Check the connection

Use **Test Connection** in Setup & reference to check account access. Campaigns and sending accounts should load when the saved key is accepted.

Check reply coverage separately using the campaign callback list and received-event history. No recent reply alerts may simply mean no one replied, but they may also mean a missing connection. Confirm with a controlled test rather than guessing.

If SmartLead rejects the key, replace it through the secure secret panel. Never paste it into chat. If a call says there were too many requests, allow time before another refresh. Request limits depend on the SmartLead plan and the type of call.

If a send or import may already have happened, read back the result before repeating it. Do not start a real campaign just to test the connection.

## 14. Team responsibilities

| Work | Where |
| --- | --- |
| Import and review teacher records | Master Teacher DB / Import to Master Pool |
| Preview and push verified leads | Master Pool push |
| Write email copy and manage campaigns | Campaigns & sending |
| Save the company postal address | Company mailing address, admin access |
| Refresh accounts and review warmup | Mailboxes |
| Pull backup unsubscribe results | Sync Unsubscribes |
| Answer replies and choose next actions | Act on replies |
| Move suitable prospects into the process | Promote to Pipeline |
| Review detailed app rules | Outreach Spec |
| Review provider differences and untested checks | SmartLead API Spec |

**Source:** [SmartLead's current reference](https://api.smartlead.ai/introduction). This guide describes installed app behavior. Reading a new provider feature does not add it to the app.
