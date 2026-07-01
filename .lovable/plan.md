## Two small UX follow-ups on Provider Evidence Review

### 1. Reject safety — confirmation before clearing a price

**Where:** every place `handleVerify(r, "rejected")` fires in `src/pages/ProviderEvidence.tsx`. Today that's:
- The red **Reject** button on `Needs human review` rows.
- The **Undo** link on `In score — human ✓/✎` rows (also rejects — worth confirming too, since it clears the human-approved price).

**Behaviour:** intercept the click, open a small centered modal, only call the reject mutation on confirm.

**Copy (exact):**
> **Reject this price?**
> This will remove the price from scoring. You can restore it later.
>
> [ Cancel ] [ Yes, reject price ]

**Implementation notes:**
- Reuse the existing shadcn `AlertDialog` (already installed in `src/components/ui/alert-dialog.tsx`) so styling stays consistent.
- Local state `const [rejectTarget, setRejectTarget] = useState<EvidenceRow | null>(null)` to hold the row whose reject is pending.
- Cancel closes without any DB write. Confirm calls the existing `handleVerify(rejectTarget, "rejected")` path — no scoring/DB logic changes.
- Applies to the table row buttons AND the drawer's Reject button (`Verify / Reject / Edit` panel in `EvidenceDrawer`) so behaviour is consistent everywhere.

### 2. "How to read this table" — small collapsed help card

Your instinct is right — a permanent legend clutters the table. I'll do a slightly tighter version of what you sketched.

**Placement:** thin card directly **above the filter row**, below the header counter strip. Collapsed by default. State persisted to `localStorage` (`mvs.evidence.helpOpen`) so once a user opens it, it stays open on their machine — no re-clicking every visit.

**Collapsed look (one line, ~28px tall):**
> ▸ **How to read this table** — which camp prices were found, where they came from, and whether they are used in scoring.

**Expanded content — two short groups, no long paragraphs:**

**What the chips mean**
- 🟢 **In score — crawler** — price found by the crawler and passed safety checks. Counted.
- 🟢 **In score — human ✓ / ✎** — a person approved (or edited) the price. Counted.
- 🟡 **Needs human review** — price guessed from other locations of the same brand. Not counted until a person clicks Verify.
- ⚪ **Not in score — rejected / no price / excluded** — not counted. Excluded = non-camp (daycare, park, retail workshop).

**What the columns mean**
- **Source query** — the exact search phrase that surfaced this camp.
- **Source URL** — click "Open" to see the page the price came from.
- **Price/wk** — typical weekly tuition for Summer 2026. Amber "guard: N dropped" means the crawler read a suspicious number (too high / too low) and threw it away.
- **Verification** — the only column where you take action.
- **Last seen** — when this row was last refreshed.

That's it — no glossary, no scoring math, no long copy. Two bullet groups fit in ~180px when expanded.

### What I will NOT change

- No changes to scoring, DB schema, edge functions, CSV export, drawer contents, or filter behaviour.
- No new color tokens.
- No confirmation on **Verify**, **Edit**, or **Restore** — those aren't destructive.

### Files touched

- `src/pages/ProviderEvidence.tsx` — add AlertDialog for reject, add collapsible help card, wire localStorage toggle.
- (Reuse) `src/components/ui/alert-dialog.tsx` — no change, just imported.

### Turns / risk / test

- **Turns:** 1
- **Risk:** low — pure UI additions, no data or scoring changes.
- **Smoke test after ship:**
  1. On a `Needs human review` row → click **Reject** → confirm dialog appears → Cancel keeps the price → Yes, reject price clears it and flips the chip to "Not in score — rejected".
  2. On an `In score — human ✓` row → click **Undo** → same confirm dialog appears.
  3. In the drawer → click **Reject** → same confirm dialog appears.
  4. Above the filter row → collapsed help card shows one line → click to expand → two bullet groups appear → refresh page → stays expanded (localStorage).

Approve and I'll build both fixes in one turn.
