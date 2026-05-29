export type StageId =
  | "new_lead"
  | "initial_qual"
  | "business_overview"
  | "fdd_review"
  | "immersion"
  | "confirmation"
  | "signing"
  | "disqualified";

export interface Stage {
  id: StageId;
  label: string;
  short: string;
}

export const STAGES: Stage[] = [
  { id: "new_lead", label: "New Lead", short: "New Lead" },
  { id: "initial_qual", label: "Initial Qualification Call", short: "Initial Qual" },
  { id: "business_overview", label: "Business Overview Call", short: "Business Overview" },
  { id: "fdd_review", label: "FDD & Agreement Review", short: "FDD Review" },
  { id: "immersion", label: "Business Immersion & Evaluation", short: "Immersion" },
  { id: "confirmation", label: "Confirmation Call", short: "Confirmation" },
  { id: "signing", label: "Signing Call / Qualified", short: "Signing" },
  { id: "disqualified", label: "Disqualified", short: "Disqualified" },
];

export interface QualificationScores {
  teaching: number;
  leadership: number;
  financial: number;
  marketFit: number;
  cultureFit: number;
}

export interface ActivityEntry {
  id: number;
  type: "note" | "call" | "email" | "stage_change";
  author: string;
  timestamp: string;
  content: string;
}

export interface TrialClose {
  answeredQuestions: boolean;
  prospectSummarized: boolean;
  askedToMoveForward: boolean;
  scheduledNextCall: boolean;
  assignedHomework: boolean;
}

export interface CommitteeVotes {
  Kaylie: "approve" | "decline" | null;
  Sam: "approve" | "decline" | null;
  Skylar: "approve" | "decline" | null;
}


export interface Candidate {
  id: number;
  name: string;
  city: string;
  state: string;
  email: string;
  otherEmail?: string;
  phone: string;
  fitScore: number;
  stage: StageId;
  daysInStage: number;
  assignedTo: string;
  tag: string;
  source: string;
  createdDate: string;
  fddSentDate?: string;
  /** Optional candidate portrait URL. When set, CandidateAvatar renders the image; otherwise initials. */
  photoUrl?: string;
  // Tier 2 additions (all optional, candidate-only)
  otherOpportunities?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  partnerInvolved?: boolean;
  partnerName?: string;
  partnerEmail?: string;
  partnerPhone?: string;
  backgroundCheckCompletedAt?: string; // ISO date (YYYY-MM-DD)
  creditCheckCompletedAt?: string;
  qualificationScores: QualificationScores;
  activity: ActivityEntry[];
  trialClose: TrialClose;
  votes: CommitteeVotes;
}



const REGISTRATION_STATES = ["NY", "CA", "IL", "MD", "MN", "ND", "RI", "SD", "VA", "WA", "WI", "HI", "IN", "MI"];
export const stateRequiresRegistration = (state: string) => REGISTRATION_STATES.includes(state);

const emptyTrialClose: TrialClose = {
  answeredQuestions: false,
  prospectSummarized: false,
  askedToMoveForward: false,
  scheduledNextCall: false,
  assignedHomework: false,
};

const emptyVotes: CommitteeVotes = { Kaylie: null, Sam: null, Skylar: null };

const mkActivity = (entries: Omit<ActivityEntry, "id">[]): ActivityEntry[] =>
  entries.map((e, i) => ({ ...e, id: i + 1 }));

// sampleCandidates removed — all candidates load from the database.


export const STAGE_HOMEWORK: Partial<Record<StageId, string[]>> = {
  new_lead: ["Schedule Initial Qualification Call within 5 business days"],
  initial_qual: ["Complete Request for Consideration Part 1 (non-financial) — due 2 days before next call"],
  business_overview: [
    "Complete Part 2 (financial)",
    "Read Mindset by Carol Dweck",
    "Authorize background and credit check",
  ],
  fdd_review: ["Review FDD thoroughly", "Prepare questions for legal/financial advisors"],
  immersion: ["Visit HQ for immersion day", "Meet with Selection Committee"],
  confirmation: ["Final review of franchise agreement", "Confirm funding readiness"],
  signing: ["Sign franchise agreement", "Wire initial franchise fee"],
};

// 6-step process roadmap per stage. Seeded once per candidate; any staff member can edit inline.
export const STAGE_PROCESS_ROADMAP: Partial<Record<StageId, string[]>> = {
  new_lead: [
    "Confirm lead source and assigned owner",
    "Send welcome email with intro materials",
    "Schedule Initial Qualification Call",
    "Log expectations and timeline",
    "Confirm contact info and best channel",
    "Set follow-up reminder",
  ],
  initial_qual: [
    "Send RFC Part 1 (non-financial) prior to call",
    "Hold Initial Qualification Call",
    "Capture motivation, background, timeline",
    "Score qualification rubric",
    "Decide advance / hold / disqualify",
    "Schedule Business Overview Call",
  ],
  business_overview: [
    "Send RFC Part 2 (financial) prior to call",
    "Hold Business Overview Call (unit economics)",
    "Confirm liquid capital and net worth",
    "Authorize background and credit check",
    "Recommend reading: Mindset by Carol Dweck",
    "Schedule FDD review",
  ],
  fdd_review: [
    "Send FDD and start 16-day clock",
    "Confirm receipt and acknowledgement",
    "Offer Q&A with legal/financial advisors",
    "Mid-period check-in",
    "Collect outstanding questions",
    "Schedule Immersion day after lock clears",
  ],
  immersion: [
    "Coordinate HQ immersion day logistics",
    "Host immersion: training, ops, culture",
    "Selection Committee meet & greet",
    "Capture committee impressions",
    "Debrief with candidate",
    "Schedule Confirmation Call",
  ],
  confirmation: [
    "Send pre-call agenda and open items",
    "Hold Confirmation Call",
    "Answer remaining questions",
    "Confirm funding readiness",
    "Capture committee votes",
    "Schedule Signing Call",
  ],
  signing: [
    "Prepare franchise agreement package",
    "Hold Signing Call",
    "Execute franchise agreement",
    "Wire initial franchise fee",
    "Hand off to Onboarding",
    "Mark candidate Qualified",
  ],
};
