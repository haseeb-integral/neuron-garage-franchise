
# Step 2 — Global "Neuron AI" assistant (v1)

Confirmed inputs from you:
- **Button placement:** inline next to the sidebar collapse arrow (top-left of the sidebar header). Visible whether the sidebar is expanded or collapsed.
- **First open:** ChatGPT-style welcome — short greeting + a list of slash commands the user can click.
- **Action scope:** reads, navigations, filter/weight changes, and cheap writes behind a Confirm preview. NO multi-step plans, NO deep-reasoning model, NO charts/images. (Locked from the previous plan.)
- **Knowledge brain reviewer:** Haseeb now; Brett later.
- **City Search Ask AI bar:** stays for ~2 weeks alongside Global, then retired.

---

## What gets built

### 1. The button (top-left, next to the collapse arrow)
Small sparkle pill labeled **"Neuron AI"** with the ⌘K hint. Lives inside `AppSidebar.tsx` next to the existing collapse chevron. When the sidebar is collapsed (icon-only mode), the button shrinks to just the sparkle icon. Clicking it opens the assistant panel. Keyboard shortcut **⌘K / Ctrl+K** opens it from anywhere.

### 2. The assistant panel (right-side slide-in sheet)
460px wide on desktop, full-screen on mobile. Built on the existing `Sheet` component (same pattern as the User's Guide `AiAssistant`).

**On first open — ChatGPT-style welcome:**
> 👋 Hi, I'm Neuron AI. I can help you across the whole app.
>
> **Try one of these:**
> - `/find` — find cities, teachers, or candidates
> - `/why` — explain a score or a tier
> - `/explain` — walk me through a feature
> - `/add` — add to watchlist or a campaign
> - `/stage` — change a candidate's pipeline stage
>
> Or just type your question.

The slash commands aren't required — they're discoverability. The user can also type freeform. Clicking a slash chip pre-fills the input.

**On every turn the assistant knows:**
- The current route (`/city-scoring`, `/teacher-search`, etc.)
- The current screen's state (filters, selected row, visible counts) via a tiny `getScreenContext()` hook each page registers
- The signed-in user + their role (admin / manager / viewer)

**Three response modes:**
1. **Answer** — factual / explainer. Pure read, no side effects.
2. **Navigate + apply state** — "OK, going to City Search and filtering Tier A in Texas." Routes + applies state. Shows a one-line summary of what was applied.
3. **Propose action** — for writes. Shows a preview card with what will happen, a **Confirm** button, and a **Cancel** button. Nothing writes until Confirm. Allowed v1 writes: add/remove from city watchlist, change candidate pipeline stage, queue an email send.

**Clarifying questions:** when the AI can't tell what you meant (e.g. "find Frisco" — Texas or Colorado?), it asks one short follow-up with 2-3 chip suggestions instead of guessing.

### 3. The knowledge brain
New file `supabase/functions/_shared/appKnowledge.ts` loaded by the assistant on every call. Plain prose, small (~4 KB), human-readable so Brett can review it without TypeScript knowledge. Contents:
- **App purpose:** what Neuron Garage is, who it's for
- **The 4 main screens:** City Search, Teacher Search, Email Outreach, Candidate Pipeline — what each does, what data it reads, what actions it offers
- **People:** Sam (data/scoring owner), Kaylie (ops), Brett (product lead, approver), Haseeb (engineering lead, approver)
- **Glossary:** Tier A–D, TAM Teachers, Demand, Competitive Opportunity, the 12 sub-metrics
- **Data sources:** what's live (Census, NCES, BLS, BEA, Apify, Smartlead), what's stub
- **Hard limits:** no scoring math changes, no destructive deletes, no auth changes, no cross-user data exposure

I'll draft this; you review; Brett re-reviews on his next pass.

### 4. The edge functions
- **`supabase/functions/neuron-ai/index.ts`** — main assistant call. Uses `google/gemini-3-flash-preview` (cheap, fast, good enough). Tools: `answer`, `navigate_and_apply`, `propose_action`, `clarify`. For `propose_action`, returns a preview object only — no DB write.
- **`supabase/functions/neuron-ai-confirm/index.ts`** — executes a previously-previewed action after the user clicks Confirm. Writes the row + appends to `ai_action_log`. Role-gated server-side.

### 5. Database (one migration)
- `ai_action_log (id, user_id, route, action_type, payload jsonb, status, error, created_at)` — RLS: users see only their own rows; admins see all.
- `ai_threads (id, user_id, route_at_start, created_at, last_message_at)` + `ai_thread_messages (id, thread_id, role, content, created_at)` — for cross-screen thread persistence; RLS user-scoped.

### 6. Per-page screen-context hooks
Each of the 4 main pages exposes a tiny `useNeuronAiContext()` that returns the page's current filters + selected row + counts. The global assistant reads this so it always has accurate context. No behavior change to those pages.

---

## Files

**New:**
- `src/components/neuron-ai/NeuronAiButton.tsx` — the sidebar pill button
- `src/components/neuron-ai/NeuronAiPanel.tsx` — the slide-in chat panel (welcome + slash commands + message thread + confirm cards)
- `src/components/neuron-ai/NeuronAiProvider.tsx` — context provider (open/close state, current screen context, keyboard shortcut)
- `src/hooks/useNeuronAi.ts` — thread state, screen-context collector, function caller
- `src/hooks/useNeuronAiContext.ts` — registry each page calls to publish its current state
- `supabase/functions/_shared/appKnowledge.ts` — the knowledge brain (prose)
- `supabase/functions/neuron-ai/index.ts` — main assistant edge function
- `supabase/functions/neuron-ai-confirm/index.ts` — confirm-and-execute endpoint

**Light edits:**
- `src/App.tsx` — wrap with `NeuronAiProvider`
- `src/components/AppSidebar.tsx` — place the button next to the collapse chevron
- `src/components/AppLayout.tsx` — mount the panel
- `src/pages/CityScoring.tsx`, `src/pages/TeacherProspects.tsx`, `src/pages/EmailOutreachV2.tsx`, `src/pages/CandidatePipeline.tsx` — register screen context (tiny hook call each, no behavior change)
- `CHANGELOG_HASEEB.md` — log every decision for Brett

---

## What's deliberately NOT in v1

- Multi-step agentic plans ("find top 3 then queue enrichment for each")
- Deep-reasoning model calls (`gemini-2.5-pro`)
- Chart / image generation
- Voice in/out
- Full natural-language-to-SQL across all tables
- Streaming responses (v1 returns the full answer at once; can add streaming later if you want)

All of these stay deferred per your "defer expensive and very expensive" call.

---

## Risk

Low-medium. The new code is additive — nothing existing changes behavior. The only failure modes:
- Edge function fails → assistant shows an error toast, app keeps working
- User confirms a write → logged to `ai_action_log` so we can audit/undo
- Role gate is enforced server-side, not just in the UI

---

## What I need from you before I build

Nothing — your last message had the two answers I needed. Switch to build mode and I'll ship the whole Step 2 in one go (button + panel + welcome + slash commands + edge function + knowledge brain + DB migration + screen-context hooks for all 4 pages).

