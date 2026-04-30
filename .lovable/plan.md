# Add 3 admins + admin Users page (Option B — temp passwords shown on screen)

## Part 1 — Seed admins via migration

Insert 3 users as admins. Temp password for all: `NeuronGarage2026!`. They reset via "Forgot password?".

| Email | Name |
|---|---|
| samreed512@gmail.com | Sam Reed |
| sam.reed@neurongarage.com | Sam Reed |
| kaylie@neurongarage.com | Kaylie Reed |

The migration is idempotent: if any already exist it just promotes them to admin. Same `auth.users` + `auth.identities` pattern used for Brett/Haseeb. Profiles are auto-created by the existing `handle_new_user` trigger; the migration also forces `role = 'admin'` (removes any default 'manager' row first).

## Part 2 — Edge function `admin-create-user`

Server-side function (uses service role key) that:
1. Verifies caller's JWT and that they have the `admin` role (via `has_role` RPC)
2. Validates email
3. Generates a random 16-char temp password
4. Calls `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
5. Sets profile `full_name`
6. Sets role (admin or manager)
7. Returns `{ user_id, email, temp_password, role }` to the caller

Runs with `verify_jwt = false` per Lovable convention (JWT validated in code).

## Part 3 — Admin Users page (`/users`)

New page, admin-only (hidden from sidebar for managers, blocked at the route).

**Features:**
- Table of all users: email, full name, role, created date
- "Add user" button → modal with: email, full name (optional), role (admin/manager)
- After successful create, modal switches to a "credentials" view showing:
  - Email
  - Temporary password (copy button)
  - Web app URL: `https://neuron-garage-franchise.lovable.app` (copy button)
  - Big note: "Send these to the user. They should change their password on first login via Forgot password."
  - "Copy all as message" button → copies a ready-to-paste message
- Per-row actions:
  - Change role (admin ⇄ manager) — admins only, can't demote yourself
  - "Send password reset email" — calls `resetPasswordForEmail` so user gets the standard reset link

**Files:**
- `supabase/migrations/<timestamp>_seed_admins_sam_kaylie.sql` (new)
- `supabase/functions/admin-create-user/index.ts` (new)
- `src/pages/Users.tsx` (new)
- `src/App.tsx` (add `/users` route inside ProtectedRoute)
- `src/components/AppSidebar.tsx` (add "Users" nav item, only when `role === 'admin'`)

## Email sending — short answer

You asked: *"is there any way to let send password default or temporary going forward to emails we will add?"*

Today there is **no email infra wired up**, so we can't auto-email new users yet. Option B handles this by **showing you the temp password + login URL on screen** right after creation so you can paste them into a message (Slack/email/text) yourself. Takes ~10 seconds per new user.

When you're ready to make it fully automatic (email goes straight to the new user with a "Set your password" link), we add a sender domain (one-time DNS setup, ~5 min) and the function will email them directly. Just say the word and I'll do that as a follow-up.

## After approval

I'll execute all three parts in one go, then confirm the 3 admin accounts are seeded and the Users page works.
