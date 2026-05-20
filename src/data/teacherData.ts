export type TeacherTag = "High Potential" | "Follow-Up" | "Not a Fit" | "Untagged";
export type EnrichmentStatus = "Enriched" | "Pending";
export type GradeLevel = "K-2" | "3-5" | "6-8";
export type ProspectStatus = "new" | "shortlisted" | "in_outreach" | "not_fit" | "replied";

export interface TeacherProspect {
  id: number;            // stable numeric (legacy — used for selection state)
  uuid: string;          // real DB uuid — used for all backend writes
  cityId: number;
  name: string;
  school: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  linkedin: string;      // legacy free-text
  fitScore: number;
  tag: TeacherTag;
  enrichmentStatus: EnrichmentStatus;
  gradeLevel: GradeLevel; // legacy (avoid for new UI)
  yearsExperience: number;
  hasSummerCampExp: boolean;
  aiReasoning: string;
  tags: string[];
  notes: string;
  // v1.0 fields surfaced from teacher_prospects
  enrichmentSource?: string | null;
  verificationStatus?: string | null;
  needsEmailEnrichment?: boolean;
  district?: string | null;
  gradeRaw?: string | null;        // honest grade column (mostly null right now)
  experienceYearsRaw?: number | null;
  // v1.1 — surfaced from raw JSONB + flat columns
  title?: string | null;           // raw.title — e.g. "5th Grade Teacher"
  schoolUrl?: string | null;       // raw.companyWebsite
  linkedinUrl?: string | null;     // flat linkedin_url column
  status?: ProspectStatus;         // teacher_prospects.status
  schoolNcesId?: string | null;
}

// Dummy seed data removed in v1.0. Empty export kept so other surfaces compile.
export const sampleTeachers: TeacherProspect[] = [];

export function generateProspectsForCity(): TeacherProspect[] {
  return [];
}
