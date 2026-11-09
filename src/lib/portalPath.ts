import type { StageId } from "@/data/pipelineData";

/** Prospect-facing step text, copied word for word from "Your Path to Ownership" PDF. */
export interface PortalStep {
  num: number;
  title: string;
  time: string;
  description: string;
  afterLabel: string;
  /** dueDaysBefore: days before the next call this item is due (from the form PDFs). Omitted = due before the next call. */
  /** noDue: never show a due date (e.g. info-only items). */
  /** url: a link the prospect can open straight from the homework item. */
  items: { key: string; label: string; dueDaysBefore?: number; noDue?: boolean; url?: string }[];
}

export const PORTAL_STEPS: PortalStep[] = [
  {
    num: 1, title: "Initial Qualification", time: "45-60 minutes",
    description: "We get to know each other, talk through your background and goals, and share an overview of Neuron Garage.",
    afterLabel: "After this call",
    items: [
      { key: "rfc", label: "Complete the Request for Consideration", dueDaysBefore: 1 },
      { key: "explore_sites", label: "Explore neurongarage.com and neurongaragefranchise.com" },
    ],
  },
  {
    num: 2, title: "Business Overview and FDD Review", time: "60 - 90 minutes",
    description: "A closer look at how the business works, and a walk through the Franchise Disclosure Document (FDD).",
    afterLabel: "After this call",
    items: [
      { key: "fdd_attorney", label: "Review the FDD" },
      { key: "item23", label: "Sign and return the Item 23 receipt" },
      { key: "bg_credit_funding", label: "Complete the Background, Credit, and Funding form", dueDaysBefore: 5 },
      { key: "personality", label: "Complete the personality profile" },
    ],
  },
  {
    num: 3, title: "Business Immersion and Evaluation", time: "1.5 - 3 hours",
    description: "What running camp is really like, the support you’ll have, and a two-way conversation about how you’d lead it.",
    afterLabel: "After this call",
    items: [
      { key: "facility_form", label: "Complete the facility prospect form", dueDaysBefore: 2 },
      { key: "references", label: "Complete the References form" },
      { key: "talk_site_director", label: "Optional: talk with a current Site Director" },
    ],
  },
  {
    num: 4, title: "Confirmation Call", time: "15-30 minutes",
    description: "We share our Selection Committee’s decision, align on commitments, and answer your questions.",
    afterLabel: "After this call",
    items: [
      { key: "fee_ready", label: "Have your $1,000 initial franchise fee ready" },
    ],
  },
  {
    num: 5, title: "Signing Call", time: "Brief call",
    description: "A live call where we both sign the Franchise Agreement and its exhibits, at least 14 days after you received the FDD.",
    afterLabel: "Next",
    items: [
      { key: "signed", label: "We signed the Franchise Agreement!", noDue: true },
      { key: "welcome", label: "Watch for your welcome and onboarding details", noDue: true },
    ],
  },
];

/** Which portal step a pipeline stage is on. null = disqualified. */
export function stageToStep(stage: StageId): number | null {
  switch (stage) {
    case "new_lead":
    case "initial_qual": return 1;
    case "business_overview":
    case "fdd_review": return 2;
    case "immersion": return 3;
    case "confirmation": return 4;
    case "signing": return 5;
    default: return null;
  }
}

export type StepState = "done" | "current" | "locked";
export function stepState(stepNum: number, current: number): StepState {
  if (stepNum < current) return "done";
  if (stepNum === current) return "current";
  return "locked";
}

/** "3 of 4 done" counts for one step, ignoring unknown item keys. */
export function stepProgress(stepNum: number, doneKeys: string[]): { done: number; total: number } {
  const step = PORTAL_STEPS.find((s) => s.num === stepNum);
  if (!step) return { done: 0, total: 0 };
  const set = new Set(doneKeys);
  return { done: step.items.filter((i) => set.has(i.key)).length, total: step.items.length };
}

/** Due date for a homework item: N days before the next call, or null when no call is booked. */
export function itemDueDate(nextCallIso: string | null | undefined, dueDaysBefore = 0, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): Date | null {
  if (!nextCallIso) return null;
  const d = new Date(nextCallIso);
  if (Number.isNaN(d.getTime())) return null;
  // Subtract calendar days in the viewer's zone, not 24-hour blocks across DST.
  const parts = (date: Date) => {
    const p = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const n = (key: string) => Number(p.find((v) => v.type === key)?.value ?? 0);
    return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  };
  const desired = parts(d) - dueDaysBefore * 86400000;
  let instant = desired;
  for (let attempt = 0; attempt < 4; attempt++) instant += desired - parts(new Date(instant));
  return new Date(instant);
}

export function homeworkSummary(items: { key: string; dueDaysBefore?: number; noDue?: boolean }[], doneKeys: string[], nextCall: string | null, now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const done = new Set(doneKeys);
  const completed = items.filter((item) => done.has(item.key)).length;
  return {
    percent: items.length ? Math.round(completed / items.length * 100) : 0,
    overdue: items.some((item) => {
      if (item.noDue || done.has(item.key)) return false;
      const due = itemDueDate(nextCall, item.dueDaysBefore, timeZone);
      return due !== null && due.getTime() < now.getTime();
    }),
  };
}
