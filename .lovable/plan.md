## Goal

Two independent fixes:
1. Make GitHub Actions CI green — safely, without weakening any rule.
2. Combo #1 + #2 for tab switching: route prefetch + page skeleton (kill the "Loading…" white flash).

---

## Part 1 — GitHub Actions (safest fix)

### Diagnosis
Lint is the only failing job. 11 real **errors** + 415 warnings. Warnings don't fail the build — only the 11 errors do, and they are all in **one file**:

`src/components/candidate-pipeline/ComplianceSection.tsx`

```text
react-hooks/rules-of-hooks
  → useState / useCallback / useEffect called AFTER two early returns
```

Lines 53–54 do:
```ts
if (!isEnabled("FF_COMPLIANCE")) return null;
if (stage !== "fdd_review" && stage !== "signing") return null;
```
…then call `useState` etc. below. That violates the Rules of Hooks. It happens to work today because the gates are stable per-mount, but it's a real latent bug (if `stage` ever changes between `fdd_review`/`signing` and any other value while the component is mounted, React will crash). ESLint is correct to block this.

### Fix (surgical, safe)
Split the component into a thin gate + an inner component that holds the hooks. No behavior change.

```ts
export function ComplianceSection({ candidateDbId, stage }: Props) {
  if (!isEnabled("FF_COMPLIANCE")) return null;
  if (stage !== "fdd_review" && stage !== "signing") return null;
  return <ComplianceSectionInner candidateDbId={candidateDbId} stage={stage} />;
}

function ComplianceSectionInner({ candidateDbId, stage }: Props) {
  // …all existing hooks + JSX move here unchanged…
}
```

That's it. 11 errors → 0. Lint passes → Build job unblocks → all 4 CI jobs green.

### Why not the alternatives
- **Don't** disable the `react-hooks/rules-of-hooks` rule — it's a real correctness rule, not stylistic.
- **Don't** delete `.github/workflows/ci.yml` — you lose the Rule 12 guard, typecheck, and tests.
- **Don't** touch the 415 `no-explicit-any` warnings — they're warnings, not errors, and most are in edge functions. Leave them.

### Out of scope (not done)
- Node deprecation notices from `actions/checkout@v4` — cosmetic warnings only, do not fail CI.
- GitHub email notification settings — your account-level preference, not a repo change.

---

## Part 2 — Loading flash fix (Combo #1 + #2)

### #1 Route prefetch on hover + idle
Replace bare `React.lazy(...)` with a small helper that exposes a `preload()` method, then:
- Call `preload()` on `requestIdleCallback` after first paint for all routes.
- Call `preload()` on `mouseenter` / `focus` of sidebar `NavLink`s for instant feel.

Implementation:
- New file `src/lib/lazyWithPreload.ts` — returns `{ Component, preload }`.
- Update `src/App.tsx` — swap `lazy(() => import(...))` for `lazyWithPreload(() => import(...))`, keep the same `Routes` JSX.
- New file `src/lib/routePrefetch.ts` — exports `prefetchAllRoutes()` (idle) and `prefetchRoute(path)` (map of path → preload fn).
- `src/components/AppLayout.tsx` — `useEffect` calls `prefetchAllRoutes()` once after mount via `requestIdleCallback` (fallback `setTimeout(…, 1500)`).
- `src/components/NavLink.tsx` — add `onMouseEnter` / `onFocus` → `prefetchRoute(href)`.

Net effect: chunks download in the background, so by the time the user clicks a tab, the module is already in memory → no Suspense fallback shown.

### #2 Skeleton chrome instead of "Loading…"
Replace the global `RouteFallback` in `src/App.tsx` with a page-shell skeleton that mimics the standard page layout (title bar + a couple of content blocks), using the existing `<Skeleton />` primitive from `src/components/ui/skeleton.tsx`. Sidebar + header already stay mounted because they live in `AppLayout` (outside `<Suspense>`), so this only fills the `<Outlet />` area.

- New file `src/components/RouteSkeleton.tsx` — header row + 3–4 shimmer blocks, matched to existing spacing (`p-3 md:px-5 md:py-3`).
- `src/App.tsx` — `<Suspense fallback={<RouteSkeleton />}>`.

### Result
- First visit to any tab: prefetch usually wins → instant. If not, skeleton (not white "Loading…") fills the gap for ~200–800 ms.
- Subsequent visits: instant (browser chunk cache).
- Initial page load: unchanged — still code-split, still fast.

---

## Files touched

**Part 1**
- `src/components/candidate-pipeline/ComplianceSection.tsx` — split gate + inner component.

**Part 2**
- `src/lib/lazyWithPreload.ts` *(new)*
- `src/lib/routePrefetch.ts` *(new)*
- `src/components/RouteSkeleton.tsx` *(new)*
- `src/App.tsx` — use `lazyWithPreload`, swap fallback to `<RouteSkeleton />`.
- `src/components/AppLayout.tsx` — idle prefetch effect.
- `src/components/NavLink.tsx` — hover/focus prefetch.

No DB, no edge functions, no auth, no schema changes. No business logic touched.

---

## Verification
- `bun run lint` → 0 errors locally → GitHub Actions Lint + Build go green on next push.
- Manual: open app, switch tabs — no white "Loading…", tabs feel instant after ~1.5 s idle.
