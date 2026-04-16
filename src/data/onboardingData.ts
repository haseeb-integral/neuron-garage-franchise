export type OnboardingStatus = "on_track" | "stalled" | "overdue";

export interface StepDefinition {
  id: number;
  title: string;
  goal: string;
  defaultTasks: string[];
  formFields: { key: string; label: string; type: "text" | "textarea" | "email" | "tel" | "date" | "number" }[];
  commTrigger?: string;
}

export interface ActivityEvent {
  id: string;
  type: "note" | "step_complete" | "email_sent" | "task_complete" | "file_upload";
  author: string;
  timestamp: string;
  content: string;
}

export interface CommStatus {
  key: string;
  name: string;
  triggerLabel: string;
  sent: boolean;
  sentDate?: string;
}

export interface StepData {
  tasks: { id: string; label: string; done: boolean }[];
  form: Record<string, string>;
  files: { id: string; name: string; size: string }[];
  notes: string;
  completionDate?: string;
}

export interface Franchisee {
  id: string;
  name: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  currentStep: number;
  daysElapsed: number;
  status: OnboardingStatus;
  startDate: string;
  fddSentDate?: string;
  stepData: Record<number, StepData>;
  activity: ActivityEvent[];
  comms: CommStatus[];
}

export const STEPS: StepDefinition[] = [
  {
    id: 1,
    title: "Lead Generation",
    goal: "Capture initial prospect information and qualify the source.",
    defaultTasks: [
      "Capture contact info from inbound source",
      "Verify email and phone",
      "Send Welcome Email",
      "Assign to franchise development rep",
    ],
    formFields: [
      { key: "fullName", label: "Full Name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "source", label: "Lead Source", type: "text" },
    ],
    commTrigger: "Welcome Email",
  },
  {
    id: 2,
    title: "Initial Qualification Call",
    goal: "Complete the Franchise Lead Sheet and confirm baseline fit.",
    defaultTasks: [
      "Schedule 30-min qualification call",
      "Complete Franchise Lead Sheet",
      "Send Process Roadmap email",
      "Log call notes",
    ],
    formFields: [
      { key: "who", label: "Who (background, family, work history)", type: "textarea" },
      { key: "where", label: "Where (target market/cities)", type: "textarea" },
      { key: "when", label: "When (target launch timeline)", type: "text" },
      { key: "source", label: "Source (how they heard about us)", type: "text" },
      { key: "financial", label: "Financial (liquid + net worth)", type: "textarea" },
      { key: "why", label: "Why (motivation to franchise)", type: "textarea" },
      { key: "competition", label: "Competition (other concepts considered)", type: "textarea" },
    ],
    commTrigger: "Process Roadmap",
  },
  {
    id: 3,
    title: "Business Overview Call",
    goal: "Walk prospect through the business model, unit economics, and market opportunity.",
    defaultTasks: [
      "Schedule Business Overview call",
      "Share market analysis deck",
      "Answer financial model questions",
      "Send Market Analysis email",
    ],
    formFields: [
      { key: "overviewNotes", label: "Overview Call Notes", type: "textarea" },
      { key: "questions", label: "Key Questions Raised", type: "textarea" },
      { key: "nextStepDate", label: "Next Step Scheduled", type: "date" },
    ],
    commTrigger: "Market Analysis",
  },
  {
    id: 4,
    title: "FDD & Agreement Review",
    goal: "Deliver the Franchise Disclosure Document and observe the mandatory 16-day waiting period.",
    defaultTasks: [
      "Send FDD via secure portal",
      "Confirm receipt acknowledgment",
      "Schedule legal Q&A session",
      "Track 16-day cooling-off period",
    ],
    formFields: [
      { key: "fddSentDate", label: "FDD Sent Date", type: "date" },
      { key: "legalQADate", label: "Legal Q&A Session", type: "date" },
      { key: "fddNotes", label: "Review Notes", type: "textarea" },
    ],
    commTrigger: "FDD Document",
  },
  {
    id: 5,
    title: "Business Immersion & Evaluation",
    goal: "Bring prospect on-site to experience operations and validate cultural fit.",
    defaultTasks: [
      "Schedule 2-day immersion at flagship",
      "Operations walkthrough",
      "Meet franchisee community",
      "Complete evaluation scorecard",
    ],
    formFields: [
      { key: "immersionStart", label: "Immersion Start", type: "date" },
      { key: "immersionEnd", label: "Immersion End", type: "date" },
      { key: "evaluation", label: "Evaluation Notes", type: "textarea" },
    ],
  },
  {
    id: 6,
    title: "Confirmation Call",
    goal: "Confirm mutual commitment to move into Signing.",
    defaultTasks: [
      "Schedule Confirmation Call",
      "Review territory selection",
      "Confirm financing readiness",
      "Send Congratulations / Franchise Awarded email",
    ],
    formFields: [
      { key: "confirmationDate", label: "Confirmation Date", type: "date" },
      { key: "territory", label: "Awarded Territory", type: "text" },
      { key: "confirmationNotes", label: "Confirmation Notes", type: "textarea" },
    ],
    commTrigger: "Congratulations / Franchise Awarded",
  },
  {
    id: 7,
    title: "Signing Call",
    goal: "Execute the Franchise Agreement and transition to active onboarding.",
    defaultTasks: [
      "Final document review",
      "Execute Franchise Agreement",
      "Collect initial franchise fee",
      "Send Donut Delivery Note + Onboarding Access",
    ],
    formFields: [
      { key: "signingDate", label: "Signing Date", type: "date" },
      { key: "feeCollected", label: "Initial Fee Collected", type: "text" },
      { key: "signingNotes", label: "Signing Notes", type: "textarea" },
    ],
    commTrigger: "Donut Delivery Note + Onboarding Access",
  },
];

const buildEmptyStepData = (): Record<number, StepData> => {
  const out: Record<number, StepData> = {};
  STEPS.forEach((s) => {
    out[s.id] = {
      tasks: s.defaultTasks.map((t, i) => ({ id: `t-${s.id}-${i}`, label: t, done: false })),
      form: {},
      files: [],
      notes: "",
    };
  });
  return out;
};

const buildComms = (): CommStatus[] => [
  { key: "welcome", name: "Welcome Email", triggerLabel: "After Step 1", sent: false },
  { key: "roadmap", name: "Process Roadmap", triggerLabel: "After Step 2", sent: false },
  { key: "market", name: "Market Analysis", triggerLabel: "After Step 3", sent: false },
  { key: "fdd", name: "FDD Document", triggerLabel: "After Step 4", sent: false },
  { key: "awarded", name: "Congratulations / Franchise Awarded", triggerLabel: "After Step 6", sent: false },
  { key: "donut", name: "Donut Delivery Note + Onboarding Access", triggerLabel: "After Step 7", sent: false },
];

const markCommsSentThrough = (comms: CommStatus[], throughStep: number, baseDate: string): CommStatus[] => {
  const map: Record<number, string> = { 1: "welcome", 2: "roadmap", 3: "market", 4: "fdd", 6: "awarded", 7: "donut" };
  return comms.map((c) => {
    const stepForKey = Object.entries(map).find(([, v]) => v === c.key)?.[0];
    if (stepForKey && Number(stepForKey) <= throughStep) {
      return { ...c, sent: true, sentDate: baseDate };
    }
    return c;
  });
};

const seedFranchisee = (
  partial: Pick<Franchisee, "id" | "name" | "city" | "state" | "email" | "phone" | "currentStep" | "daysElapsed" | "status" | "startDate"> & {
    fddSentDate?: string;
    formOverrides?: Record<number, Record<string, string>>;
    completed?: number[];
    activity: ActivityEvent[];
  },
): Franchisee => {
  const stepData = buildEmptyStepData();
  (partial.completed ?? []).forEach((s) => {
    stepData[s].tasks = stepData[s].tasks.map((t) => ({ ...t, done: true }));
    stepData[s].completionDate = partial.startDate;
  });
  if (partial.formOverrides) {
    Object.entries(partial.formOverrides).forEach(([k, v]) => {
      stepData[Number(k)].form = { ...stepData[Number(k)].form, ...v };
    });
  }
  return {
    id: partial.id,
    name: partial.name,
    city: partial.city,
    state: partial.state,
    email: partial.email,
    phone: partial.phone,
    currentStep: partial.currentStep,
    daysElapsed: partial.daysElapsed,
    status: partial.status,
    startDate: partial.startDate,
    fddSentDate: partial.fddSentDate,
    stepData,
    activity: partial.activity,
    comms: markCommsSentThrough(buildComms(), partial.currentStep - 1, partial.startDate),
  };
};

export const SAMPLE_FRANCHISEES: Franchisee[] = [
  seedFranchisee({
    id: "f-001",
    name: "Sarah Mitchell",
    city: "Frisco",
    state: "TX",
    email: "sarah.mitchell@example.com",
    phone: "(469) 555-0142",
    currentStep: 3,
    daysElapsed: 14,
    status: "on_track",
    startDate: "2026-04-02",
    completed: [1, 2],
    formOverrides: {
      1: { fullName: "Sarah Mitchell", email: "sarah.mitchell@example.com", phone: "(469) 555-0142", source: "Franchise Expo Dallas" },
      2: {
        who: "Former K-12 principal, 18 years in education leadership",
        where: "North Dallas suburbs — Frisco, Plano",
        when: "Q3 2026 launch target",
        source: "Franchise Expo Dallas",
        financial: "Liquid: $480K · Net Worth: $1.6M",
        why: "Wants mission-aligned business after retiring from district",
        competition: "Looked at Mathnasium and Kumon",
      },
    },
    activity: [
      { id: "a1", type: "step_complete", author: "System", timestamp: "2026-04-08 10:14", content: "Step 2 (Initial Qualification Call) marked complete." },
      { id: "a2", type: "email_sent", author: "System", timestamp: "2026-04-08 10:15", content: "Process Roadmap email sent." },
      { id: "a3", type: "note", author: "James Park", timestamp: "2026-04-12 14:32", content: "Strong cultural fit. Scheduling Business Overview for next week." },
    ],
  }),
  seedFranchisee({
    id: "f-002",
    name: "Marcus Johnson",
    city: "Tampa",
    state: "FL",
    email: "marcus.j@example.com",
    phone: "(813) 555-0188",
    currentStep: 4,
    daysElapsed: 45,
    status: "overdue",
    startDate: "2026-03-15",
    fddSentDate: "2026-04-05",
    completed: [1, 2, 3],
    formOverrides: {
      1: { fullName: "Marcus Johnson", email: "marcus.j@example.com", phone: "(813) 555-0188", source: "Referral — existing franchisee" },
      4: { fddSentDate: "2026-04-05", fddNotes: "Awaiting completion of 16-day cooling period before scheduling immersion." },
    },
    activity: [
      { id: "a1", type: "step_complete", author: "System", timestamp: "2026-04-04 09:20", content: "Step 3 (Business Overview Call) marked complete." },
      { id: "a2", type: "email_sent", author: "System", timestamp: "2026-04-05 11:00", content: "FDD Document sent via secure portal." },
      { id: "a3", type: "note", author: "Lisa Chen", timestamp: "2026-04-11 16:45", content: "Marcus has not responded to last two follow-ups. Flagged as stalled." },
    ],
  }),
  seedFranchisee({
    id: "f-003",
    name: "Patricia Williams",
    city: "Plano",
    state: "TX",
    email: "p.williams@example.com",
    phone: "(972) 555-0167",
    currentStep: 6,
    daysElapsed: 58,
    status: "on_track",
    startDate: "2026-02-17",
    fddSentDate: "2026-03-08",
    completed: [1, 2, 3, 4, 5],
    formOverrides: {
      1: { fullName: "Patricia Williams", email: "p.williams@example.com", phone: "(972) 555-0167", source: "Inbound web inquiry" },
      6: { territory: "Plano + West Plano (3 zip codes)", confirmationNotes: "Financing approved through First Bank. Targeting May signing." },
    },
    activity: [
      { id: "a1", type: "step_complete", author: "System", timestamp: "2026-03-25 09:30", content: "Step 4 (FDD & Agreement Review) marked complete." },
      { id: "a2", type: "step_complete", author: "System", timestamp: "2026-04-09 17:00", content: "Step 5 (Business Immersion) marked complete — excellent evaluation." },
      { id: "a3", type: "note", author: "James Park", timestamp: "2026-04-14 11:20", content: "Confirmation Call scheduled for Friday. All systems go." },
    ],
  }),
];

export const computeProgressPct = (currentStep: number) => Math.round(((currentStep - 1) / 7) * 100);
