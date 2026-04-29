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

export const sampleCandidates: Candidate[] = [
  {
    id: 1, name: "Sarah Mitchell", city: "Frisco", state: "TX",
    email: "sarah.mitchell@email.com", phone: "(214) 555-0142",
    fitScore: 88, stage: "new_lead", daysInStage: 2,
    assignedTo: "Kaylie", tag: "High Potential", source: "Referral",
    createdDate: "2025-04-14",
    qualificationScores: { teaching: 5, leadership: 4, financial: 4, marketFit: 5, cultureFit: 5 },
    activity: mkActivity([
      { type: "stage_change", author: "System", timestamp: "2025-04-14 09:12", content: "Promoted from Teacher Prospects" },
    ]),
    trialClose: { ...emptyTrialClose }, votes: { ...emptyVotes },
  },
  {
    id: 2, name: "Marcus Johnson", city: "Plano", state: "TX",
    email: "marcus.j@email.com", phone: "(972) 555-0188",
    fitScore: 72, stage: "new_lead", daysInStage: 4,
    assignedTo: "Sam", tag: "Follow-Up", source: "Web Form",
    createdDate: "2025-04-12",
    qualificationScores: { teaching: 4, leadership: 3, financial: 3, marketFit: 4, cultureFit: 4 },
    activity: mkActivity([
      { type: "email", author: "Sam", timestamp: "2025-04-13 10:00", content: "Sent welcome email" },
    ]),
    trialClose: { ...emptyTrialClose }, votes: { ...emptyVotes },
  },
  {
    id: 3, name: "Amanda Rodriguez", city: "Coral Springs", state: "FL",
    email: "amanda.r@email.com", phone: "(954) 555-0177",
    fitScore: 91, stage: "initial_qual", daysInStage: 3,
    assignedTo: "Skylar", tag: "High Potential", source: "Referral",
    createdDate: "2025-04-08",
    qualificationScores: { teaching: 5, leadership: 5, financial: 4, marketFit: 5, cultureFit: 5 },
    activity: mkActivity([
      { type: "call", author: "Skylar", timestamp: "2025-04-13 14:30", content: "Initial qualification call completed - very engaged" },
      { type: "note", author: "Skylar", timestamp: "2025-04-13 15:00", content: "Strong leadership background, current AP at school" },
    ]),
    trialClose: { ...emptyTrialClose, answeredQuestions: true, prospectSummarized: true }, votes: { ...emptyVotes },
  },
  {
    id: 4, name: "James Carter", city: "Austin", state: "TX",
    email: "james.carter@email.com", phone: "(512) 555-0199",
    fitScore: 65, stage: "initial_qual", daysInStage: 6,
    assignedTo: "Kaylie", tag: "Follow-Up", source: "LinkedIn",
    createdDate: "2025-04-06",
    qualificationScores: { teaching: 4, leadership: 3, financial: 2, marketFit: 4, cultureFit: 4 },
    activity: mkActivity([
      { type: "call", author: "Kaylie", timestamp: "2025-04-10 11:00", content: "Qualification call - financial picture unclear" },
    ]),
    trialClose: { ...emptyTrialClose }, votes: { ...emptyVotes },
  },
  {
    id: 5, name: "Patricia Williams", city: "Tampa", state: "FL",
    email: "patricia.w@email.com", phone: "(813) 555-0156",
    fitScore: 84, stage: "signing", daysInStage: 5,
    assignedTo: "Sam", tag: "High Potential", source: "Referral",
    createdDate: "2025-04-01",
    qualificationScores: { teaching: 5, leadership: 4, financial: 4, marketFit: 4, cultureFit: 5 },
    activity: mkActivity([
      { type: "call", author: "Sam", timestamp: "2025-04-11 13:00", content: "Business Overview call - reviewed unit economics" },
      { type: "note", author: "Sam", timestamp: "2025-04-11 14:00", content: "Completed Part 1 RFC, sent Part 2" },
    ]),
    trialClose: { ...emptyTrialClose, answeredQuestions: true, prospectSummarized: true, scheduledNextCall: true }, votes: { ...emptyVotes },
  },
  {
    id: 6, name: "Brian Thompson", city: "Frisco", state: "TX",
    email: "brian.t@email.com", phone: "(214) 555-0123",
    fitScore: 78, stage: "fdd_review", daysInStage: 8,
    assignedTo: "Skylar", tag: "Active", source: "Discovery Day",
    createdDate: "2025-03-20", fddSentDate: "2025-04-08",
    qualificationScores: { teaching: 4, leadership: 4, financial: 4, marketFit: 4, cultureFit: 4 },
    activity: mkActivity([
      { type: "email", author: "Skylar", timestamp: "2025-04-08 09:00", content: "FDD sent for 16-day review period" },
      { type: "note", author: "Skylar", timestamp: "2025-04-09 10:00", content: "Authorized background and credit check" },
    ]),
    trialClose: { ...emptyTrialClose }, votes: { ...emptyVotes },
  },
  {
    id: 7, name: "Lisa Nguyen", city: "Plano", state: "TX",
    email: "lisa.nguyen@email.com", phone: "(972) 555-0144",
    fitScore: 89, stage: "immersion", daysInStage: 4,
    assignedTo: "Kaylie", tag: "High Potential", source: "Referral",
    createdDate: "2025-03-15", fddSentDate: "2025-03-25",
    qualificationScores: { teaching: 5, leadership: 5, financial: 5, marketFit: 4, cultureFit: 5 },
    activity: mkActivity([
      { type: "note", author: "Kaylie", timestamp: "2025-04-12 16:00", content: "Visited HQ for immersion day - excellent fit" },
    ]),
    trialClose: { ...emptyTrialClose, answeredQuestions: true, prospectSummarized: true, askedToMoveForward: true, scheduledNextCall: true, assignedHomework: true },
    votes: { Kaylie: "approve", Sam: null, Skylar: null },
  },
  {
    id: 8, name: "Rebecca Foster", city: "Orlando", state: "FL",
    email: "rebecca.f@email.com", phone: "(407) 555-0167",
    fitScore: 81, stage: "immersion", daysInStage: 6,
    assignedTo: "Sam", tag: "Active", source: "Web Form",
    createdDate: "2025-03-10", fddSentDate: "2025-03-22",
    qualificationScores: { teaching: 4, leadership: 4, financial: 4, marketFit: 5, cultureFit: 4 },
    activity: mkActivity([
      { type: "call", author: "Sam", timestamp: "2025-04-10 11:00", content: "Immersion debrief - committee review pending" },
    ]),
    trialClose: { ...emptyTrialClose, answeredQuestions: true, prospectSummarized: true },
    votes: { Kaylie: "approve", Sam: "approve", Skylar: null },
  },
  {
    id: 9, name: "David Chen", city: "Austin", state: "TX",
    email: "david.chen@email.com", phone: "(512) 555-0133",
    fitScore: 86, stage: "confirmation", daysInStage: 3,
    assignedTo: "Skylar", tag: "High Potential", source: "Referral",
    createdDate: "2025-02-28", fddSentDate: "2025-03-14",
    qualificationScores: { teaching: 5, leadership: 4, financial: 5, marketFit: 4, cultureFit: 5 },
    activity: mkActivity([
      { type: "call", author: "Skylar", timestamp: "2025-04-13 10:00", content: "Confirmation call - ready to sign" },
    ]),
    trialClose: { ...emptyTrialClose, answeredQuestions: true, prospectSummarized: true, askedToMoveForward: true, scheduledNextCall: true, assignedHomework: true },
    votes: { Kaylie: "approve", Sam: "approve", Skylar: "approve" },
  },
  {
    id: 10, name: "Kevin Patel", city: "Coral Springs", state: "FL",
    email: "kevin.patel@email.com", phone: "(954) 555-0119",
    fitScore: 93, stage: "signing", daysInStage: 1,
    assignedTo: "Kaylie", tag: "Qualified", source: "Referral",
    createdDate: "2025-02-15", fddSentDate: "2025-03-05",
    qualificationScores: { teaching: 5, leadership: 5, financial: 5, marketFit: 5, cultureFit: 5 },
    activity: mkActivity([
      { type: "stage_change", author: "Kaylie", timestamp: "2025-04-15 09:00", content: "Moved to Signing - franchise agreement prepared" },
    ]),
    trialClose: { answeredQuestions: true, prospectSummarized: true, askedToMoveForward: true, scheduledNextCall: true, assignedHomework: true },
    votes: { Kaylie: "approve", Sam: "approve", Skylar: "approve" },
  },
];

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
