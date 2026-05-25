## What's wrong right now

Looking at your screenshots and the code, three real problems:

1. **Neuron AI button is in the wrong place** — tucked into the sidebar header next to the collapse arrow. Cramped, easy to miss, and it makes the "Neuron Garage / Franchise" logo block ugly.
2. **The panel doesn't actually answer** — you sent the same question twice, no reply. Bottom-right toast says "Not signed in." You ARE signed in (Haseeb ADMIN). It's a real bug, not UX confusion.
3. **The panel UI is dated** — purple→blue gradient header, plain input, no avatars, no typing dots, no model pill. Far from ChatGPT polish.

Plus the small bonus issues you didn't name: the `?` help icon in the City Search top bar does nothing, and the "on /city-scoring" text in the panel header reads like a raw URL.

---

## Plan

### 1. Move Neuron AI button → City Search top bar

- Remove `<NeuronAiButton />` from the sidebar header (it goes back to being just logo + collapse arrow — clean).
- Replace the dead `?` icon in `CityTopBar.tsx` with the Neuron AI pill — sparkle + "Neuron AI" + `⌘K` hint, positioned right before the notification bell.
- Shrink "Generate Market Report" slightly (icon + "Market Report", keep blue) so the row fits without scroll.
- Other pages (Dashboard, Teacher Search, Email Outreach, Pipeline, Observability) keep the **⌘K / Ctrl+K** global shortcut — no visible button on them in this pass. Once Brett signs off on placement we can add it to those pages' headers too.

### 2. Fix "Not signed in" — the real bug

The frontend hook calls the edge function with raw `fetch` and a manually-grabbed `session.access_token`. When that token is near expiry, Supabase doesn't auto-refresh it, the edge function gets a stale JWT, `auth.getUser()` returns null → "Not signed in." That's why your second message also failed.

Fix: switch `useNeuronAi` to `supabase.functions.invoke("neuron-ai", { body })` and the same for `neuron-ai-confirm`. `invoke` handles token refresh automatically. Also surface the real error in the chat (red bubble that says what happened) instead of a tiny corner toast you can barely see.

### 3. Beautify the panel — ChatGPT-grade

```text
┌─────────────────────────────────────────┐
│  ✨  Neuron AI                  ⋯   ✕  │  ← clean white header, soft border
│      Gemini 2.5 Flash · City Search    │     small model pill, friendly route
├─────────────────────────────────────────┤
│                                         │
│  ✨ Hi, I'm Neuron AI.                  │  ← centered welcome, big sparkle
│  I can help across the whole app.       │
│                                         │
│  ┌──────────────────────────────────┐   │  ← suggested prompt CARDS
│  │  /find  find cities or teachers  │   │     (already exist, restyled)
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  /why   explain a score          │   │
│  └──────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────┐  ↑  │  ← rounded composer like ChatGPT
│  │ Ask Neuron AI…                │     │     send button inside the input
│  └───────────────────────────────┘     │
│  Neuron AI can make mistakes.          │  ← disclaimer line
└─────────────────────────────────────────┘
```

Concrete style changes:
- Drop the navy→blue→purple gradient header. Use **white header, soft border, small sparkle avatar** (matches ChatGPT/Claude).
- Add a tiny **"Gemini 2.5 Flash · on City Search"** subtitle pill — feels intentional, not raw.
- Assistant messages get a **sparkle avatar circle** next to them; user messages a small "H" initial circle. Both bubbles flatter (less aggressive rounding), more breathing room.
- Replace "Thinking…" spinner with **three pulsing dots** (the ChatGPT one).
- Composer: rounded-2xl pill, send icon **inside** the input on the right, soft focus ring, auto-grow up to 4 lines.
- Add subtle "Neuron AI can make mistakes. Verify important info." footer line.
- Width: 480px → **520px** on desktop so longer assistant answers don't feel cramped.

### 4. Small bonus cleanups (the "fix all issues I haven't said" part)

- Remove the dead `?` help icon (replaced by Neuron AI button, no orphan).
- Strip the duplicated empty user-message rendering bug if it shows up after the auth fix (right now the second click sent a duplicate before the first response failed — should be gated by the `sending` state, double-check).
- Markdown rendering already exists; tighten line spacing so code/lists feel native.

---

## Files touched

**Edit:**
- `src/components/AppSidebar.tsx` — remove `NeuronAiButton` import + render
- `src/components/city-scoring/CityTopBar.tsx` — drop `?`, add `NeuronAiButton`, shrink Generate Market Report label
- `src/components/neuron-ai/NeuronAiPanel.tsx` — full visual overhaul, sparkle avatars, typing dots, composer redesign, footer line
- `src/components/neuron-ai/NeuronAiButton.tsx` — slight tweak so it looks right on a white header (already mostly fine)
- `src/hooks/useNeuronAi.ts` — switch to `supabase.functions.invoke`, surface errors inline

**No DB changes. No new files. No edge function changes.**

---

## Out of scope (saving for later)

- Putting the button on Dashboard / Teacher Search / Email Outreach / Pipeline headers — wait for Brett's sign-off on the City Search placement first.
- Streaming token-by-token responses — Step 2 already deferred.
- Retiring the old City Search "Ask AI" bar — still runs alongside for 2 weeks as agreed.

---

## Risk

Low. All frontend + one hook change. The auth fix is a strict upgrade (`invoke` is what Supabase recommends). UI changes are additive and reversible.

Hit **Implement plan** when you're ready.