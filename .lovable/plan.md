
# Haseeb Task Audit — June 23 Meeting

## 1. My understanding (plain English)

You gave me 16 tasks from the June 23 meeting. They fall into 5 groups:

- **Market Validation reliability** (tasks 1–7): the pipeline is failing, Firecrawl is hitting its cap, and the pass/fail + confidence display is confusing. Needs real backend + logic work.
- **Market Validation content** (tasks 8–11): remove Market Absorption, remove its weekly evidence, add detail under the 5 remaining cards, fix the Boston warning.
- **Site Analysis polish** (tasks 12–13): rename "Confidence" to "User Confidence", make PDFs clearer.
- **Branding & naming** (tasks 14–15): apply Sam's brand colors + logo, rename app to "Neuron Garage Franchise Development".
- **Candidate Pipeline cleanup** (task 16): remove "Process Roadmap" from the Notes & Activity tab.

## 2. Risk classification

| # | Task | Risk | Why |
|---|------|------|-----|
| 15 | Rename app to "Neuron Garage Franchise Development" | **Quick / low-risk** | Text-only edits in ~10 files (index.html, Auth, UserGuide, Spec, TeamMembers, compareExport). No logic. |
| 16 | Remove Process Roadmap from candidate Notes & Activity | **Quick / low-risk** | Isolated to `src/components/candidate-pipeline/tabs/NotesActivityTab.tsx`. UI-only. |
| 12 | Rename Site Analysis "Confidence" → "User Confidence" | **Quick / low-risk** | Label rename in Site Analysis components. No data change. |
| 11 | Fix or remove Boston calibration warning | **Quick / low-risk** | One banner/string. Need to find owner first, then hide or relabel. |
| 7 | Explain how MV confidence score is calculated | **Quick / low-risk** | Written explanation, no code change (or a small "?" tooltip). |
| 9 | Remove week-by-week Market Absorption evidence | **Quick (after #8)** | UI removal in Market Validation page. |
| 8 | Remove Market Absorption from Market Validation | **Medium** | Removes a card + its scoring contribution. Need to confirm weights re-normalize and exports/PDF don't break. |
| 10 | Add detailed sections under remaining 5 MV cards | **Medium** | Writing + UI work, but contained. |
| 14 | Apply official branding (colors, logo, B/W only) | **Medium** | Touches `index.css` design tokens + logo asset. Affects every page visually but no logic. Needs Sam's exact hex codes + hi-res logo before starting. |
| 13 | Improve Site Analysis + Market Brief PDFs | **Medium** | PDF generation code (`MvsBriefDocument.tsx`, site brief). Contained but needs writing. |
| 2 | Add failure reason for failed crawls | **Medium** | Needs backend error capture + UI surface. |
| 3 | Pass/fail → completeness % | **Medium** | Touches scoring display + maybe stored status. |
| 4 | Fallback to recent data on Firecrawl failure | **High-risk** | Changes pipeline logic. Could mask real failures if wrong. |
| 5 | Use saved data if within 60 days | **High-risk** | New caching rule across the pipeline. |
| 6 | Avoid re-crawling successful cities | **High-risk** | Pipeline gating logic; risk of stale data. |
| 1 | Fix Market Validation (pipeline failed + Firecrawl cap) | **High-risk** | Root cause unknown. Needs investigation in edge functions + Firecrawl quota. Tasks 2–6 are sub-fixes. |

## 3. Recommended order

**Wave A — safe quick wins (do first, no dependencies):**
1. Task 15 — Rename app
2. Task 16 — Remove Process Roadmap from Notes & Activity
3. Task 12 — Rename Site Analysis confidence label
4. Task 11 — Boston calibration warning (hide or relabel)
5. Task 7 — Document MV confidence score (plain text + tooltip)

**Wave B — Market Validation content cleanup:**
6. Task 8 — Remove Market Absorption card
7. Task 9 — Remove weekly absorption evidence
8. Task 10 — Add detail under remaining 5 cards

**Wave C — Polish:**
9. Task 13 — PDF improvements
10. Task 14 — Branding (needs Sam's assets first)

**Wave D — Pipeline reliability (most risk, do last together):**
11. Task 2 — Failure reasons
12. Task 3 — Completeness %
13. Task 5 — 60-day cache reuse
14. Task 6 — Skip successful cities
15. Task 4 — Fallback on Firecrawl failure
16. Task 1 — End-to-end pipeline fix (root cause)

## 4. Why the first wave is safe

- **Rename, label changes, and removing a UI section** only touch strings and one component each. No database, no API, no scoring logic.
- They are reversible in one edit.
- No other feature reads the renamed labels as data keys.

## 5. Step-by-step plan for Task 15 (Rename app)

**Goal:** Replace "Neuron Garage Franchise" with "Neuron Garage Franchise Development" everywhere it appears as the app name, except where it is a product/system name like "Neuron Garage Franchise Acquisition System" (that one I will leave unless you say otherwise).

**Files to edit (text-only, ~10 lines total):**
- `index.html` — `<title>`, `og:title`, `twitter:title`
- `src/pages/Auth.tsx` — alt text, sign-in copy, footer copyright
- `src/pages/UserGuide.tsx` — page title, PDF header, intro
- `src/data/userGuideMarkdown.ts` — H1 + intro line
- `src/pages/TeamMembers.tsx` — invite email line
- `src/lib/compareExport.ts` — export footer
- `src/pages/Spec.tsx` — subtitle (only the app-name reference)

**Phases:** 1 phase, 1 Lovable turn.

**What I will NOT touch:**
- Scoring, pipeline, edge functions, database, RLS, design tokens.
- "Neuron Garage Franchise Acquisition System" (that's the product/system name — confirm if you want it renamed too).
- Logo files or colors (those belong to Task 14).

## 6. Tests / checks after Task 15

- Open the preview, confirm the browser tab title shows the new name.
- Open Auth page → confirm header, body copy, footer all show the new name.
- Open User Guide → confirm H1 + PDF header.
- Invite a teammate dialog → check the invite copy preview.
- Confirm no TypeScript build errors.

## 7. Confirmation

I will only change the text strings listed above. I will not touch scoring, the pipeline, Firecrawl logic, PDFs, branding tokens, or any other feature.

## Question before I start

For Task 15: should I also rename **"Neuron Garage Franchise Acquisition System"** → **"Neuron Garage Franchise Development Acquisition System"**, or leave the "Acquisition System" phrasing alone? My default is to leave it.
