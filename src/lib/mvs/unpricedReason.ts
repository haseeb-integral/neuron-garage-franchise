import { classifyExclusion } from "./classifyExclusion";

/**
 * Explains in one short sentence why a provider row has no price.
 * Returns null when the row IS priced — callers should hide the chip.
 *
 * Categories (in priority order):
 *  - excluded         Non-camp (daycare, park, retail workshop, etc.)
 *  - needs_review     Amber row waiting for a human to Verify / Reject
 *  - no_website       No website_url and no url on file
 *  - booking_wall     Site is a JS-only marketplace known to block crawlers
 *  - directory_only   Listing found but no price shown on the listing
 *  - not_found        Crawler tried everything, no price was ever printed
 */
export type UnpricedReasonKey =
  | "excluded"
  | "needs_review"
  | "no_website"
  | "booking_wall"
  | "directory_only"
  | "not_found";

export interface UnpricedReason {
  key: UnpricedReasonKey;
  short: string;
  long: string;
}

const BOOKING_WALL_HOSTS = [
  "hisawyer.com",
  "sawyer.com",
  "enrollsy.com",
  "activityhero.com",
  "campbrainregistration.com",
  "amilia.com",
  "jackrabbitclass.com",
];

function hostOf(u?: string | null): string {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function unpricedReason(p: any): UnpricedReason | null {
  const hasPrice =
    (p?.price_min != null && Number(p.price_min) > 0) ||
    (p?.price_max != null && Number(p.price_max) > 0);
  if (hasPrice) return null;

  if (classifyExclusion(p)) {
    return {
      key: "excluded",
      short: "Not a camp",
      long: "This provider is excluded from camp counts (daycare, park, retail workshop, or drop-in club).",
    };
  }

  if (p?.price_needs_review) {
    return {
      key: "needs_review",
      short: "Needs human review",
      long: "The crawler found a possible price but flagged it for a person to Verify or Reject before it counts in the score.",
    };
  }

  const website = p?.website_url || p?.url || "";
  if (!website) {
    return {
      key: "no_website",
      short: "No website on file",
      long: "We have no website URL for this provider, so the crawler had nothing to open.",
    };
  }

  const listingHost = hostOf(p?.source_listing_url);
  const siteHost = hostOf(website);
  const isWall =
    BOOKING_WALL_HOSTS.some((h) => siteHost.endsWith(h)) ||
    BOOKING_WALL_HOSTS.some((h) => listingHost.endsWith(h));

  if (isWall) {
    return {
      key: "booking_wall",
      short: "Booking wall blocks crawler",
      long: "The site hides prices behind a JavaScript booking flow (Sawyer, Enrollsy, ActivityHero, etc.). Prices appear only after clicking Register.",
    };
  }

  if (p?.source_listing_url) {
    return {
      key: "directory_only",
      short: "Directory listing, no price shown",
      long: "A directory listing was found for this provider but the listing page did not print a weekly price.",
    };
  }

  return {
    key: "not_found",
    short: "No price printed anywhere",
    long: "The crawler tried the website, directories, and Google search, but no weekly tuition number was published online.",
  };
}

/** Group counts for the Deep Dive summary block. Excludes the "excluded" bucket. */
export function unpricedBreakdown(rows: any[]): Array<{
  key: UnpricedReasonKey;
  short: string;
  count: number;
}> {
  const buckets = new Map<UnpricedReasonKey, { short: string; count: number }>();
  for (const r of rows) {
    const reason = unpricedReason(r);
    if (!reason || reason.key === "excluded") continue;
    const existing = buckets.get(reason.key);
    if (existing) existing.count += 1;
    else buckets.set(reason.key, { short: reason.short, count: 1 });
  }
  return Array.from(buckets.entries())
    .map(([key, v]) => ({ key, short: v.short, count: v.count }))
    .sort((a, b) => b.count - a.count);
}
