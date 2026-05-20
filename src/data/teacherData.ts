export type TeacherTag = "High Potential" | "Follow-Up" | "Not a Fit" | "Untagged";
export type EnrichmentStatus = "Enriched" | "Pending";
export type GradeLevel = "K-2" | "3-5" | "6-8";

export interface TeacherProspect {
  id: number;
  cityId: number;
  name: string;
  school: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  linkedin: string;
  fitScore: number;
  tag: TeacherTag;
  enrichmentStatus: EnrichmentStatus;
  gradeLevel: GradeLevel;
  yearsExperience: number;
  hasSummerCampExp: boolean;
  aiReasoning: string;
  tags: string[];
  notes: string;
  // v1.0 — real source provenance from `teacher_prospects` rows
  enrichmentSource?: string | null;
  verificationStatus?: string | null;
  needsEmailEnrichment?: boolean;
  district?: string | null;
  gradeRaw?: string | null;
}

// Dummy seed data removed in v1.0 of Teacher Search. The page now reads from
// the live `teacher_prospects` table. The empty export is retained so other
// surfaces (GlobalSearch, JourneyBar) keep compiling until they are migrated.
export const sampleTeachers: TeacherProspect[] = [];

export function generateProspectsForCity(cityId: number, city: string, state: string, startId: number): TeacherProspect[] {
  const firstNames = ["Emily", "Daniel", "Sophia", "Ryan", "Olivia"];
  const lastNames = ["Anderson", "Martinez", "Lee", "Walker", "Hall"];
  const schools = [`${city} Elementary`, `${city} Heights Elementary`, `${city} Heritage Elementary`, `${city} Pioneer Elementary`, `${city} Oaks Elementary`];
  const grades: GradeLevel[] = ["K-2", "3-5", "6-8"];
  const tags: TeacherTag[] = ["High Potential", "Follow-Up", "Untagged"];

  return Array.from({ length: 5 }, (_, i) => {
    const fitScore = Math.floor(Math.random() * 50) + 45;
    return {
      id: startId + i,
      cityId,
      name: `${firstNames[i]} ${lastNames[i]}`,
      school: schools[i],
      city,
      state,
      email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@${city.toLowerCase().replace(/\s/g, "")}.edu`,
      phone: `(555) 555-0${100 + i}0`,
      linkedin: `linkedin.com/in/${firstNames[i].toLowerCase()}${lastNames[i].toLowerCase()}`,
      fitScore,
      tag: tags[i % tags.length],
      enrichmentStatus: i % 2 === 0 ? "Enriched" : "Pending",
      gradeLevel: grades[i % grades.length],
      yearsExperience: Math.floor(Math.random() * 15) + 2,
      hasSummerCampExp: i % 2 === 0,
      aiReasoning: `Newly discovered prospect from ${city}. Initial scoring based on public profile data. Further enrichment recommended.`,
      tags: [],
      notes: "",
    };
  });
}
