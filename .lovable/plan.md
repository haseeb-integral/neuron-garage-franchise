## Why this plan exists

Two issues you raised:

1. **Email screen status was never written down.** We have ~10 chat turns of decisions (Phase 1a mock-data strip, test mode, inbox picker, daily cap, AI personalization, end-to-end test loop, open-rate Gmail-proxy caveat, missing unsubscribe link, real-send checklist) — none of it is in `OPEN_TASKS.md` / `PROJECT_CONTEXT.md` / `HOW_IT_WORKS.md`. Only the high-level "Phase 1–5 SmartLead complete" line exists.
2. **The "locked plan" you approved (Phases 1a → 4 covering Email + multi-list favorites + AI on email + Brett-blocked teacher seed) was never committed to md.** That's why I keep "forgetting" Phase 2 (multiple named favorites lists) and the AI-on-email items — they only live in chat. Once written down, every future session reads them on load.

And: the city-screen recent work (Ask AI absolute-weights, metro backfill 326/960, legacy table drop, Add City rewire) **was** committed to md on May 19 (verified in `PROJECT_CONTEXT.md` line 3 and `OPEN_TASKS.md` items 11f / 11g / B5). So city docs are current — only Email is behind.

---

## What I'll write (no code changes — docs only)

### 1. `OPEN_TASKS.md` — add Email Outreach section after Task 21

New entries, all dated May 19, marked done or pending:

- ✅ **17a. Strip hardcoded mock data from Email screen** (May 19) — 6 prospects, "1,248 prospects", "58 interested leads", fit badges, "Recommended Next Step" card all removed; stats now read from live SmartLead.
- ✅ **17b. NewCampaignDrawer + Test Mode toggle** (May 19) — Launch from inside app; test mode swaps recipient list to logged-in user's email + override field; `[TEST]` prefix on campaign name.
- ✅ **17c. Auto-generated default campaign name** (May 19) — `Outreach · MMM-DD · HH:mm TZ · vN` via localStorage seq; `min_time_btw_emails` floor of 3 enforced.
- ✅ **17d. Inbox picker on campaign create** (May 19) — user selects which connected mailboxes the campaign sends from; "All / None" toggles; helper text on per-inbox parallel vs single-inbox sequential vs ~10–15 min SmartLead polling.
- ✅ **17e. End-to-end test loop proven** (May 19) — Gmail +alias CSV → Import Wizard → SmartLead → send → reply → Inbox classifier → manual Promote to Pipeline. Reply detection ✅, Pause/Resume/Stop ✅.
- 🔴 **17f. Add `{{unsubscribe}}` to default sequence body** — `NewCampaignDrawer.tsx` lines ~125 & ~141. **Blocker for real (non-test) sends — CAN-SPAM requirement.** ~5 min edit.
- 🟡 **17g. Open Rate tooltip** — explain Gmail image-proxy / Apple MPP inflation so Kaylie doesn't over-trust open rate. Trust clicks + replies. ~15 min.
- 🟡 **17h. Import Leads CSV end-to-end test** — paused; resume after 17f.
- 🟡 **17i. Real (non-test) 1-lead launch** — paused; resume after 17f.
- 🟡 **17j. AI email body personalization per lead** — Lovable AI Gateway, `google/gemini-2.5-flash`, template uses `{first_name}`, `{school}`, `{subject}`, `{years_experience}`. ~3–4 hrs.
- 🟡 **17k. AI reply-intent classifier** — replace keyword regex with `gemini-2.5-flash-lite`. Better OOO + multi-language. ~1–2 hrs.

Also surface **Task 9 (multiple named favorites lists / "campaign list" on City Search)** back into OPEN_TASKS with the agreed UI:
- **9.** ⭐ button on city row → popover with checkboxes + "➕ New list". Left rail inside City Search. "Promote list" = jump to Teacher Search pre-filtered by those cities (does NOT bypass the natural City → Teacher → Email flow). New `watchlists` table + `watchlist_id` on `watchlist_items`. Migrate existing rows into "My watchlist". ~2–3 hrs.

### 2. `LATER.md` — append deferred email items

- **Reply-intent manual override button** (needs real reply volume)
- **Suppression list viewer** (needs bounces/unsubscribes accumulating)
- **Save campaign as template** (premature until 3+ campaigns exist)
- **"Suggest next campaign" AI** (needs winning-subject-line history)
- **Daily send cap UI** (SmartLead already enforces per-mailbox warmup; add only if Kaylie wants belt-and-suspenders)

### 3. `PROJECT_CONTEXT.md` — § 5 Known bugs / incomplete

Update the Email Outreach line from:
> Still needs Teacher Search → Import Wizard handoff before daily use.

to:
> Functional end-to-end via Gmail +alias test loop (May 19). **Blockers before real teacher sends:** (a) add `{{unsubscribe}}` to default sequence body, (b) Import Leads CSV end-to-end test, (c) 1-lead real launch. Still needs Teacher Search → Import Wizard handoff for daily use (blocked on Brett teacher-source decision).

Also update snapshot date to May 19, 2026 (test-loop addendum).

### 4. `HOW_IT_WORKS.md` — Email Outreach section

Add a new subsection documenting:
- Test Mode behavior (TO swap, FROM unchanged, `[TEST]` prefix, override field)
- Inbox picker semantics (per-inbox parallel, single-inbox sequential, ~10–15 min SmartLead polling delay between cron tick and actual send)
- Open-rate caveat (Gmail image proxy / Apple MPP inflates opens to ~100%; trust clicks + replies)
- Reply → Inbox → Promote to Pipeline flow

### 5. Doc-sync rule reinforcement

After this write, **the "locked plan" lives in OPEN_TASKS.md, not chat**. Future sessions will read it on load and won't drop Phase 2 or AI features again.

---

## What I will NOT do in this plan

- No code changes. Specifically **not** adding `{{unsubscribe}}` yet — that's task 17f, separate approval.
- Not touching city-screen docs (already current as of May 19).
- Not editing `MAY15_MEETING_NOTES.md` (frozen).

---

## Files touched

- `OPEN_TASKS.md` (add 17a–17k + restore Task 9 to City Search Pending)
- `LATER.md` (append 5 deferred email items)
- `PROJECT_CONTEXT.md` (§ 5 email line + snapshot date)
- `HOW_IT_WORKS.md` (new Email Outreach subsection)

Per `AGENTS.md` Rule 9 (Doc sync), I'll show the one-line diff summary for each before writing, and wait for your "go" — but since you've already said "document all things to md files," I'll treat this plan approval **as** the go.
