import type { StageId } from "@/data/pipelineData";

/** Prospect-facing step text, copied word for word from "Your Path to Ownership" PDF. */
export interface PortalStep {
  num: number;
  title: string;
  time: string;
  description: string;
  afterLabel: string;
  items: { key: string; label: string }[];
}

export const PORTAL_STEPS: PortalStep[] = [
  {
    num: 1, title: "Start the Conversation", time: "45-60 minutes",
    description: "We get to know each other, talk through your background and goals, and share an overview of Neuron Garage.",
    afterLabel: "After this call",
    items: [
      { key: "rfc", label: "Complete the Request for Consideration" },
      { key: "explore_sites", label: "Explore neurongarage.com and neurongaragefranchise.com" },
    ],
  },
  {
    num: 2, title: "Business Overview and FDD Review", time: "60 - 90 minutes",
    description: "A closer look at how the business works, and a walk through the Franchise Disclosure Document (FDD).",
    afterLabel: "After this call",
    items: [
      { key: "fdd_attorney", label: "Review the FDD with an attorney" },
      { key: "item23", label: "Sign and return the Item 23 receipt" },
      { key: "bg_credit_funding", label: "Complete the Background, Credit, and Funding form" },
      { key: "personality", label: "Complete the personality profile" },
    ],
  },
  {
    num: 3, title: "Business Immersion and Evaluation", time: "1.5 - 3 hours",
    description: "What running camp is really like, the support you’ll have, and a two-way conversation about how you’d lead it.",
    afterLabel: "After this call",
    items: [
      { key: "facility_form", label: "Complete the facility prospect form" },
      { key: "notice_schools", label: "Start noticing schools in your market" },
      { key: "talk_site_director", label: "Optional: talk with a current Site Director" },
    ],
  },
  {
    num: 4, title: "Confirmation Call", time: "15-30 minutes",
    description: "We share our Selection Committee’s decision, align on commitments, and answer your questions.",
    afterLabel: "After this call",
    items: [
      { key: "final_questions", label: "Prepare any final questions" },
      { key: "fee_ready", label: "Have your $1,000 initial franchise fee ready" },
    ],
  },
  {
    num: 5, title: "Signing Call", time: "Brief call",
    description: "A live call where we both sign the Franchise Agreement and its exhibits, at least 14 days after you received the FDD.",
    afterLabel: "Next",
    items: [{ key: "welcome", label: "Watch for your welcome and onboarding details" }],
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
