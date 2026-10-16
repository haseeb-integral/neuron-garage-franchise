# A/B email versions in the campaign editor

## What and why
Each email step can have a second version, "B". SmartLead sends version A to some people and version B to others, so you can see which one works better. If you never add a B, the campaign works exactly as it does today.

## Two problems in the brief (checked)
1. **"Send B as a second call" would erase A.** When the app sends SmartLead a campaign's email steps, SmartLead replaces every step it already had. A second call with only the B versions would wipe out the A versions. SmartLead's own A/B feature works differently: each step carries a list of versions (A and B) inside one call, and SmartLead splits the sends 50/50. I will send **one call**, with A and B together in each step. Steps with only A are sent the same way as today.
2. **Campaign ID type.** The campaign list's ID is text (like "3392518"), not a UUID. The new table will link to it as text so the link works.

## Unsubscribe check gap (outside the editor — your choice)
The lead-push gate and the green/red shield read every version of a step as one block of text. So if A has `{{unsubscribe}}` and B doesn't, they would wrongly say "OK". The editor itself will check each version on its own and block Launch, so campaigns built in this app are safe. But a B edited later inside SmartLead could slip past. Fixing this means a small change in two places the brief said not to touch: the push job and the shield check. **I'll leave them alone unless you say yes.** Recommended: yes, as an extra Phase 4.

## Phases
**Phase 1 — table (1 turn).** New `sequence_variants` table: campaign ID (text), step number, label A/B (only those two allowed), subject, body, delay in days, created time. Staff-only, the same rule as the campaign list. One row per campaign, step, and label.

**Phase 2 — editor screen (1–2 turns).** In NewCampaignDrawer only:
- A tab bar above each step: "Variant A", then "+ Add Variant B".
- B gets its own subject and body. It shares the step's delay, because SmartLead uses one delay per step.
- A "Remove Variant B" link.
- The unsubscribe warning and hint show on each version. Launch is blocked, with the existing toast, if any A or B is missing the tag. Saving a draft is never blocked.

**Phase 3 — sending and saving (1 turn).**
- One call with all steps. A step with a B sends both versions with a 50/50 split.
- After that succeeds, save all versions to the new table.
- If saving the local copy fails, show a warning. The campaign itself is not undone.
- Tests: a step with no B is sent the same as today; a missing tag in B blocks Launch.

**Phase 4 (optional, needs your yes).** Make the push gate and the shield check each version on its own.

## Do not touch
AnalyticsPanel, ReplyTriagePanel, OutreachQueuePanel, other panels. The "START" status value. The negative tracking flags.

## Open items carried over
- The SmartLead key is invalid. Nothing can actually be created in SmartLead until you send a fresh key.
- Mailboxes Phases 2–4 are waiting.
- The unsubscribe job's timer and "Last sync" line are waiting.
