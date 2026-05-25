## What's wrong today

Neuron AI is a thin shell: a 4-tool router with a hardcoded knowledge file. It can navigate, apply filters, write to watchlist/pipeline, and explain itself — but it can't *look things up*, doesn't remember anything between sessions, doesn't stream, doesn't know what's on the user's screen beyond a JSON blob, and has nothing to say about what it can do until the user types `/find`. That's why every gap surfaces as a bug *you* have to file.

This plan turns Neuron AI into a real in-app copilot: it answers from live data, remembers, streams, proactively offers what it can do per screen, and self-explains failures.

## What changes

### 1. Live data lookups (the big one)
Today the AI can only **navigate to** answers. New: it can **fetch** them.

Add a server-side tool the model can call mid-turn:

- `query_cities` — filter/sort the 817 cities by tier, state, score, pillar, or specific signals; return top N with the numbers. Lets "best cities to set up franchise" answer with the actual top 5 + reasoning *before* offering "Show me on City Search."
- `query_teachers` — by city, school, fit score, tag.
- `query_candidates` — by stage, owner, last activity.
- `query_campaigns` — by status, reply rate, send volume.
- `explain_score` — for a given city, return the pillar breakdown + top contributing signals.

All read-only, all RLS-scoped, all parameterized. Model decides when to call them, gets results, then forms the answer.

### 2. Conversation memory (per user, persistent)
Today: `useState` in the panel, lost on refresh. New:
- `neuron_ai_threads` and `neuron_ai_messages` tables (user-scoped via RLS).
- Panel loads the active thread on open; "New chat" archives it.
- Edge function pulls last N turns so the model has real continuity ("show me more like the last one" works).

### 3. Streaming responses
Switch `neuron-ai` to SSE streaming via the AI gateway. Tokens render as they arrive instead of one blocked spinner. Tool calls still resolve atomically, but prose answers stream.

### 4. Dynamic, route-aware welcome state
Replace the hardcoded 5 slash commands with:
- 3-4 *real* suggestions generated from the current route + screen state (e.g. on /city-scoring with Texas filter on: "Top 5 Texas cities right now", "Why is Frisco Tier A?", "Compare Plano vs Cary").
- A "What can you do here?" chip that returns a real capability list for the current screen.

### 5. Per-route action parity
Today email-outreach and teacher-search have almost no actions. Add:
- Teacher Search: `apply_screen_state` with city/tag/fit filters, `promote_teacher`.
- Email Outreach: `queue_email`, `pause_campaign` (behind Confirm).
- Candidate Pipeline: bulk `change_candidate_stage`, add note.

Every write keeps the existing Confirm card flow.

### 6. Proactive context awareness
Read more of the actual screen state into the system prompt: visible cities, current sort, active filters, selected row. So "summarize what I'm looking at" works without the user re-stating it.

### 7. Self-explaining failures
When a tool call fails (RLS denial, missing data, rate limit), the AI returns an answer that says *what* failed and what the user can do, instead of the panel showing a red ⚠️ generic string. Stale-auth gets a one-click "Sign in again" chip.

### 8. Discoverability surface
- Floating button: small label "Ask Neuron" (not just the sparkle) until first use.
- First-open tour bubble (one-time): "I can find cities, explain scores, move candidates, draft outreach. Try `/find` or just ask."
- `/help` command lists every capability grouped by screen.

## Out of scope (call out so we don't drift)

- Image / chart generation in chat — skipped for v1.
- NL→SQL (free-form SQL writing) — staying on parameterized tools only.
- Multi-step autonomous agents (chained tool calls > 2). Each turn = one tool call + answer, like today.
- Voice input.

## Files / surfaces

- `supabase/functions/neuron-ai/index.ts` — streaming, new query tools, memory load.
- `supabase/functions/_shared/appKnowledge.ts` — expanded per-route capability lists.
- New migration: `neuron_ai_threads`, `neuron_ai_messages` with RLS.
- `src/hooks/useNeuronAi.ts` — thread persistence, SSE consumer.
- `src/components/neuron-ai/NeuronAiPanel.tsx` — streaming render, dynamic welcome, route-aware suggestions, capability help.
- `src/components/neuron-ai/NeuronAiProvider.tsx` — richer screen-state collection per route.

## Build order (so you see progress fast)

1. Live data lookups (`query_cities`, `explain_score`) + answer-with-data prompt change. **Biggest user-visible win.**
2. Streaming.
3. Persistent threads.
4. Dynamic welcome + `/help`.
5. Per-route action parity.
6. Self-explaining failures + discoverability polish.

## One question before I build

Right now the AI gets your auth, so writes (watchlist, candidate stage) are scoped to you. For the new **read** tools — do you want them scoped to "what you can see" (RLS-bound) or "everything in the database" (e.g. so it can answer "how many teachers total across all owners")? Default in this plan: RLS-bound, same as the rest of the app. Say the word if you want a global-read mode for admins (you + Brett).