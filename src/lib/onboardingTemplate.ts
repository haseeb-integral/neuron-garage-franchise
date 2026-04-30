// Hardcoded 7-step template used to seed onboarding_steps for any new
// onboarding_records row. Titles roughly mirror the existing wizard labels.
export interface OnboardingStepTemplate {
  step_index: number;
  title: string;
  description: string;
}

export const ONBOARDING_STEP_TEMPLATE: OnboardingStepTemplate[] = [
  { step_index: 0, title: "Step 1 – Welcome & Kickoff", description: "Send welcome packet and schedule kickoff call." },
  { step_index: 1, title: "Step 2 – Process Roadmap Review", description: "Walk through the franchisee onboarding roadmap." },
  { step_index: 2, title: "Step 3 – Market Analysis", description: "Review territory and market analysis with franchisee." },
  { step_index: 3, title: "Step 4 – FDD & Legal Review", description: "Deliver FDD and complete cooling-off period." },
  { step_index: 4, title: "Step 5 – Site Selection & Buildout", description: "Identify location and begin buildout planning." },
  { step_index: 5, title: "Step 6 – Training & Certification", description: "Complete operator training program." },
  { step_index: 6, title: "Step 7 – Grand Opening", description: "Final readiness checks and launch day." },
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEP_TEMPLATE.length;
