# Fix the three real problems

You're right — I screwed up: when I "renamed" `.lovable/plan.md`, I actually saved the *housekeeping* plan into the new filename and the original Phase 1/2/3 reskin plan is gone from that file. Here's the recovery.

---

## 1. Restore the reskin plan content (delete the garbage)

**File:** `.lovable/Candidate Pipeline — City Search Reskin Plan.md`

I will **overwrite the current garbage** (the "Sidebar icons + .lovable housekeeping" text) with the real reskin plan, reconstructed from chat history (messages #3100, #3106, #3110). Restored content:

- **Status as of 2026-05-29**
- **Phase 1 — KPI tiles, filter strip, density toolbar, legend — ✅ SHIPPED & live-verified**
- **Phase 2 — Board chrome — 🟡 NOT STARTED**
  - `KanbanBoard.tsx`: "Jump to:" row labels, count badges, active pill background
  - `KanbanColumn.tsx`: column headers, "Drop candidates here" placeholder, Disqualified column body `opacity-65`
  - `index.css`: scoped custom scrollbar (pipeline-only, not global)
  - Rule: stage color identity lives ONLY in column header dots — do NOT blue-wash stage dots
- **Phase 3 — Cards + score badges — 🟡 NOT STARTED**
  - `CandidateCard.tsx`: remove colored left border bar; hover border `#174be8`; Start Onboarding CTA stays orange `#fd7e14` (pending the open question below); owner avatar `w-7 h-7 bg:#174be8`
  - `CompositeScoreBadge.tsx` tier re-tone:
    - ≥90 → bg `#e7efff` / text `#0a2f8a` / border `#174be8`
    - 75–89 → bg `#eaf7f1` / text `#155d3a` / border `#20c997`
    - 60–74 → bg `#fff4e5` / text `#7a3a00` / border `#fd7e14`
    - <60 → bg `#fdecee` / text `#7a1620` / border `#dc3545`
  - **Open question (Brett to confirm before Phase 3 starts):** local override of `--primary` in the pipeline only, vs. global token swap from orange → blue `#174be8`. Recommendation = local override.
- **Out of scope:** `CandidateDetailPanel.tsx` tabs, scoring math, drag-drop guards, FDD gate, homework carry-forward, global `--primary` changes.

---

## 2. Rename the Tier 2 file to something self-explanatory

`mv .lovable/tier2-backlog.md .lovable/sam-punchlist-extras-pending.md`

New name says exactly what's in it: **extras tracked alongside Sam's V1.0 punchlist that are still pending** (≠ Sam's V1.0 4-item punchlist, which is 100% shipped).

Also bump the top-of-file header to make this unambiguous:

> "This file = the EXTRA items we tracked beyond Sam's V1.0 punchlist. Sam's V1.0 punchlist itself is 100% shipped. Open items here: #9 (City notes table) and #12 (Proof-of-send screenshot upload). Items #1–#8, #10, #11, #13 are ✅ shipped."

No content rewrite beyond the header — table stays.

---

## 3. Sidebar icons — diagnose and harden

The code in `src/components/AppSidebar.tsx` (lines 25 & 27) already has:
- Credentials & Handover → `KeyRound`
- Prompts & AI Workflows → `Wand2` (swapped from Sparkles in the last turn)

Both icons exist in `lucide-react` (verified). Your screenshot still shows them missing because **it's the same screenshot from before the Wand2 swap deployed** — that file edit happened seconds before this message and the preview likely hasn't rebuilt in your tab yet.

**To be safe**, on top of the existing change I will:

1. Bump icon weight on docs-group rows from `strokeWidth={1.75}` → `strokeWidth={2}` so every docs icon (including the small ones) reads clearly at 17px.
2. Add `aria-hidden="true"` + an explicit `className="shrink-0"` on the `<item.icon>` so the icon can never be collapsed by a flex parent.
3. After the change, capture a fresh screenshot of the sidebar at 750px viewport (your current size) and confirm Credentials AND Prompts both show their icons. If either is still invisible I will swap to an even denser icon (`Key` for Credentials, `Sparkles`→`Wand2` already done; fallback `Bot` for Prompts).

After deploy you'll need a **hard reload** (Cmd/Ctrl + Shift + R) to bust the cached sidebar bundle — please do that and confirm.

---

## Technical change list

1. `.lovable/Candidate Pipeline — City Search Reskin Plan.md` — overwrite with restored reskin plan content above.
2. `mv .lovable/tier2-backlog.md .lovable/sam-punchlist-extras-pending.md` + new clarifying header.
3. `src/components/AppSidebar.tsx` — bump docs-row icon `strokeWidth` to 2, add `shrink-0` + `aria-hidden` on `<item.icon>`. No icon component changes; KeyRound and Wand2 already in place.
4. Verify with screenshot post-build.

No business logic, schema, RLS, or feature behavior changes. Pure docs + presentation.
