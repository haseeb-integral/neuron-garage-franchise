## Diagnosis first

The "10 candidates" badge is actually correct right now — your DB has 11 candidates total, 10 active and not disqualified, which is exactly what step 3 counts (`status = 'active' AND current_stage != 'disqualified'`).

The real problem you're sensing is a **freshness** problem, not a wrong-number problem:

- `JourneyBar` fetches the count **once on mount** in a `useEffect([])`.
- It lives inside `AppLayout`, which doesn't re-mount when you navigate between pages (React Router keeps the layout mounted).
- So if you add a candidate via "+ New Candidate", promote one from Teacher Prospects, delete one, or change a stage to/from Disqualified, the badge stays stale until a hard refresh.
- Same pattern will bite you for "12 prospects" once that moves off mock data, and for "Active" on Onboarding.

## What gold-standard SaaS apps do (Linear, Notion, Vercel, Stripe, Supabase studio)

Three layers, used together:

1. **Server-state cache with invalidation** — TanStack Query (React Query) is the de-facto standard. Counts/lists are cached by a key (e.g. `["candidates","count"]`); any mutation calls `queryClient.invalidateQueries(...)` so every component reading that key refetches automatically.
2. **Realtime push for cross-tab / cross-user freshness** — Supabase Realtime (or websockets generally). A `postgres_changes` subscription on the `candidates` table invalidates the same query key when another user (or another tab) changes data.
3. **Refetch on window focus + light polling as a safety net** — React Query does this by default (`refetchOnWindowFocus: true`). Polling every 30–60s is the belt-and-suspenders fallback.

This pattern is what the Supabase team itself recommends in their docs and what shows up consistently in r/reactjs and r/Supabase threads about "counts going stale."

## Plan

### 1. Add TanStack Query (if not already wired)

Confirm `@tanstack/react-query` is installed and a `QueryClientProvider` wraps the app in `src/App.tsx`. If missing, add it with sane defaults:
- `staleTime: 30_000`
- `refetchOnWindowFocus: true`

### 2. Create a single source of truth for the candidate count

New hook `src/hooks/useCandidateCount.ts`:
- `useQuery({ queryKey: ["candidates","count"], queryFn: ... })` that runs the same `select("id", { count: "exact", head: true }).neq("current_stage","disqualified")` query.
- Subscribes to Supabase Realtime `postgres_changes` on `public.candidates` (INSERT / UPDATE / DELETE) and calls `queryClient.invalidateQueries({ queryKey: ["candidates","count"] })` on every event.
- Returns `{ count, isLoading }`.

### 3. Replace the local fetch in `JourneyBar`

Swap the `useEffect` + `useState` block for `const { count } = useCandidateCount();`. JourneyBar becomes a dumb consumer.

### 4. Invalidate on local mutations (instant feedback, no waiting on Realtime)

In every place that already writes to `candidates`, after a successful insert/update/delete call:
```ts
queryClient.invalidateQueries({ queryKey: ["candidates"] });
```
Touch points:
- `NewCandidateModal` (after insert)
- `TeacherProspects` Promote handler (after insert)
- `CandidatePipeline` stage moves and any delete/update paths
- Anywhere `candidate_stage_history` is written that implies a stage change

This gives the user sub-second feedback in the same tab; Realtime covers other tabs/users.

### 5. Enable Realtime on the `candidates` table

One-line SQL migration so `postgres_changes` actually fires:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
```

### 6. Apply the same pattern to the other journey steps later (out of scope for this step, but keep the hook shape consistent so we just add `useProspectCount`, `useOnboardingCount` later when those tables exist).

## Out of scope for this change

- Teacher Prospects count and Onboarding "Active" pill stay as-is until they have real tables.
- No changes to stages, metrics cards, filters, or qualification scoring.
- No styling changes to JourneyBar.

## Outcome

After this:
- Add a candidate via "+ New Candidate" → step 3 badge updates immediately without refresh.
- Promote from Teacher Prospects → badge updates immediately.
- Another teammate adds/deletes a candidate in their browser → your badge updates within ~1s via Realtime.
- Tab in background for an hour, come back → React Query refetches on focus, badge corrects itself even if Realtime missed an event.