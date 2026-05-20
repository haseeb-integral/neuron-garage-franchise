# Email Outreach — Unified Workflow Redesign

## Short answer to your question

**You are right.** The current screen is confusing for 3 concrete reasons:

1. **Reverse flow.** A user reads top→down, but the actions live bottom→up: Stats → Campaigns → **Inbox** → **Triage** → **Queue (⋯ menu)** → Batches. The decision/action panels are buried at the bottom; the menu that changes a row's state is the *last* thing visible.
2. **Hidden state changes.** "Manual override" hides inside a `⋯` dropdown on a queue row. Standard SaaS pattern (Apollo, Instantly, Lemlist, SmartLead itself) puts state actions on a **detail drawer** opened by clicking the row, not in a kebab menu.
3. **Redundant panels per tab.** Inbox, Triage, Queue, Batches render under *every* tab (Dashboard / Analytics / Accounts). Tabs are meaningless if the content below them never changes.

This violates the standard "one screen = one job" rule (Linear, Front, Missive, Superhuman, HubSpot Sequences all follow it).

---

## Proposed structure — single-screen, workflow-ordered

Remove the 3 tabs. Replace with **one stacked workflow**, top→down matching how work actually flows:

```text
┌─────────────────────────────────────────────────────────┐
│ Header: title · last-updated · [Refresh][Import][+ Campaign] │
├─────────────────────────────────────────────────────────┤
│ Stat strip (6 cards) — unchanged                        │
├─────────────────────────────────────────────────────────┤
│ SECTION 1 · ACT ON REPLIES   ← do this first every day  │
│   • Reply Triage (Interested / Question / Not now / OOO)│
│   • Each row → click opens Detail Drawer with:          │
│       - full thread                                     │
│       - AI category + confidence + "why"                │
│       - one-click: Promote / Reject / Snooze / Override │
├─────────────────────────────────────────────────────────┤
│ SECTION 2 · CAMPAIGNS & SENDING                         │
│   • Campaigns list (existing SmartLeadCampaignsPanel)   │
│   • Outreach Queue (collapsed by default, expand to see │
│     send status; ⋯ menu removed — use row→drawer)       │
├─────────────────────────────────────────────────────────┤
│ SECTION 3 · DATA & SETUP   (collapsed by default)       │
│   • Import Batches                                      │
│   • Email Accounts                                      │
│   • SmartLead Connection                                │
│   • Full Analytics (the old "Analytics" tab content)    │
└─────────────────────────────────────────────────────────┘
```

**Why this works**
- Top of screen = most urgent (replies needing your decision).
- Middle = active work (campaigns sending).
- Bottom = setup/reference (rarely touched after day 1).
- One detail drawer pattern for *all* state changes — no hidden kebab menus.
- Inbox is **removed as a top-level panel** — its content is already inside Reply Triage (every reply is a triage row). The raw inbox stays accessible via a "View raw inbox" link in Section 1's header for the rare case you need it.

---

## Section labels + collapse (the "optional polish" you asked to bundle)

- Each section has a bold label header: `1 · ACT ON REPLIES`, `2 · CAMPAIGNS & SENDING`, `3 · DATA & SETUP`.
- Each panel header has a chevron to collapse/expand.
- Collapse state persists in `localStorage` per-user.
- Sections 1 and 2 default open; Section 3 defaults collapsed.

---

## How to QA AI reply scoring without real teacher replies

You can't wait for real replies, so add a dev-only "Simulate Reply" tool:

- New button in Reply Triage header (visible only when `import.meta.env.DEV` or for your 3 admin emails): **"Simulate Reply"**.
- Opens a small form: pick a queue row (any sent email), paste reply text, click **Score**.
- Inserts a synthetic row into the triage table marked `source: "simulated"` with a small "TEST" badge so it never gets confused with real data.
- Runs the same AI classifier the real path uses → you see category, confidence, and reasoning immediately.
- A "Clear all simulated" button wipes them in one click.

This lets you verify the AI scoring end-to-end today without any teacher ever replying.

---

## Implementation steps (frontend-only, no schema changes)

1. **`EmailOutreachV2.tsx`**: delete the 3-tab switcher; render the 3 sections in order; move Inbox/Triage/Queue/Batches/Accounts/Analytics/Connection into their right section.
2. **New `<Section>` wrapper component**: label header + collapse chevron + localStorage key.
3. **`OutreachQueuePanel`**: remove the `⋯` dropdown; clicking a row opens a new `QueueRowDrawer` with the same actions (Manual Promote, Status Override, View Email) as buttons.
4. **`ReplyTriagePanel`**: same — row click opens detail drawer with Promote/Reject/Snooze/Override.
5. **Remove `SmartLeadInboxPanel`** from the page; add a "View raw inbox" link in Triage header that opens it as a drawer when clicked.
6. **New `SimulateReplyDialog`**: dev/admin-only, posts to the existing classify edge function, inserts row with `source = "simulated"`.

No backend, no DB migrations, no SmartLead changes. Pure UI consolidation.

---

## What you'll see after

- One screen, top-to-bottom = your daily workflow.
- No tabs, no redundancy, no hidden menus.
- Click any row to act on it (standard pattern).
- A "Simulate Reply" button so you can verify AI scoring today.

## Questions before I build

1. Inbox panel — agree to remove it from main scroll and only show via "View raw inbox" link? Or keep it as its own collapsed panel in Section 1?
2. Simulate Reply — restrict to dev build only, or also enabled in production for your 3 emails (kaylie / sam / haseeb)?
