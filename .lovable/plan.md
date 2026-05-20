## What you're seeing vs what I shipped — root cause

You're right on every point. Here's what actually broke the demo:

### 1. The Inbox panel is not on screen — it was never mounted
`SmartLeadInboxPanel.tsx` was built and styled, but `EmailOutreachV2.tsx` only renders Connection, Campaigns, Analytics, Accounts, Queue and Batches panels. The Inbox was never added to the page. That's why none of the per-card chips, override dropdowns or "why" reasons are visible — the component exists in the repo but is not rendered anywhere.

### 2. The chip "tooltip" uses the browser's native `title=""` attribute
Native `title` tooltips: appear after a ~1.5s delay, get clipped, don't show on touch, and many users never see them. I should have used the shadcn `<Tooltip>` component (already in the project) like every other hover hint in the app.

### 3. Adra Valentine has no reply yet → no chip → row looks identical to before
Current logic: chip + Promote button only render *after* a reply arrives and is classified. For Adra (sent, no reply), the row shows just `sent` — same as the old UI. There's no visible signal that the classifier is even wired up, so it looks like nothing changed.

### 4. Who set the category (AI Gemini vs manual) is hidden
`reply_intent_overridden_by` is stored but only mentioned inside the native tooltip. No visible badge.

### 5. The queue table is the wrong shape for decision-heavy work
Agreed. A 6-column table with a `…` menu hiding 11 actions is hostile UX. Each row is actually a small workflow (review reply → choose category → promote / snooze / suppress). A focused **Reply Triage** view is the right home for that.

---

## Fix plan (UI-only, no schema changes)

### A. Mount the Inbox panel (1-line bug fix)
Add `<SmartLeadInboxPanel />` to `EmailOutreachV2.tsx` directly above `OutreachQueuePanel`. That alone makes the inbox cards, chips, override dropdowns and "why: …" reasons visible.

### B. Replace native tooltips with shadcn `<Tooltip>`
In both `OutreachQueuePanel` and `SmartLeadInboxPanel`:
- Wrap each category chip in `<TooltipProvider><Tooltip><TooltipTrigger>…</TooltipTrigger><TooltipContent>` with structured rows:
  - **Category** — Soft no / defer
  - **Confidence** — 80% (progress bar)
  - **Set by** — AI · gemini-2.5-flash-lite  *or*  Manual · you · 2 min ago
  - **Reason** — "defer / soft-no phrasing"
  - **Original reply** — first ~120 chars italic
- 200ms open delay, always visible cursor pointer on the chip.

### C. Visible AI vs Manual attribution badge
Next to each category chip add a tiny pill:
- `AI` (sparkle icon, slate) when `reply_intent_overridden_by IS NULL`
- `Manual` (user icon, blue) when overridden — also shows who, on hover

### D. Always show a category cell — even with no reply
Replace the "no chip when no reply" gap with explicit pre-reply states so every row tells a story:
- `sent` + no reply, < 3 days → chip `⏳ Awaiting reply` (slate)
- `sent` + no reply, ≥ 3 days → chip `⏳ No reply yet · day N` (slate)
- `failed` → chip `⚠ Push failed` (red) — already partially shown
- Reply present → existing 7-bucket chip
- `snoozed` → chip `💤 Snoozed until <date>`
- `promoted` → chip `✅ Promoted to Pipeline`

For Adra's row this means you'll see `sent` + `⏳ Awaiting reply` immediately — proof the system is live, even before she replies.

### E. Rename the table and add a "Reply Triage" view (the bigger fix)
The queue table stays for ops (push / fail / reassign). Add a second view toggle inside the Outreach section:

```text
[ Outreach Queue ]  [ Reply Triage  · 4 need action ]
```

**Reply Triage** is a card list, not a table — one card per replied lead:
```text
┌────────────────────────────────────────────────────┐
│ Adra Valentine · adra@school.org                   │
│ [SOFT NO 80%] [AI · gemini-2.5-flash-lite]         │
│ "Thanks but I'm not available this summer…"        │
│ why: defer / soft-no phrasing                      │
│ ─────────────────────────────────────────────────  │
│ [Snooze 6mo] [Snooze 3mo] [Suppress]               │
│ Override → [Interested ▾] (changes available acts) │
└────────────────────────────────────────────────────┘
```
Rules:
- Card surfaces only the actions that make sense for that category (Promote only on Interested/Meeting; Snooze only on Soft-no/Info; etc.) — no hidden `…` menu.
- Sort: needs-action first (Info request, low-confidence), then auto-promotable, then handled.
- Filter chips at top: All · Needs reply · Auto-promotable · Snoozed · Suppressed.

The existing `…` menu in the Queue table stays as a power-user escape hatch but stops being the primary surface.

### F. Small queue-table polish
- Add a permanent "Reply" column showing chip + AI/Manual badge (so it's visible without hover).
- Right-align the action column and give Promote a green pill so it stands out from `Push`.
- Tooltip on the `…` button: "More actions" (currently has no hint).

---

## Out of scope (intentionally)
- No DB migrations — `reply_intent_overridden_by` already exists.
- No webhook / classifier changes.
- No new Smartlead calls.
- Candidate Pipeline UI is untouched.

## Files I'll touch
- `src/pages/EmailOutreachV2.tsx` — mount Inbox panel
- `src/components/email-outreach/SmartLeadInboxPanel.tsx` — real Tooltip, AI/Manual badge
- `src/components/email-outreach/OutreachQueuePanel.tsx` — real Tooltip, AI/Manual badge, "Awaiting reply" chip, Reply Triage view toggle, Reply column
- (new) `src/components/email-outreach/ReplyTriagePanel.tsx` — card-list view for reply-bearing rows

## Answers to your direct questions
- **Who set Adra's status?** Currently nobody — she has no reply yet, so no classifier ran. After the fix you'll see `⏳ Awaiting reply`. Once a reply lands, the chip will show `AI · gemini-2.5-flash-lite` (or `Manual · <you>` if you override).
- **Where is the tooltip?** It exists as a native `title=""` only — that's why it's invisible. Plan B replaces it with a real hover card.
- **Inbox panel changes you can't see?** Because the panel isn't mounted. Plan A fixes that with one import + one JSX line.
- **Is the queue table the right UI?** No, not for reply triage. Plan E splits it into Queue (ops) + Reply Triage (decisions) without losing anything.

Confirm and I'll implement A→F in one pass.