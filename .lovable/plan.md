## Audit: Redundant / low-value columns in Provider Evidence Review

Looking at the current Austin screenshot, three columns are pulling their weight poorly:

### 1. `Source type` — **redundant with `Source query`**
Every visible row shows the same value in both cells:
- `google_search` / `google_search`
- `sawyer` / `sawyer`

`source_type` is just the platform label of the query. It never adds a new fact next to `Source query`. **Recommend: remove the column.** Keep the value inside the drawer only, or merge it as a tiny grey subtitle under the query text.

### 2. `Phase` — **empty for every row**
All rows show `—`. This column was reserved for the crawler phase (discover / catch-up / brand-hint), but we never wired real values into the evidence view, so it's dead space. **Recommend: remove the column** from the table. If we ever want it back, it belongs in the drawer under "How we found this price".

### 3. `Kept / dropped` — **duplicates the Verification chip**
- `Kept` = the same thing the green **"In score — crawler"** chip already says.
- `Dropped` is shown separately as an amber "Guard dropped" pill in the header + drawer.

So this column repeats info the Verification column already carries, with less nuance. **Recommend: remove the column.** The header status strip (`222 in score · 0 need human review · …`) plus the Verification chip cover it.

### Columns worth keeping (no change)
- **Provider** — primary key for the human.
- **Category** — filter + context.
- **Source query** — the actual query text is the audit trail.
- **Source URL** — the clickable proof link.
- **Price/wk** — the number under review.
- **Verification** — the only column where the human acts.
- **Last seen** — freshness signal.

### What this plan will do

- Delete the three columns (`Source type`, `Phase`, `Kept / dropped`) from `src/pages/ProviderEvidence.tsx` — header cells + body cells + colspan on the empty-state row.
- Leave the underlying data (`platform`, `phase`, `kept/dropped guard drops`) untouched in the DB and in the drawer, so nothing is lost — only the table gets simpler.
- Update the CSV export? **No** — export keeps all fields so downstream audit is unchanged. Only the on-screen table shrinks.

### Risk / scope
- **File touched:** `src/pages/ProviderEvidence.tsx` only.
- **Turns:** 1.
- **Risk:** very low, pure UI trim, no logic or data changes.
- **Smoke test:** open Austin Provider Evidence → confirm 7 columns instead of 10, chips + counts unchanged, drawer still shows platform + guard drops, CSV still has every field.

Approve and I'll ship it in one turn.
