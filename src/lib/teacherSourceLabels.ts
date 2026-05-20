// Single source of truth for sanitized teacher-source labels shown in the UI.
// Never render the raw `enrichment_source` string or any contributor names.

export type SourceKey = "smartlead" | "linkedin" | "apollo" | "school_directory" | "other";

export type StatusTone = "emerald" | "amber" | "slate" | "sky" | "indigo";

export interface StatusBadge {
  label: string;
  tone: StatusTone;
  title: string;
}

/** Map DB `enrichment_source` → bucketed source key. */
export function sourceKeyFor(enrichmentSource: string | null | undefined): SourceKey {
  const s = (enrichmentSource ?? "").toLowerCase();
  if (s.startsWith("smartlead")) return "smartlead";
  if (s.startsWith("linkedin")) return "linkedin";
  if (s.startsWith("apollo")) return "apollo";
  if (s.startsWith("apify") || s.includes("school")) return "school_directory";
  return "other";
}

/** Display label for the bucketed source. */
export function sourceLabelFor(key: SourceKey): string {
  switch (key) {
    case "smartlead": return "SmartLead Enriched";
    case "linkedin": return "LinkedIn Import";
    case "apollo": return "Apollo Enriched";
    case "school_directory": return "School Directory";
    default: return "Other Source";
  }
}

/** Combined source + verification + email-presence badge for a row. */
export function statusBadgeFor(row: {
  enrichment_source?: string | null;
  verification_status?: string | null;
  email?: string | null;
}): StatusBadge {
  const key = sourceKeyFor(row.enrichment_source);
  const hasEmail = !!row.email?.trim();
  const verified = (row.verification_status ?? "").toLowerCase();

  if (key === "smartlead") {
    if (!hasEmail) {
      return { label: "SmartLead · No Email", tone: "slate", title: "Imported via SmartLead but no email was returned. Needs enrichment." };
    }
    if (verified === "invalid" || verified === "unverified" || verified === "email_unverified") {
      return { label: "SmartLead · Unverified", tone: "amber", title: "Email failed SmartLead verification — excluded from campaigns." };
    }
    return { label: "SmartLead · Verified", tone: "emerald", title: "Email verified by SmartLead. Safe to send." };
  }

  if (key === "linkedin") {
    return { label: "LinkedIn Import", tone: "sky", title: "Imported from LinkedIn. Needs email enrichment before outreach." };
  }

  if (key === "apollo") {
    return { label: "Apollo Enriched", tone: "indigo", title: "Email provided by Apollo." };
  }

  if (key === "school_directory") {
    return { label: "School Directory", tone: "slate", title: "Scraped from a school staff directory." };
  }

  return { label: "Other Source", tone: "slate", title: "Source not categorized." };
}

/** Map source filter UI value → predicate over the bucketed source key. */
export type SourceFilter = "all" | "smartlead" | "linkedin" | "needs_email";

export function matchesSourceFilter(
  filter: SourceFilter,
  row: { enrichment_source?: string | null; email?: string | null; needs_email_enrichment?: boolean | null },
): boolean {
  if (filter === "all") return true;
  if (filter === "needs_email") return !!row.needs_email_enrichment || !row.email?.trim();
  const key = sourceKeyFor(row.enrichment_source);
  if (filter === "smartlead") return key === "smartlead";
  if (filter === "linkedin") return key === "linkedin";
  return true;
}
