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
}

export const sampleTeachers: TeacherProspect[] = [
  // Frisco, TX (cityId: 1)
  { id: 1, cityId: 1, name: "Sarah Mitchell", school: "Frisco Elementary", city: "Frisco", state: "TX",
    email: "smitchell@frisco.edu", phone: "(469) 555-0142", linkedin: "linkedin.com/in/sarahmitchell",
    fitScore: 92, tag: "High Potential", enrichmentStatus: "Enriched", gradeLevel: "3-5",
    yearsExperience: 8, hasSummerCampExp: true,
    aiReasoning: "Strong STEM background with 8 years of teaching. Has led summer camps at YMCA. Active community presence and shows entrepreneurial interest in side projects.",
    tags: ["STEM", "Camp Lead"], notes: "" },
  { id: 2, cityId: 1, name: "Marcus Johnson", school: "Pioneer Heritage Elementary", city: "Frisco", state: "TX",
    email: "mjohnson@friscoisd.org", phone: "(469) 555-0188", linkedin: "linkedin.com/in/marcusj",
    fitScore: 85, tag: "High Potential", enrichmentStatus: "Enriched", gradeLevel: "6-8",
    yearsExperience: 12, hasSummerCampExp: true,
    aiReasoning: "Veteran educator with strong leadership experience. Coaches robotics team. Expressed interest in business ownership.",
    tags: ["Robotics"], notes: "" },
  { id: 3, cityId: 1, name: "Jennifer Park", school: "Spears Elementary", city: "Frisco", state: "TX",
    email: "jpark@frisco.edu", phone: "(469) 555-0211", linkedin: "linkedin.com/in/jenniferpark",
    fitScore: 68, tag: "Follow-Up", enrichmentStatus: "Pending", gradeLevel: "K-2",
    yearsExperience: 5, hasSummerCampExp: false,
    aiReasoning: "Solid teaching background but no summer camp experience yet. Worth a follow-up conversation about interest in entrepreneurship.",
    tags: [], notes: "" },
  { id: 4, cityId: 1, name: "David Chen", school: "Allen Elementary", city: "Frisco", state: "TX",
    email: "dchen@frisco.edu", phone: "(469) 555-0299", linkedin: "linkedin.com/in/davidchen",
    fitScore: 42, tag: "Not a Fit", enrichmentStatus: "Enriched", gradeLevel: "3-5",
    yearsExperience: 3, hasSummerCampExp: false,
    aiReasoning: "Early-career teacher, currently focused on building classroom experience. Not seeking entrepreneurial opportunities at this time.",
    tags: [], notes: "" },

  // Plano, TX (cityId: 2)
  { id: 5, cityId: 2, name: "Amanda Rodriguez", school: "Plano West Elementary", city: "Plano", state: "TX",
    email: "arodriguez@pisd.edu", phone: "(972) 555-0312", linkedin: "linkedin.com/in/amandarodriguez",
    fitScore: 88, tag: "High Potential", enrichmentStatus: "Enriched", gradeLevel: "6-8",
    yearsExperience: 10, hasSummerCampExp: true,
    aiReasoning: "Bilingual educator with strong community ties. Ran successful summer enrichment program for 3 years. High match for franchise model.",
    tags: ["Bilingual", "Camp Lead"], notes: "" },
  { id: 6, cityId: 2, name: "Brian Thompson", school: "Plano Elementary", city: "Plano", state: "TX",
    email: "bthompson@pisd.edu", phone: "(972) 555-0345", linkedin: "linkedin.com/in/brianthompson",
    fitScore: 76, tag: "Follow-Up", enrichmentStatus: "Enriched", gradeLevel: "K-2",
    yearsExperience: 7, hasSummerCampExp: true,
    aiReasoning: "Experienced primary teacher with camp counselor history. Moderate interest in business ownership signals.",
    tags: [], notes: "" },
  { id: 7, cityId: 2, name: "Lisa Nguyen", school: "Haggard Elementary", city: "Plano", state: "TX",
    email: "lnguyen@pisd.edu", phone: "(972) 555-0388", linkedin: "linkedin.com/in/lisanguyen",
    fitScore: 81, tag: "High Potential", enrichmentStatus: "Pending", gradeLevel: "6-8",
    yearsExperience: 9, hasSummerCampExp: true,
    aiReasoning: "STEM specialist with strong network. Recently posted about wanting to make broader impact beyond classroom.",
    tags: ["STEM"], notes: "" },
  { id: 8, cityId: 2, name: "Michael O'Brien", school: "Bowman Elementary", city: "Plano", state: "TX",
    email: "mobrien@pisd.edu", phone: "(972) 555-0401", linkedin: "linkedin.com/in/mikeobrien",
    fitScore: 55, tag: "Follow-Up", enrichmentStatus: "Pending", gradeLevel: "3-5",
    yearsExperience: 4, hasSummerCampExp: false,
    aiReasoning: "Mid-tier fit. No summer camp background but shows leadership potential through department roles.",
    tags: [], notes: "" },

  // Coral Springs, FL (cityId: 3)
  { id: 9, cityId: 3, name: "Patricia Williams", school: "Coral Springs Elementary", city: "Coral Springs", state: "FL",
    email: "pwilliams@browardschools.com", phone: "(954) 555-0512", linkedin: "linkedin.com/in/patwilliams",
    fitScore: 90, tag: "High Potential", enrichmentStatus: "Enriched", gradeLevel: "K-2",
    yearsExperience: 15, hasSummerCampExp: true,
    aiReasoning: "Highly experienced educator with proven leadership. Founded after-school enrichment program. Top fit for franchisee profile.",
    tags: ["Founder", "Camp Lead"], notes: "" },
  { id: 10, cityId: 3, name: "James Carter", school: "Westchester Elementary", city: "Coral Springs", state: "FL",
    email: "jcarter@browardschools.com", phone: "(954) 555-0556", linkedin: "linkedin.com/in/jamescarter",
    fitScore: 72, tag: "Follow-Up", enrichmentStatus: "Enriched", gradeLevel: "3-5",
    yearsExperience: 6, hasSummerCampExp: true,
    aiReasoning: "Solid camp experience and good community standing. Worth a deeper conversation about long-term goals.",
    tags: [], notes: "" },
  { id: 11, cityId: 3, name: "Rebecca Foster", school: "Ramblewood Elementary", city: "Coral Springs", state: "FL",
    email: "rfoster@browardschools.com", phone: "(954) 555-0589", linkedin: "linkedin.com/in/rebeccafoster",
    fitScore: 83, tag: "High Potential", enrichmentStatus: "Pending", gradeLevel: "6-8",
    yearsExperience: 11, hasSummerCampExp: true,
    aiReasoning: "Strong educator with entrepreneurial side hustle (tutoring business). Clear signals of interest in scaling impact.",
    tags: ["Entrepreneur"], notes: "" },
  { id: 12, cityId: 3, name: "Kevin Patel", school: "Forest Hills Elementary", city: "Coral Springs", state: "FL",
    email: "kpatel@browardschools.com", phone: "(954) 555-0612", linkedin: "linkedin.com/in/kevinpatel",
    fitScore: 38, tag: "Not a Fit", enrichmentStatus: "Pending", gradeLevel: "3-5",
    yearsExperience: 2, hasSummerCampExp: false,
    aiReasoning: "New to teaching, no relevant business or camp experience. Not a current fit.",
    tags: [], notes: "" },
];

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
