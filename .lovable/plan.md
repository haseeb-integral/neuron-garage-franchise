## Why "reply = promote" is wrong (you're right)

A reply is just *attention*, not *intent*. Real-world reply mix on cold outreach is roughly:

```text
~45%  Not interested / hard no
~20%  OOO / auto-reply
~15%  Soft no — "not now", "not this summer", "maybe next year", "wrong role"
~10%  Info request — "what does it cost?", "send me details"
~7%   Meeting request — "let's talk", "book a time"
~3%   Hot yes — "I'm interested, where do I sign"
```

Your example — *"I'm not available for the summer camp"* — is the **soft-no / defer** bucket. Promoting it to the Candidate Pipeline would pollute Kanban and waste Kaylie's time.

---

## What mature tools actually do (refreshed scan)

- **Smartlead** ships a built-in **Lead Category** system on every reply: `Interested`, `Meeting Request`, `Information Request`, `Not Interested`, `Do Not Contact`, `Wrong Person`, `Out of Office`. It uses an internal AI classifier; user can override the category from the inbox.
- **Apollo / Outreach.io / lemlist / Reply.io** all converged on the same 6–8 buckets, and **only `Interested` + `Meeting Request` auto-advance** to a CRM stage. `Information Request` flags for a manual human reply (not a promotion). Everything else is logged + the lead is paused from further sequence sends.
- **StackOverflow / sales-eng threads** consistently warn: never auto-promote on raw `EMAIL_REPLIED`. The #1 reported regression is OOO replies creating fake pipeline entries.

So the right model is **classify-then-route**, not **reply-then-promote**.

---

## Revised classifier (replaces today's 4-bucket `reply_intent`)

Today `smartlead-webhook` tags one of: `HOT | NOT_INTERESTED | OOO | NEUTRAL`. That's too coarse — your summer-camp example collapses into `NEUTRAL` and would look "promotable" in the UI.

New 7-bucket taxonomy (mirrors Smartlead's, so we can later swap to their AI category if we want):

| Bucket | Meaning | What the UI does |
|---|---|---|
| `INTERESTED` | "Yes, tell me more", "I'd like to learn" | 🟢 Show **Promote to Pipeline** button (one-click) |
| `MEETING_REQUEST` | "Let's book a call", "send a calendar" | 🟢 Show **Promote + Schedule** (promote and tag `needs_meeting`) |
| `INFO_REQUEST` | "What's the cost?", "where are you located?" | 🟡 Show **Reply Needed** chip — does NOT promote; opens reply composer |
| `SOFT_NO` | "Not this summer", "not now", "maybe next year", "wrong timing" | 🟠 **Snooze** action (e.g. 6 months) + remove from sequence; never promote |
| `WRONG_PERSON` | "I don't handle this", "talk to X" | 🟠 **Suppress + capture forwarded contact** field; never promote |
| `NOT_INTERESTED` | "No thanks", "remove me", "stop" | 🔴 Auto-suppress, remove from all sequences, never promote |
| `OOO` | Auto-reply, "out until…" | ⚪ Ignore; re-deliver next email after the OOO date if parseable |

`NEUTRAL` is **gone** — every reply must land in exactly one bucket. If the classifier is unsure, it returns `INFO_REQUEST` (safest: forces a human read) with a `confidence < 0.6` flag.

### How to classify

Two-tier, cheap-first:

1. **Keyword + regex pre-pass** (current code, expanded). Catches OOO, hard NOT_INTERESTED, obvious INTERESTED. ~60% of replies, zero cost, ~30ms.
2. **Lovable AI fallback** (`google/gemini-2.5-flash-lite`, ~$0.0001/call) for the remaining 40%. Prompt:
   > *"Classify this reply to a franchise-recruiting cold email into exactly one of: INTERESTED, MEETING_REQUEST, INFO_REQUEST, SOFT_NO, WRONG_PERSON, NOT_INTERESTED, OOO. Return JSON {category, confidence 0-1, one_line_reason}. Reply text: …"*

Both write to `smartlead_events.reply_intent` + a new `reply_intent_reason` text column + `reply_intent_confidence` numeric. **Sam can override** the category from the Inbox panel; override is logged.

---

## Revised promotion rule

Auto-promotion candidates = ONLY rows whose latest reply event has:
```
reply_intent ∈ {INTERESTED, MEETING_REQUEST}
AND reply_intent_confidence ≥ 0.7
AND lead is not suppressed/bounced
```

Everything else needs an **explicit human action** from the Inbox or queue row:

- `INFO_REQUEST` → **Reply Needed** action (open composer, do NOT promote)
- `SOFT_NO` → **Snooze 6mo** action (parks the row, drops from active outreach)
- `WRONG_PERSON` → **Capture referral** action (free-text field for the suggested contact)
- `NOT_INTERESTED` / OOO → no action needed, system handles

A **manual `Promote` override** is always available on any row (per Sam's "show the math, let the human decide" rule) and is logged with reason.

---

## Revised UI additions on the Email screen

Replaces section "UI additions" in the previous plan. All four items remain, but #3 is rewritten:

1. **Campaign status badge** on each queue row — unchanged.
2. **Per-lead lifecycle chip** — unchanged, but the chip now shows the *category* on reply: `Replied · INFO_REQUEST` not just `Replied`.
3. **Action depends on category** (new):

```text
INTERESTED       →  [ 🟢 Promote to Pipeline ]
MEETING_REQUEST  →  [ 🟢 Promote + Schedule ]
INFO_REQUEST     →  [ ✉ Reply Needed ]      ← opens composer, no promote
SOFT_NO          →  [ ⏸ Snooze 6mo ]
WRONG_PERSON     →  [ ↪ Capture referral ]
NOT_INTERESTED   →  [ ✓ Suppressed ]  (read-only)
OOO              →  [ ⟳ Will retry after <date> ]  (read-only)
```
   Plus a small `⋯` menu on every row with **"Override category"** + **"Manual promote"** for the human-in-the-loop case.

4. **"View row →" deep link** from Inbox panel — unchanged.

---

## Data / code impact (revised)

- **Migration** (small): add `reply_intent_reason text`, `reply_intent_confidence numeric` to `smartlead_events`. Backfill existing rows to `NEUTRAL → INFO_REQUEST` with confidence 0.3 so nothing auto-promotes retroactively.
- **`smartlead-webhook` edge fn**: expand keyword pass to 7 buckets, add AI fallback via Lovable AI Gateway (`LOVABLE_API_KEY` already present). Store reason + confidence.
- **`SmartLeadInboxPanel`**: render new chips; add per-row "Override category" dropdown.
- **`OutreachQueuePanel`**: per-category action button matrix (item #3 above).
- **`candidates` insertion** stays the same — just gated on the new rule.
- No change to `outreach_queue` schema; we add a `state = 'snoozed'` value (already free-form text column, no migration needed) and a sibling `snoozed_until timestamptz` (small migration).

Estimated build: ~1.5 sessions instead of 1. Worth it — kills the false-promotion failure mode entirely.

---

## Answer to your direct question

> *"What if a teacher replies 'I'm not available for the summer camp'? Reply alone is a false indicator."*

Correct. Under the revised plan, that reply classifies as `SOFT_NO` (regex `not (available|free|interested) (this|for|in)? (summer|fall|spring|year|season)` + AI fallback confirms). The row:
- shows chip `Replied · SOFT_NO`
- offers `⏸ Snooze 6mo` as the primary action
- never reaches the Promote button
- is removed from active sequence (Smartlead auto-pauses on reply anyway)
- can be re-surfaced by the snooze timer or by Sam manually

No pipeline pollution. No wasted Kanban entries.

---

## Lock status

Plan is **locked pending your sign-off** on:

1. The 7-bucket taxonomy above (add/remove/rename any bucket).
2. The auto-promote rule: `INTERESTED + MEETING_REQUEST` only, confidence ≥ 0.7.
3. Manual `Promote` override always available — yes/no.
4. Use Lovable AI (`gemini-2.5-flash-lite`) for the classifier fallback — yes/no.
5. Add the small `smartlead_events` columns + `snoozed_until` field — yes/no.

Reply with edits / "go" and I'll write the implementation plan against this. Docs (`PROJECT_CONTEXT`, `HOW_IT_WORKS`, `OPEN_TASKS`, `GLOSSARY` for the 7 categories) drafted only after your "go".
