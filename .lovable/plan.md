## What happened

When you switch to MVS and come back to Site Analysis, the page mounts fresh.
My last fix made the page start with **empty slots** on every mount.
So your loaded cards disappear on tab switch.

## Fix

Remember the cards you explicitly added **for this browser session**, so navigating away and back keeps them. But still no auto-loading of old database history.

### How
- Save the current `slots` to `sessionStorage` whenever they change.
- On mount, read them back from `sessionStorage`.
- `sessionStorage` is per-tab and clears when the tab closes. It is not the database, so old removed cards cannot sneak back.
- Removing a card removes it from `sessionStorage` too, so it stays gone.

### Behavior after fix
- Add/load cards → switch tab → come back → cards still there.
- Refresh the same tab → cards still there (you explicitly added them this session).
- Remove a card → it stays removed across tab switches and refresh.
- Close the tab and open a new one later → starts empty (clean slate, as you wanted).

### Files touched
- `src/pages/SiteAnalysis.tsx` only.

### Not touched
- No database changes.
- No score math.
- No Saved Sites drawer.
- No exports.

### Risk
Very low. SessionStorage is small (only the cards' inputs + cached result). If parsing fails I will fall back to empty slots.

### Smoke test I will run
1. Load 2 cards from Saved Sites.
2. Click MVS tab, then click Site Analysis tab → cards still visible.
3. Refresh page → cards still visible.
4. Remove 1 card → switch tab → come back → only 1 card visible.
5. Close tab, open new tab to Site Analysis → starts empty.

Approve and I will implement.