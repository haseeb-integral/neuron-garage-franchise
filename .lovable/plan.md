# Move "Users" out of main nav into the Settings/profile area

## What the research showed

Standard SaaS pattern (Linear, Notion, Slack, Stripe, Vercel, Figma, GitHub):
**User/team management is NOT a top-level nav item.** It lives under **Settings**, accessed through a dropdown on the user avatar in a corner of the sidebar.

For your app — which has 5 product features and only one admin feature — the cleanest match is the **avatar-dropdown → Team members** pattern.

## Changes

### 1. Remove "Users" from the main sidebar nav
The current `Users` link in the main nav (added in the last turn) is removed. Main nav goes back to its original 5 items only.

### 2. Make the user-info card at the bottom-left a clickable dropdown
Today the card at the bottom (avatar + name + role) is static, with a separate "Log out" button below it. I'll merge these into a single button that opens a dropdown menu, similar to how Linear/Vercel/shadcn's own sidebar example works.

```text
┌──────────────────────────┐
│ [SR] Sam Reed         ⇅ │  ← clickable
│      ADMIN               │
└──────────────────────────┘
   ↓ opens dropdown:
   ┌───────────────────────┐
   │ Sam Reed              │
   │ sam@neurongarage.com  │
   ├───────────────────────┤
   │ ⚙  Team members       │  ← admin-only
   ├───────────────────────┤
   │ ⎋  Log out            │
   └───────────────────────┘
```

When the sidebar is collapsed, just the avatar is shown and clicking it opens the same dropdown.

The standalone "Log out" button is removed — it now lives inside the dropdown, which is the universal SaaS pattern.

### 3. Rename page + route to match Settings convention
- Route: `/users` → `/settings/team`
- Page title: "Users" → "Team members"
- Page file: `src/pages/Users.tsx` → `src/pages/TeamMembers.tsx`

This matches Linear ("Settings → Members"), Notion ("Settings → People"), Stripe ("Team & security → Members"), etc.

### 4. Files affected

- `src/components/AppSidebar.tsx` — remove `Users` from nav, replace bottom user card + logout with a dropdown menu
- `src/pages/Users.tsx` → renamed to `src/pages/TeamMembers.tsx` (content same, just heading/title text updated)
- `src/App.tsx` — change route from `/users` to `/settings/team`, update import

## What stays the same
- Admin-only access (non-admins don't see "Team members" in the dropdown and can't reach the route)
- All functionality on the page itself (table, add user, role change, send reset, on-screen temp password)
- Edge function and DB are unchanged
