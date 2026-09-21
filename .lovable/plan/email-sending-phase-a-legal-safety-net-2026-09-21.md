# Email sending — Phase A (legal safety net)

Goal: make it legal and safe to send a real cold email. Nothing sends today without this.

## What we change and why

1. **Unsubscribe link in every email.**
   New campaign sequences get an unsubscribe tag and a physical mailing address in the footer by default. A campaign cannot be turned on if any step is missing the unsubscribe tag. This is required by the CAN-SPAM law.

2. **Respect our own do-not-email list.**
   Right now, when someone unsubscribes in the app they land on a do-not-email list — but the tool that sends people to SmartLead never looks at that list. We add that check, so suppressed people are filtered out of every push (and the skipped count is shown).

3. **Write bounces and unsubscribes back to the list.**
   When SmartLead tells us someone bounced or unsubscribed, we record them on the do-not-email list automatically, so they are never emailed again.

## Pages and parts affected

- New Campaign drawer (default email text + a block on activation without unsubscribe)
- The "push leads to SmartLead" background job (suppression filter)
- The SmartLead reply/bounce receiver (writes to the do-not-email list)
- The do-not-email table

## Not touched

Teacher Search, Candidate Pipeline, Market Validation, Site Analysis, campaign analytics, mailbox warm-up settings.

## Risk

Low. No data is deleted. The only behaviour change is that some addresses get skipped — which is the point. A live campaign already running is not modified; the rule applies when a campaign is turned on.

## Needed from you

The physical mailing address for the email footer (required by law). Tell me the address and I will put it in; otherwise I will leave a clearly marked placeholder that blocks activation until it is filled.

## Turns

1 turn.

## What to test after

- Make a new campaign: the footer shows the unsubscribe link and address.
- Delete the unsubscribe tag and try to turn the campaign on — it should refuse.
- Push a lead list that contains a suppressed address — it should be skipped and counted.
