## Problem

Right now Neuron AI has two modes:
- **answer** → just talks (info, safe).
- **navigate_and_apply** → immediately navigates + applies filters to the screen.
- **propose_action** → only used for writes (watchlist, candidate stage); shows a Confirm card.
- **clarify** → asks a follow-up.

When you said "best cities to set up franchise", it picked `navigate_and_apply` and yanked you to /city-scoring with a Tier A filter — no preview, no consent. That's the "stops there" feeling: the chat answer becomes a one-liner ("Navigating to…") because the action *is* the answer.

You want every action (not just writes) to:
1. First give a real **information answer** in chat (what it found / what it would do, with reasoning).
2. Then show a **"Apply to screen?"** confirm card.
3. Only navigate / apply filters after you click Confirm.

## Plan

### 1. Collapse navigation into the existing confirm flow
Treat navigation + filter application as just another previewable action, the same way watchlist writes already work.

- Extend `propose_action` to support two new action types:
  - `navigate` — route only.
  - `apply_screen_state` — route + filter/weight payload (replaces today's `navigate_and_apply`).
- Remove the `navigate_and_apply` tool from the AI's tool list so the model can't bypass confirmation.
- Keep `answer`, `clarify`, and the existing write actions (`add_to_watchlist`, etc.) unchanged.

### 2. Make the AI answer first, then propose
Update the system prompt in `neuron-ai/index.ts` so that for any request that would change the screen, the model MUST:
- Put the actual finding / explanation in `preview_text` (2–6 sentences with the why — e.g. "Tier A markets are the strongest 12 cities by composite score. Top 3 right now: Frisco TX, Plano TX, Cary NC. Applying this would filter City Search to those 12 cities."),
- Then expose Confirm / Cancel.

So the chat bubble itself reads like a real answer, not "Navigating to…".

### 3. Client: handle confirm for navigation actions
In `useNeuronAi.ts` + `NeuronAiPanel.tsx`:
- When `propose_action.action_type === "navigate"` or `"apply_screen_state"`, the Confirm button (instead of calling `neuron-ai-confirm`) runs `navigate(route)` and sets `window.__neuronAiApply` exactly like today's auto-apply path.
- Cancel just dismisses, no side effect.
- Writes (`add_to_watchlist`, `change_candidate_stage`) keep going through `neuron-ai-confirm` as today.

### 4. Confirm card copy
- For navigation: button label = "Show me" (instead of "Confirm"), secondary = "Stay here".
- For filters on the current screen: button label = "Apply filters", secondary = "Keep current view".
- For writes: keep "Confirm" / "Cancel".

### 5. Settings escape hatch (optional, keep simple)
Not building a toggle right now — confirm-before-act becomes the default for everything. If you later want a "just do it" power-user mode, we can add a switch in the panel header. Let me know.

## Files to touch

- `supabase/functions/neuron-ai/index.ts` — tool list + system prompt.
- `src/hooks/useNeuronAi.ts` — `AssistantReply` union, confirm routing for nav vs write.
- `src/components/neuron-ai/NeuronAiPanel.tsx` — Confirm card labels per action_type, navigation on confirm.

No DB or schema changes. No new edge function.

## Open question

Should `/find` (and similar discovery commands) ever auto-navigate without confirmation when the user *explicitly* typed a navigation verb ("take me to", "open city search")? Default in this plan: no — always confirm. Tell me if you want an exception for explicit verbs.