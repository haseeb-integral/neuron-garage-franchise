## Part A — Fix the size mismatch (search vs. action buttons) — implement now

### The root cause
- `GlobalSearch` input height ≈ **36px** (`py-2` + `text-sm`).
- Page action buttons (`Promote from Prospect`, `Compare Cities`, `Add Franchisee`, `Find Prospects`) use the default shadcn `Button` size = **40px** (`h-10`), and on Candidate Pipeline an inline `minHeight: 44` pushes it to **44px**.
- The help icon button is **32px** round.

So the row visually contains three different heights: 32 / 36 / 40–44. The buttons dominate, making the search bar look small.

### Standard fix — pick one shared control height: **36px** (matches the search)
This is the standard pattern (Linear, Notion, Vercel, shadcn "sm" size = 36px). The search bar stays as the baseline; everything aligned to it shrinks to match.

### Concrete changes

1. **`src/components/PageHeader.tsx`**
   - Make the help icon button **36×36** (was 32×32) so it aligns with search + buttons.
   - Wrap the `action` slot so any `Button` inside is forced to `size="sm"` height. Easiest: change the action wrapper to `[&_button]:h-9` (36px) so all action buttons in the header row inherit the same height regardless of what the page passes in.

2. **`src/pages/CandidatePipeline.tsx`** — `Promote from Prospect` button
   - Add `size="sm"` and remove the `minHeight: 44` inline style.
   - Reduce icon to `size={14}`.

3. **`src/pages/CityScoring.tsx`** — `Compare Cities` button (and any sibling header actions)
   - Add `size="sm"`; ensure no inline height override.

4. **`src/pages/TeacherProspects.tsx`** — `Find Prospects` button
   - Add `size="sm"`.

5. **`src/pages/Onboarding.tsx`** — `Add Franchisee` button
   - Add `size="sm"`.

6. **`src/components/GlobalSearch.tsx`**
   - No height change needed (already 36px), but tighten to `h-9` explicitly so it's locked to 36px regardless of font metrics: replace `py-2` with `h-9 py-0`.

### Result
Single 36px row for search + action buttons + help icon, balanced spacing, consistent with shadcn/Linear conventions. Mobile (`min-h-44` for tap targets) is preserved by only touching the **header row** buttons, not the in-page CTAs (kanban toolbar, filter chips, dialog actions are unchanged).

---

## Part B — Login system plan (separate, for review)

### Purpose
Neuron Garage is an internal tool for franchise scouts and operators. The data (candidates, teacher PII, city scoring, onboarding documents) is sensitive — it must not be publicly accessible. A login system gates the app and gives every action an owner.

### What it will have

**1. Authentication (powered by Lovable Cloud)**
- **Email + password** sign-in (primary, since this is an internal team tool).
- **Google sign-in** (optional, for staff with Google Workspace accounts).
- Forgot-password flow with a `/reset-password` page.
- Session persistence across reloads; auto-logout on token expiry.

**2. User profile**
A `profiles` table linked to `auth.users`:
- `full_name`, `avatar_url`, `job_title` (e.g. "Franchise Scout"), `phone`.
- Auto-created on signup via DB trigger.
- Editable from a "My Profile" page.

**3. Roles (separate `user_roles` table — never on profiles)**
Three roles:
- `admin` — full access, can invite/remove users, manage roles, see all data.
- `manager` — full data access, can reassign owners (Kaylie/Sam/Skylar), can start onboardings.
- `scout` — read/write candidates and prospects assigned to them; read-only for others.

Role checks via a `has_role(user_id, role)` security-definer function (RLS-safe pattern).

**4. UI pieces**
- `/login` and `/signup` pages (signup may be invite-only — admin sends invite link).
- **Top-right user menu** (replaces the current empty space): circular avatar with initials → dropdown with: name + email, "My Profile", "Team & Roles" (admins only), "Sign out".
- Avatar appears in `PageHeader` to the right of the help icon.
- Route guard: unauthenticated users get redirected to `/login`. The `AppLayout` becomes auth-protected.

**5. Audit trail (small but valuable)**
- "Assigned to" dropdowns on candidates/prospects pull from real users (not hardcoded Kaylie/Sam/Skylar).
- Every stage move, note, and onboarding action records `created_by = auth.uid()`.
- Activity timelines show real user names + avatars.

**6. Security posture**
- Row-Level Security on every table.
- Scouts only see candidates where `assigned_to = auth.uid()` OR `is_public_in_team = true`.
- Managers/admins bypass via `has_role()`.
- Leaked-password check (HIBP) enabled.

### What this replaces in the current app
- Hardcoded owners (`"Kaylie" | "Sam" | "Skylar"`) → real users from `profiles`.
- The static "Jennifer C." mock avatar in your reference → the actual signed-in user.
- Toasts like "Moved by you" become real attribution.

### Phasing suggestion
- **Phase 1 (MVP):** Email/password auth + profiles + top-right avatar menu + route guard. No roles yet — everyone is effectively an admin.
- **Phase 2:** Roles + RLS + real "assigned to" dropdowns wired to users.
- **Phase 3:** Google sign-in, invite flow, audit attribution in activity timelines.

### Open questions before I build it
1. Is signup **open** (anyone with the link can register) or **invite-only** (admin sends invites)?
2. Do you want **Google sign-in** in Phase 1, or email/password only to start?
3. Should the three current owners (Kaylie, Sam, Skylar) be **seeded as initial users**, or wiped and replaced?
4. Confirm the three-role model (`admin` / `manager` / `scout`) — or do you want a different breakdown?

---

**On approval I will:**
- Immediately implement Part A (size fix across PageHeader + 4 pages + GlobalSearch).
- Wait for your answers on the 4 questions in Part B before building the login system.