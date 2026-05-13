# Sub-Metric Drawer — UX Polish

Two small, isolated changes to `src/components/city-scoring/SubMetricWeightsDrawer.tsx`. No store, no data, no scoring math touched.

## 1. −/+ stepper instead of native number spinner

Why: the native `<input type="number">` arrows are tiny, browser-dependent, and feel broken when they "stop" at 0. Standard pattern (Amazon quantity, Stripe seat counts) is a visible − button, the value, and a + button.

Build:
- Replace the `<input type="number">` with a small inline group: `[ − ] [ value ] [ + ]`.
- − decrements by 1, disabled at 0.
- \+ increments by 1, disabled at 100.
- Center value stays editable as a plain text input (so power users can still type "25" directly), width ~36px, no spinner (`appearance-none`, `[&::-webkit-inner-spin-button]:appearance-none`).
- Disabled metrics: whole stepper greyed out, both buttons disabled, value locked at 0.
- Keep the existing `setSubWeight` store call — it already clamps to 0–100.

Visual: ~96px total width, h-7, border `#e5eaf2`, buttons hover `#f3f6fb`, text `#07142f`.

## 2. Rename status pills

In `STATUS_PILL` map at the top of the file:

```
live    → "Live"        (green, unchanged)
proxy   → "Estimated"   (was "Proxy")
missing → "Unavailable" (was "No data yet")
blocked → "Unavailable" (was "No data yet")
```

Also update the helper text in the drawer header:
- Current: "Hover the (i) icon to learn what each metric means."
- Keep as-is — no Proxy reference there.

No other file changes. No registry changes (the internal `status: "proxy"` key stays, only the display label changes).

## Risk / effort

- Risk: very low — pure presentation, single file.
- Effort: ~15 min.
- Undo: revert the one file.