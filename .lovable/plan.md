## Part 1 — Fix the "Assigned To" (and other) Select fields

**Before:** In the New Candidate modal the selected value ("Haseeb…") sits visually centered inside the trigger, which looks broken compared to the text inputs above/below it.

**After:** Selected value left-aligned, single-line, truncates with ellipsis if the email is long — matching every other input in the modal.

**Why it happens:** The SelectValue inside `SelectTrigger` becomes a flex child next to the chevron. With `justify-between`, when the trigger is wide and the value span shrinks to its content, it can look mis-centered (especially with `[&>span]:line-clamp-1`). The trigger also has no explicit `text-left` / `flex-1` on the value span.

**Fix (file: `src/components/candidate-pipeline/NewCandidateModal.tsx`):**
- Wrap each `<SelectValue />` with an explicit left-aligned, flex-1, truncating span, or pass `className="[&>span]:flex-1 [&>span]:text-left [&>span]:truncate"` on each `<SelectTrigger>` used in this modal (Assigned To + Initial Stage).
- No change to the shared `src/components/ui/select.tsx` (keeps other selects in the app untouched).

That's the only thing touching the modal.

---

## Part 2 — Honest answer: what's NOT yet changed in the Candidate Drawer

Looking at the screenshot you sent (Allison Wood drawer) vs. what last turn actually shipped:

What I DID change last turn in the drawer:
- `OverviewTab.tsx` — added conditional pencil-vs-lock for manually-added emails (`emailSource === "manual"`).
- That's it. No color, chrome, or typography changes.

What I did NOT change (still default theme tokens):
1. Drawer header strip still uses the page background, not the `#f7faff` City-Search tone I promised.
2. Tab bar — active "Overview" pill still uses default white-on-shadow, not the blue underline treatment.
3. Section card borders still default `border` token, not `#e3e8ef`.
4. Section titles ("Contact Information", "Other Opportunities…", "Mailing Address") still render in `text-primary` (the existing dark navy), which is fine, but **the "Click any value to edit" helper, field labels, and field values still use default muted tones** — never reconciled to the `#526078` / `#07142f` palette I described.
5. "Export Packet" button still uses the default outline button — no blue accent.
6. No orange in the drawer today (good — nothing to swap), but no blue accent applied either.

So when you said "where has not UI changes in the candidate drawer?" — you are right. Last turn's drawer work was functional (lock/pencil logic) only, not visual.

---

## Part 3 — Drawer visual pass (this plan will do it)

Files: `src/components/candidate-pipeline/CandidateDetailPanel.tsx`, `src/components/candidate-pipeline/tabs/OverviewTab.tsx`.

Changes (Tailwind arbitrary values, local only — no token churn):

| Element | Before | After |
|---|---|---|
| Drawer header background | inherited page bg | `bg-[#f7faff]` with `border-b border-[#e3e8ef]` |
| Candidate name | `text-primary` bold | `text-[#07142f]` `font-semibold` |
| Subtitle (city · email) | muted-foreground | `text-[#526078]` |
| Owner line | muted-foreground | `text-[#8893a7] text-xs` |
| Export Packet button | default outline | outline + `text-[#174be8] border-[#174be8] hover:bg-[#174be8]/5` |
| Close (X) | default | `hover:bg-[#e3e8ef]` |
| Tab bar | default shadcn tabs | active tab: `text-[#174be8]` with 2px `#174be8` underline; inactive: `text-[#526078]` |
| Section card border | `border` | `border-[#e3e8ef]` |
| Section titles | `text-primary` | `text-[#07142f] font-semibold` |
| Field labels | muted | `text-[#526078] text-xs uppercase tracking-wide` |
| Field values | default | `text-[#07142f]` |
| Lock / pencil icons | current | `text-[#8893a7]` |
| Verified-email lock | already in | unchanged |
| Empty-state placeholders (Other Email, Mailing Address inputs) | default border | `border-[#e3e8ef]` `focus:ring-[#174be8]` |

No business logic, no schema, no tab content reordering. Pure styling.

---

## Out of scope
- Days-in-stage math (locked Option A last turn).
- Pipeline scoring, fit thresholds.
- Other tabs beyond Overview header chrome (Lead Sheet, Qualification, etc.) — they'll inherit the new tab-bar color but their card internals stay as-is unless you call them out.
- The shared `select.tsx` component — fix is scoped to this modal only.

---

## Smoke test (after build)
1. Open New Candidate → "Assigned To" + "Initial Stage" values are left-aligned, truncate cleanly.
2. Open a candidate drawer → header is light blue tint, name navy semibold, tab underline blue, section cards have soft blue-gray borders.
3. Allison Wood still shows 🔒 on Verified Email (auto-imported row).
4. A manually-added candidate (email_source = 'manual') shows pencil instead of lock.
