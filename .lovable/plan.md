# Sidebar icons + .lovable housekeeping

Four asks, handled together.

---

## 1. Sidebar icons — why one looks missing and the fix

Looking at the screenshot and `src/components/AppSidebar.tsx`:

- **Credentials & Handover** — icon `KeyRound` IS present in the code AND visible in your screenshot (the small key inside the blue active pill). Nothing missing here.
- **Prompts & AI Workflows** — icon `Sparkles` is wired in code but renders as a near-invisible speck at `size={17}, strokeWidth={1.75}` because Sparkles is mostly empty space with thin strokes. That is the one that looks blank in your screenshot.

**Fix:** swap `Sparkles` → `Wand2` (a denser, clearly readable icon) for the Prompts & AI Workflows row only. All other docs icons (`KeyRound`, `Network`, `Plug`, `ShieldCheck`, `Gauge`, `Calculator`, `PieChart`, `Activity`, `FileCode2`, `MailOpen`, `Send`, `FileText`) already render fine — I will verify each visually after the swap. One-line change in `AppSidebar.tsx`.

I have not "failed 1000 times" on sidebar icons — every docs row already has an icon assigned in code. The Sparkles icon just renders too faintly at sidebar size. That is the real bug and the swap fixes it.

---

## 2. `.lovable/tier2-backlog.md` vs Sam's punchlist — reconciliation

The Tier 2 backlog was derived from Sam's punchlist (you and I built it together to survive across chat sessions). Here is the full audit:

**Safe group — all 9 items shipped:**
| # | Item | Shipped? |
|---|---|---|
| 1 | Days in Stage filter | ✅ |
| 2 | Other Opportunities textarea | ✅ |
| 3 | Mailing Address fields | ✅ |
| 4 | Editable profile fields | ✅ |
| 5 | Partner toggle conditional fields | ✅ |
| 6 | Notes & Activity 6-step process | ✅ |
| 7 | Homework checkboxes all stages | ✅ |
| 8 | Compliance Audit Log dates | ✅ |
| 13 | Documentation deliverables | ✅ N/A |

**Brett-only riskier group — status:**
| # | Item | Status |
|---|---|---|
| 9 | City notes table | ❌ NOT shipped |
| 10 | Committee voting without member accounts | ✅ Shipped as "Change #4" (manual committee votes) — you confirmed pass |
| 11 | Candidate file uploads (Storage bucket + RLS) | ✅ Shipped (FF_DOCUMENTS, FF_STEP2_UPLOADS, FF_STEP4_UPLOADS all true) |
| 12 | Proof-of-send screenshot upload | ❌ NOT shipped |

**Conclusion:** the Tier 2 backlog is NOT 100% complete — items **#9 (City notes)** and **#12 (Proof-of-send)** are still open. Those were never part of Sam's V1.0 4-item punchlist (Desired Markets rename / number formatting / Guardrails docs / manual committee votes) — they are extras you and I tracked separately.

**Recommendation:** do NOT delete `.lovable/tier2-backlog.md` yet. Instead I will:
- Mark #10 and #11 as ✅ Shipped (catch the file up).
- Add a clear header that says "This is separate from Sam's V1.0 punch list, which is 100% shipped. Items #9 and #12 remain open as future work."

That removes the confusion Brett ran into without losing the only record of #9 and #12.

If you'd rather just delete it and lose the #9/#12 tracking, say the word and I will.

---

## 3. Rename `.lovable/plan.md` → `.lovable/Candidate Pipeline — City Search Reskin Plan.md`

Straight rename, stays inside `.lovable/`. No content change. Plan is still live (Phase 1 shipped, Phases 2–3 not started).

---

## 4. Delete `.lovable/parked-fixes.md`

File currently says "no active parks" and only contains one Resolved entry (Nashville score mismatch, already shipped 2026-05-27 with a permanent write-up at `docs/pending-approval/2026-05-27-nashville-score-mismatch.md`). Safe to delete — nothing is lost.

---

## Technical change list

1. `src/components/AppSidebar.tsx` — import `Wand2` instead of `Sparkles`, use it on the Prompts & AI Workflows nav row.
2. `.lovable/tier2-backlog.md` — update status table (#10, #11 → ✅) and add clarifying header.
3. `mv .lovable/plan.md ".lovable/Candidate Pipeline — City Search Reskin Plan.md"`
4. `rm .lovable/parked-fixes.md`

No business logic, schema, or RLS touched. Pure docs + one icon swap.
