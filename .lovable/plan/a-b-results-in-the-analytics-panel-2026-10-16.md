# A/B results in the Analytics panel

## What and why
For any campaign that has both an A and a B version, add an "A/B Results" row you can open. Inside, A and B sit side by side. Each row shows subject line, open rate, reply rate, interested count, and bounce rate. The better number is shown in green and the worse one in gray. Campaigns with only A look exactly the same as today.

## Things I need to check first (not yet confirmed)
1. **Where the A/B numbers come from.** The brief says the campaign "sequences" call returns open, reply, and click numbers for each version. The app already uses that call for the unsubscribe check, and there it only returns the email text (subject, body, delay). I can't confirm it returns any numbers. Our SmartLead key is invalid right now, so I can't test it live. SmartLead's per-lead stats list does say which step and version each person got, so the numbers can be added up from that if needed.
2. **How to match A and B.** The brief says to match by subject line. That breaks if A and B use the same subject, or if a subject is edited inside SmartLead. Better: match by the version label (A/B) or the version ID that SmartLead returns, and use the subject only as a backup.

So Phase 1 is a quick check, not building.

## Phases
**Phase 1 — check the data (1 turn, needs a working SmartLead key).** Call the sequences endpoint and the per-lead stats endpoint once each for a campaign that has A and B. Write down which fields hold the numbers and the version labels. Then I'll tell you which source works before I build anything.

**Phase 2 — fetch and cache (1 turn).** A small helper next to the existing analytics code. It runs only for campaigns that have both A and B saved locally. It calls SmartLead through the proxy, 5 campaigns at a time with a pause between batches (under the 10-per-2-seconds limit). It keeps the results for 10 minutes, the same way the existing analytics do.

**Phase 3 — the A/B Results row (1 turn).** In the Analytics panel only: an expandable row under each campaign's numbers. It shows the comparison table with green and gray colors. If both numbers are equal, both stay gray. For bounce rate, lower wins. It shows "Not enough data yet" when no emails have been sent. Tests cover who wins on each row, including bounce rate (lower wins).

## Do not touch
NewCampaignDrawer, ReplyTriagePanel, other panels, and the existing analytics numbers.

## Today's reality
- No campaign has A/B versions saved yet. The A/B editor tabs (Phases 2–3 of the last plan) aren't built yet.
- The SmartLead key is invalid. So right after this is built, no A/B rows will show up yet. That is expected.

## Open items carried over
- New SmartLead key needed (blocks Phase 1 here).
- A/B editor Phases 2–4, Mailboxes Phases 2–4, and the unsubscribe job's timer and "Last sync" line are all waiting.
