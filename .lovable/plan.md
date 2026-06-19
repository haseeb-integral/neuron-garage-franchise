## Problem (audited)

In `mvs_providers`, the `url` column is what the Premium Providers table links to. Counts by platform:

| platform | total | bad detail-page URLs | working |
|---|---:|---:|---:|
| sawyer | 142 | **126** (`hisawyer.com/marketplace/activity-set/{id}`) | 16 |
| activityhero | 7 | **7** (activity-detail pages) | 0 |
| google_maps | 557 | 0 | 557 |
| yelp | 91 | 0 | 91 |

Why they look blank: those Sawyer/ActivityHero URLs are activity-detail SPA pages. Most return HTTP 200 but render an empty shell when the activity is expired/unlisted, so the user sees a white page. They are not the provider's actual website.

Root cause: in `supabase/functions/mvs-discover-providers/index.ts`, the Gemini extraction prompt lets the model copy whatever link sits next to a provider name on the Sawyer/ActivityHero listing — which is the activity-detail link, not the provider's homepage.

Google Maps and Yelp URLs are fine and stay as-is.

## Fix (3 small changes, scope limited to provider source links)

### 1. Helper: rewrite known bad URLs to a guaranteed-working source link

New tiny helper used by both backfill and the edge function:

```ts
// returns a usable "view source" URL for the provider, or null
function safeProviderUrl(url: string | null, name: string, city: string): string | null {
  if (!url) return null;
  const bad =
    /hisawyer\.com\/marketplace\/activity-set\//i.test(url) ||
    /activityhero\.com\/(a|activity)\//i.test(url);
  if (!bad) return url;
  const q = encodeURIComponent(`${name} ${city}`);
  return `https://www.google.com/search?q=${q}`;
}
```

Rationale: a Google search for "{provider} {city}" reliably lands the user on the real provider site in one click. Better than a blank SPA page, better than no link.

### 2. Backfill existing 133 bad rows (one migration / data update)

Update `mvs_providers` rows where `url` matches the bad patterns: set `url` to `https://www.google.com/search?q={name}+{city}`. No schema change. Done as a one-off SQL UPDATE via the insert tool.

### 3. Stop producing bad URLs going forward

In `supabase/functions/mvs-discover-providers/index.ts`:

- Tighten both Gemini prompts (Sawyer + ActivityHero) with one extra rule: *"`url` MUST be the provider's own website (their domain). DO NOT use marketplace activity-detail links such as `hisawyer.com/marketplace/activity-set/...` or `activityhero.com/a/...`. If you cannot see the provider's own site, return `null`."*
- After extraction, run every provider through `safeProviderUrl(...)` before insert, as a belt-and-braces guard.

### 4. UI nicety (LiveCityDeepDive Premium Providers table)

Already: when `url` is present → link, else plain text. After the backfill, every row will have a working link, so behavior is unchanged. No UI code changes required.

## Files touched

- `supabase/functions/mvs-discover-providers/index.ts` — add `safeProviderUrl`, apply to extracted providers, tighten two prompts.
- One-off data UPDATE on `mvs_providers` (no schema migration).

## Out of scope

- No changes to scoring, table columns, MVS pipeline structure, or other UI.
- Google Maps / Yelp links untouched.
- Not running a Firecrawl-search enrichment pass to find each provider's exact homepage (heavier + costs credits); the Google-search fallback solves the user-visible problem now. We can add real-homepage enrichment later if you want.
