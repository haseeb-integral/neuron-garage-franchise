// Single source of truth for the 7-bucket reply intent taxonomy.
// Mirrors Smartlead's Lead Categories. NEVER reintroduce NEUTRAL — every reply must
// land in one of these buckets. See .lovable/plan.md for the rationale.

export type ReplyCategory =
  | "INTERESTED"
  | "MEETING_REQUEST"
  | "INFO_REQUEST"
  | "SOFT_NO"
  | "WRONG_PERSON"
  | "NOT_INTERESTED"
  | "OOO";

export const REPLY_CATEGORIES: ReplyCategory[] = [
  "INTERESTED",
  "MEETING_REQUEST",
  "INFO_REQUEST",
  "SOFT_NO",
  "WRONG_PERSON",
  "NOT_INTERESTED",
  "OOO",
];

export interface CategoryMeta {
  label: string;
  short: string;
  cls: string;        // tailwind for chip
  dot: string;        // hex for dot indicator
  description: string;
  /** If true, row is eligible for automatic Promote to Pipeline (with confidence gate). */
  autoPromotable: boolean;
}

export const CATEGORY_META: Record<ReplyCategory, CategoryMeta> = {
  INTERESTED: {
    label: "Interested",
    short: "INTERESTED",
    cls: "bg-[#e6f7ef] text-[#0a8f5a]",
    dot: "#0a8f5a",
    description: "Clear positive signal — ready to promote to the Candidate Pipeline.",
    autoPromotable: true,
  },
  MEETING_REQUEST: {
    label: "Meeting requested",
    short: "MEETING",
    cls: "bg-[#dcfce7] text-[#166534]",
    dot: "#166534",
    description: "Asked for a call / calendar invite — promote and flag for scheduling.",
    autoPromotable: true,
  },
  INFO_REQUEST: {
    label: "Info requested",
    short: "INFO",
    cls: "bg-[#fff4df] text-[#b7791f]",
    dot: "#b7791f",
    description: "Asked a question (cost, location, details). Reply is needed — do NOT auto-promote.",
    autoPromotable: false,
  },
  SOFT_NO: {
    label: "Soft no / defer",
    short: "SOFT NO",
    cls: "bg-[#ffedd5] text-[#9a3412]",
    dot: "#9a3412",
    description: "\"Not now\", \"not this summer\", \"maybe next year\". Snooze, never promote.",
    autoPromotable: false,
  },
  WRONG_PERSON: {
    label: "Wrong person",
    short: "WRONG PERSON",
    cls: "bg-[#fce7f3] text-[#9d174d]",
    dot: "#9d174d",
    description: "They don't handle this — capture forwarded contact if provided.",
    autoPromotable: false,
  },
  NOT_INTERESTED: {
    label: "Not interested",
    short: "NOT INTERESTED",
    cls: "bg-[#eef2f7] text-[#526078]",
    dot: "#526078",
    description: "Hard no / unsubscribe. Auto-suppressed by SmartLead; never promote.",
    autoPromotable: false,
  },
  OOO: {
    label: "Out of office",
    short: "OOO",
    cls: "bg-[#e6f0ff] text-[#1f5bff]",
    dot: "#1f5bff",
    description: "Auto-reply. SmartLead retries automatically — no action needed.",
    autoPromotable: false,
  },
};

/** Confidence threshold under which we never auto-promote, even for promotable buckets. */
export const AUTO_PROMOTE_CONFIDENCE_THRESHOLD = 0.7;

export function isAutoPromotable(category: ReplyCategory | null | undefined, confidence: number | null | undefined): boolean {
  if (!category) return false;
  const meta = CATEGORY_META[category];
  if (!meta?.autoPromotable) return false;
  return (confidence ?? 0) >= AUTO_PROMOTE_CONFIDENCE_THRESHOLD;
}

export function categoryMeta(category: string | null | undefined): CategoryMeta | null {
  if (!category) return null;
  return CATEGORY_META[category as ReplyCategory] ?? null;
}
