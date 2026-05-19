# Neuron Garage — Locked Plan (revised May 19, 2026)

> Plan changes go in this doc FIRST, then code. Approve to execute Phase 1a + Phase 1. Phase 2 and 3 are sequenced but await separate go-ahead.

---

## Mental model (unchanged)

```
City Search  →  Teacher Search  →  Email Outreach (cockpit)  →  Candidate Pipeline
```

- Email screen = cockpit. SmartLead is the engine (sends, warmup, deliverability).
- City lists never go straight to Email. "Promote list" = pre-filter Teacher Search.
- Test campaigns are the one exception — temp-email CSV bypasses City + Teacher on purpose.

---

## Phase 1a — Strip mock data from Email screen (~30 min) [DO FIRST]

**Why first:** Once Phase 1 lands and real numbers start flowing, mock numbers next to real ones cause exactly the contamination the user flagged.

**Remove:**
- 6 hardcoded prospects (Emily Rogers, Jason Miller, etc.) in the prospects panel
- "Prospects in Outreach: 1,248" stat tile
- "Interested Leads: 58" stat tile
- Hardcoded High / Med / Low fit-score badges next to fake prospects
- "Recommended Next Step" suggestion card (hardcoded text)

**Replace with empty states:**
- Prospects panel: "No prospects yet — import leads to get started"
- Stat tiles: "0" with subtle helper text "no live data yet"
- Suggestion card: hidden until there are >0 real campaigns

**Keep untouched (already real):** SmartLead Connection, Campaigns list, Inbox, Analytics, Email Accounts panels.

---

## Phase 1 — Email cockpit: write actions + test mode (~2–3 hours)

1. **NewCampaignDrawer additions** (file already exists):
   - **🧪 Test Mode toggle** at top of step 1. When ON:
     - Yellow banner "Test Mode — sends only to your inbox"
     - Recipient = logged-in user's email (from `auth.users.email`)
     - Override field "Or send test to:" — paste a Gmail+alias or mailinator
     - FROM address unchanged (still the SmartLead mailbox)
   - **Daily send cap** field on step 2 (default 50/mailbox/day, hard cap 200).
   - **Launch button** on step 4 — currently only "Create in SmartLead". Add "Create & Launch" which calls SmartLead `/campaigns/{id}/status` → `START`.

2. **Campaign card actions** in SmartLeadCampaignsPanel:
   - Launch / Pause / Stop buttons → SmartLead status API.
   - Persistent "🧪 Test Mode" badge until toggled off.

3. **CSV test-leads upload path** in ImportLeadsWizard:
   - New top option "Upload test leads (CSV)" alongside existing "Import from Teacher Search".
   - Accepts `email, first_name, last_name`. Pushes directly to SmartLead leads endpoint.
   - Used until real teachers exist. Same flow handles real teachers later — zero rework.

4. **End-to-end demo loop (the proof Kaylie wants):**
   - Upload 5 Gmail+alias test emails → Launch in Test Mode → first email sends → reply from one alias → reply lands in Inbox panel → intent classifier tags HOT → click Promote to Pipeline → fake "teacher" appears in Candidate Pipeline kanban.

---

## Phase 2 — Multiple named favorites lists in City Search (~2–3 hours) [after Phase 1 demo]

**Locked UI decisions:**
- ⭐ button on city row → popover with checkboxes for each list + "➕ New list" row.
- **Left rail** inside City Search page lists all watchlists with counts.
- Per-list action **"Find teachers in these cities"** → jumps to Teacher Search pre-filtered (does NOT bypass Teachers, does NOT pipe straight to Email).

**Schema:**
- New `watchlists` table: `id, user_id, name, created_at`.
- Add `watchlist_id` column to `watchlist_items`.
- Migrate existing rows into a default list named "My watchlist".

---

## Phase 3 — AI on Email screen (~3–4 hours) [after Phase 2]

1. **AI email body personalization** — per-teacher first sentence via `google/gemini-2.5-flash` (Lovable AI Gateway, no key needed). Fallback to generic line if data missing.
2. **AI reply-intent classifier upgrade** — replace keyword regex with `gemini-2.5-flash-lite`. Catches "we already have a vendor" → NOT_INTERESTED, "circle back in fall" → NEUTRAL, etc.

---

## Phase 4 — BLOCKED on Brett (not our move)
- Pick teacher data source (Apollo / CSV / Apify / DonorsChoose).
- Seed `teacher_prospects_master` with first 100–500 Austin teachers.
- Switch test campaigns over to real teachers. Same UI, same flow.

---

## Parked in LATER.md (will not build now)
- Metro/county backfill for ~634 remaining cities (cosmetic, do day before demo).
- Reply-intent override UI (needs real reply volume).
- Suppression list viewer (needs real bounces).
- Save campaign as template (needs 3–4 real campaigns first).
- Share watchlist with other users.
- AI "Suggest next campaign" recommender.

---

## Execution order on approval

1. Phase 1a — strip mock data (30 min)
2. Phase 1 — test mode + daily cap + CSV test leads + launch button (~2–3 hr)
3. **STOP. Run end-to-end demo with Haseeb's temp emails. Confirm it works.**
4. Phase 2 — named favorites lists (separate go-ahead)
5. Phase 3 — AI on Email screen (separate go-ahead)

## Doc updates after Phase 1a + 1 ship (Mode A — drafts, await "go")
- `PROJECT_CONTEXT.md` — Email screen now writes (create/launch/pause campaigns); mock data removed; Test Mode + daily cap added.
- `HOW_IT_WORKS.md` — new "Test Mode" section explaining TO swap, FROM unchanged, override field, CSV test path.
- `OPEN_TASKS.md` — mark 11h (mock-data strip) and 11i (test-mode launch) ✅; add Phase 2 + 3 as upcoming.
- `GLOSSARY.md` — add "Test Mode", "Test leads CSV", "Daily send cap".

---

## Technical notes (for the agent)

- Test Mode TO swap happens **before** the SmartLead `/leads` upload call — we replace the lead list with `[{ email: profile.email }]` (or the override).
- Daily cap maps to SmartLead `max_new_leads_per_day` in `/campaigns/{id}/schedule`.
- Launch = POST `/campaigns/{id}/status` with body `{ status: "START" }`.
- CSV test-leads path uses the existing `/campaigns/{id}/leads` endpoint — no new edge function.
- Mock data lives entirely in component-local arrays inside `EmailOutreach.tsx` / `EmailOutreachV2.tsx` and child panel files. No DB rows to delete.
- Phase 2 migration: `CREATE TABLE watchlists` + `ALTER TABLE watchlist_items ADD COLUMN watchlist_id` + backfill default list per user.
