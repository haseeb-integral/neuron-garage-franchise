
## What's wrong today in `docs/architecture/system-overview.md`

**Section 3 ("AI models we use") is inaccurate.** Verified against the actual edge-function source:

| Function | Doc says | Actually uses |
|---|---|---|
| `ask` | gemini-2.5-pro | **gemini-2.5-flash** |
| `neuron-ai` | gemini-2.5-pro | **gemini-2.5-flash** |
| `city-analyst` | gemini-2.5-pro | **gemini-3-flash-preview** (default) + 2.5-pro (opt-in) |
| `csv-suggest-mapping` | gemini-2.5-flash-lite | **gemini-3-flash-preview** |
| `ask-city` | — (missing) | **gemini-3-flash-preview** |
| `smartlead-webhook` (reply classification) | — (missing) | **gemini-2.5-flash-lite** |
| `enrich-school-staff` | listed as AI caller | **does not call the AI Gateway** — remove |
| `openai/gpt-5-mini` "fallback for neuron-ai" | listed | **not wired up in code** — remove or mark "planned" |

Correct callers per model:
- `gemini-3-flash-preview`: `ask-city`, `city-analyst` (default), `csv-suggest-mapping`
- `gemini-2.5-flash`: `ask`, `neuron-ai`, `observability-ai`, `teacher-search-ai`, `users-guide-ai`, `ai-city-query`
- `gemini-2.5-flash-lite`: `smartlead-webhook` (reply categorization)
- `gemini-2.5-pro`: `city-analyst` (opt-in deep-explain only)

## Per-screen AI is not documented

The doc lumps all Ask-AI together. In reality there are **two tiers** and the screen→function mapping is invisible:

- **Global Neuron AI** (floating panel, Cmd/Ctrl+K) — `neuron-ai` + `neuron-ai-confirm`. **Hidden in the UI right now**: `NeuronAiPanel` is mounted in `AppLayout` but the `NeuronAiButton` launcher is **not rendered**, so it's keyboard-only and effectively in **internal beta** pending Haseeb's robustness pass.
- **Per-screen Ask-AI** (production, visible on each screen):
  - City Search → `ask-city` + `ai-city-query` + `city-analyst`
  - Teacher Search → `teacher-search-ai` (right-side panel)
  - Observability → `observability-ai`
  - User's Guide / docs pages → `users-guide-ai`
  - Email Outreach + Candidate Pipeline → **no dedicated per-screen Ask-AI today** (covered only by global Neuron AI)
  - Global fallback chat → `ask`

## Proposed edits (single file: `docs/architecture/system-overview.md`)

1. **Rewrite Section 3 table** with the corrected model→callers mapping above. Drop the unused `gpt-5-mini` row and the `gemini-2.5-flash-image` row (not invoked). Drop `enrich-school-staff`.
2. **Add a new short subsection "3a. Where AI shows up in the UI"** with a clean table:
   - Screen | Ask-AI surface | Edge function(s) | Status (Production / Beta-hidden)
   - One row per screen including the two screens with no per-screen AI, so the gap is explicit.
3. **Promote a one-line beta callout** under the "Neuron AI assistant architecture" heading (Section 11):
   > **Status: internal beta.** The floating launcher button is intentionally not mounted in `AppLayout` yet. Open via Cmd/Ctrl+K only. Do not promote to all users until Haseeb signs off on tool-call safety + rate-limit handling.
4. **Cross-reference** from Section 3 to Section 3a and Section 11 so a reader landing on the model table immediately sees the per-screen map and beta note.

No code changes. No changes to other docs.

## Out of scope (will not touch)

- Actually wiring the gpt-5-mini fallback (separate decision for Brett).
- Mounting/unmounting the Neuron AI launcher button.
- Any model swap.
