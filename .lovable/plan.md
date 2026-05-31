## Goal

Bring the **User's Guide** and the **Ask AI Assistant** fully in sync with the current product (Spec v1.4). Plain-English voice stays, but every feature, surface, and rule that exists in the Spec is reflected — no drift.

## Current state (what I found)

- `src/pages/UserGuide.tsx` is a JSX page. It still lists **only 4 features**, calls SmartLead "4 reply chips" (actually 7), no mention of: Neuron AI ⌘K assistant, Header-bell Notifications, Database Health & Observability, Documents tab, 16-day FDD gate, score override, Manus CSI v2, recomputed "one calibrated number" rule, transactional email infra, Master Pool vs SmartLead toggle nuances, Saved Lists / Bulk Action Bar, Market Context Banner, Phase 2 SOW.
- There is **no downloadable .md** for the User's Guide today (only the Spec page has one). I will add a Download Markdown button, mirroring the Spec page pattern, sourced from a single `USER_GUIDE_MARKDOWN` constant.
- `supabase/functions/_shared/aiAssistantKB.ts` is the KB consumed by `users-guide-ai` edge function. It is stale (says "4 reply chips", "Integral Leads", no Neuron AI, no Notifications, no Observability, no Documents tab, no 16-day gate, no Phase 2, no Manus, no transactional email, missing Tier D, wrong stage names).

## What I will change

### 1. New single source of truth: `src/data/userGuideMarkdown.ts`
A plain-English markdown doc that has **parity with the Spec** but in friendly voice. Sections:

1. Welcome + who it's for
2. The 4 design principles
3. The journey end-to-end
4. **Feature 1 — City Search** (817 cities, 12 SOW metrics in 3 categories, Tier A/B/C/D, "one calibrated number everywhere", Show Formula, Compare up to 3, weighting sliders, Ask AI 3-tier TAM rule, City Notes, Export Raw Signals, Find Teachers handoff)
5. **Feature 2 — Teacher Search** (fit score, Market Context Banner, Next Best Action Strip, Saved Lists, Bulk Action Bar, Outreach Intelligence, Promote)
6. **Feature 3 — Email Outreach** (Master Teacher DB vs SmartLead toggle, CSV import with AI mapping, dedupe + verification preview, push-to-campaign with live filter preview, 7 reply buckets, warm-up status banner, transactional email infrastructure summary)
7. **Feature 4 — Candidate Pipeline** (7 stages, six-criteria scorecard, Documents tab, manual votes, score override, compliance audit log, 16-day FDD hard gate, Step 2/4 uploads, Export Packet, days-in-stage, card anatomy)
8. **Neuron AI (⌘K)** — what it does, when to use it
9. **Notifications (header bell)** — what triggers alerts
10. **Database Health & Observability** — Haseeb/Brett only, what it surfaces
11. **In-app reference docs** — links to Spec, Demographics Methodology, Email Outreach Docs, Observability Guide, SmartLead Spec
12. **Phase 2 — what's coming** (one-line each: Market Validation 1A, Site Analysis 1B, Candidate portal, Teacher Search 1.5, SmartLead 1.5, Mailboxes, Video Training, Manus CSI app)
13. Quick answers (FAQ — refreshed)
14. Where to go when stuck

### 2. Refactor `src/pages/UserGuide.tsx`
- Keep the branded hero, principles strip, journey strip, card-anatomy section, and closing CTA (visual identity stays).
- Replace the long static feature/FAQ JSX blocks with a `<ReactMarkdown>` render of `USER_GUIDE_MARKDOWN` for the sections that need parity with the Spec. This guarantees the page and the .md file can never drift.
- Add a **Download Markdown** button (and Print/Save-as-PDF) in the PageHeader action slot, using the same handler pattern as `src/pages/Spec.tsx`.
- Keep `AiAssistant` floating launcher and per-feature "Ask AI about X" buttons.

### 3. Refresh `supabase/functions/_shared/aiAssistantKB.ts`
Rewrite the KB so the assistant can answer accurately on:
- 817 cities, 12 SOW metrics in 3 categories, Tier A/B/C/D, "one calibrated number everywhere" recompute rule, Show Formula, Ask AI 3-tier TAM rule, City Notes, Export Raw Signals.
- Teacher Search: Market Context Banner, Next Best Action Strip, Saved Lists, Bulk Action Bar.
- Email Outreach: Master Teacher DB vs SmartLead toggle, CSV AI mapping, 7 reply buckets (Interested, Meeting, Info, Soft No, Wrong Person, Not Interested, OOO), warm-up status, transactional email infra.
- Candidate Pipeline: correct 7 stages, Documents tab, manual votes, score override + audit log, 16-day FDD hard gate, Export Packet.
- Neuron AI ⌘K, Header-bell Notifications, Database Health & Observability.
- Phase 2 SOW one-liner per item; Manus CSI v2.
- Updated team roles (Kaylie, Brett, Haseeb, Sam, recruiting staff).
- Keep the voice rules, follow-ups protocol, and brand voice exactly as today.

### 4. `AiAssistant.tsx` context prompts
Update the per-context `SUGGESTIONS.prompts` so the starter chips reflect new surfaces (e.g. Email Outreach chips mention the 7 buckets and Master Pool vs SmartLead; Candidate Pipeline chips mention Documents, 16-day gate, Export Packet; add the same per-context chip set for Neuron AI / Notifications / Observability if we expose them). No new contexts beyond the existing 5 unless needed.

### 5. Maintenance
- Add a `CHANGELOG_HASEEB.md` entry: "User's Guide v1.4 parity refresh + downloadable .md + AI Assistant KB refresh".
- Update `.lovable/plan.md` with a one-line note.

## What I will NOT do
- No app behavior, schema, edge-function logic, RLS, or Phase 2 SOW changes.
- No re-design of the User's Guide visual identity (yellow/navy/red branded sections stay).
- No new routes, no new tables.
- Documentation + KB only.

## Files touched
- **new** `src/data/userGuideMarkdown.ts`
- **edit** `src/pages/UserGuide.tsx` (refactor to render markdown + add Download button)
- **edit** `supabase/functions/_shared/aiAssistantKB.ts` (full rewrite to v1.4)
- **edit** `src/components/AiAssistant.tsx` (refresh `SUGGESTIONS` prompts)
- **edit** `CHANGELOG_HASEEB.md`, `.lovable/plan.md`

Approve and I'll implement.