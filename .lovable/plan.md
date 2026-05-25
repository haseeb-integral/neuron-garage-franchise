
# Data Observability Dashboard — Tier 1 + Tier 2

A dedicated, calm, intuitive page that answers one question at a glance: **"Is our data trustworthy right now?"** Tier 3 (alerts/history) comes in a later sprint.

## What we're building

A new top-level page at `/observability` titled **Data Observability**, designed in a Jony Ive spirit: generous whitespace, one clear focal point, soft shadows, no chart-junk, plain-English labels with quiet "Learn more" affordances. Every metric and rule explains — in one sentence — what it checks, why it matters, and what a green/yellow/red result means.

Linked in the left sidebar **directly under Candidate Pipeline**, above the divider that separates primary nav from Team Members.

## Sprint plan

### Sprint 1 — Tier 1: Status & Structure (the "Vitals")
The "is the data there, fresh, and shaped right?" layer.

1. **Navigation & shell**
   - Move/repoint sidebar: add **Data Observability** as a primary nav item under Candidate Pipeline, above the divider. Retire the existing "Database Health" utility link (or alias `/db-health` → `/observability`).
   - New page `src/pages/Observability.tsx` with a hero header: overall **Trust Score** (single number, large, calm), last-checked timestamp, and a "Run all checks now" button.

2. **Domain cards (reuse `DomainCard`, restyled)**
   - One card per core domain: City Scores, Teachers, Public Schools, Private Schools, Demographics, Outreach.
   - Each card shows: row count, freshness (last updated), null-rate on key columns, and a single status pill (Green / Yellow / Needs attention).
   - "Show formula" disclosure on every metric — exact SQL + threshold, matching Rule #1 (Show the math).

3. **Plain-English overlay**
   - Every card has a one-line description ("Tracks the 41,000+ U.S. cities we score. Healthy means counts and freshness are within expected ranges.").
   - Hover/tap "What does this mean?" → short popover written for a non-technical reader.

4. **Polish pass**
   - Typography scale, soft dividers, no gradients, single accent color from the existing token system. Mobile-friendly.

### Sprint 2 — Tier 2: Accuracy & Rules (the "Inspector")
The "is the data *correct*?" layer.

1. **Rules board**
   - Surface `db_health_rules` as a clean list grouped by domain. Each rule: name, plain-English description, last result, "Run now," and a "Show SQL" disclosure.
   - Examples: no duplicate `(city, state)` rows; CSI scores between 0–100; every teacher has a valid email shape; school NCES IDs unique.

2. **Sample Inspector**
   - "Show me 10 random rows" per domain with a refresh button. Helps Sam/Kaylie eyeball reality without writing SQL.

3. **Outlier finder**
   - Per numeric column: flag rows beyond 3σ. Result shown as a small table with a one-line explanation of why an outlier matters.

4. **Add-a-rule (manager only)**
   - Simple form: name, domain, description, SQL predicate, severity. Saves to `db_health_rules`. No code deploy needed to add a check.

### Sprint 3 (later, not now) — Tier 3
History sparklines, scheduled snapshots, incidents log, email/Slack alerts, subscriptions. Most plumbing already exists from the prior pass; we'll wire it into the new page once Tier 1+2 are signed off.

## Design principles for the page
- One focal Trust Score, then a calm grid of domain cards, then rules below the fold.
- Every number has a "Show formula" and a "What does this mean?" — no mystery values.
- Status uses three states only: **Healthy**, **Watch**, **Needs attention**. No traffic-light overload.
- Manager-only (reuse `useIsManager`); non-managers get a friendly "Restricted" state.

## Technical notes
- Reuse: `src/components/dbHealth/*`, `src/hooks/dbHealth/*`, `src/lib/dbHealth/*`, existing tables `db_health_rules`, `db_health_history`, `db_health_incidents`.
- New: `src/pages/Observability.tsx`, `src/components/observability/` (TrustScore, DomainGrid, RuleList, SampleInspector, OutlierFinder, AddRuleDialog).
- Routing: register `/observability` in `App.tsx`; keep `/db-health` as a redirect for one release.
- Sidebar: edit `AppSidebar.tsx` — append to `primaryNavItems` (under Candidate Pipeline), remove from `utilityNavItems`.
- No schema changes required for Sprint 1. Sprint 2 only adds rows via the existing `db_health_rules` table; "Add a rule" uses the existing insert path.

## Deliverable per sprint
- **Sprint 1:** `/observability` live with Trust Score + domain cards + plain-English descriptions + sidebar move.
- **Sprint 2:** Rules board, Sample Inspector, Outlier finder, Add-a-rule dialog.
- **Sprint 3 (deferred):** Alerts, history sparklines, subscriptions.

Confirm and I'll start Sprint 1.
