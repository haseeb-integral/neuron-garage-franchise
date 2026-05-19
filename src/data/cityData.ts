export interface CityData {
  id: number;
  cityId?: string; // us_cities_scored.id when sourced from live data
  city: string;
  state: string;
  tier: 'A' | 'B' | 'C' | 'D';
  compositeScore: number;
  population: number;
  elementarySchools: number;
  childrenPct: number;
  medianIncome: number;
  competitorCount: number;
  isNonRegistration: boolean;
  notes: string;
  scoreBreakdown: {
    summerCampDemand: number;
    schoolDensity: number;
    childPopulation: number;
    dualIncomeFamilies: number;
    stemJobs: number;
    competitionScore: number;
  };
  competitors: {
    name: string;
    type: string;
    pricing: string;
    capacity: number;
  }[];
}

export const sampleCities: CityData[] = [
  {
    id: 1, city: "Frisco", state: "Texas", tier: "A", compositeScore: 92,
    population: 210015, elementarySchools: 42, childrenPct: 11.8, medianIncome: 128500, competitorCount: 3,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 95, schoolDensity: 90, childPopulation: 88, dualIncomeFamilies: 94, stemJobs: 91, competitionScore: 85 },
    competitors: [
      { name: "Code Ninjas Frisco", type: "Coding Camp", pricing: "$299/week", capacity: 40 },
      { name: "Mathnasium Frisco", type: "STEM Tutoring", pricing: "$250/month", capacity: 30 },
      { name: "iCode Frisco", type: "Tech Camp", pricing: "$275/week", capacity: 35 },
    ],
  },
  {
    id: 2, city: "Plano", state: "Texas", tier: "A", compositeScore: 89,
    population: 285494, elementarySchools: 55, childrenPct: 10.5, medianIncome: 96800, competitorCount: 5,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 88, schoolDensity: 92, childPopulation: 85, dualIncomeFamilies: 90, stemJobs: 87, competitionScore: 78 },
    competitors: [
      { name: "Bricks 4 Kidz Plano", type: "LEGO Camp", pricing: "$225/week", capacity: 25 },
      { name: "Kumon Plano", type: "Learning Center", pricing: "$200/month", capacity: 50 },
      { name: "Code Ninjas Plano", type: "Coding Camp", pricing: "$299/week", capacity: 40 },
    ],
  },
  {
    id: 3, city: "Coral Springs", state: "Florida", tier: "A", compositeScore: 87,
    population: 134394, elementarySchools: 28, childrenPct: 11.2, medianIncome: 72400, competitorCount: 2,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 90, schoolDensity: 85, childPopulation: 87, dualIncomeFamilies: 82, stemJobs: 80, competitionScore: 92 },
    competitors: [
      { name: "Engineering For Kids", type: "STEM Camp", pricing: "$275/week", capacity: 30 },
      { name: "Snapology Coral Springs", type: "Robotics", pricing: "$250/week", capacity: 20 },
      { name: "Camp Invention", type: "Science Camp", pricing: "$260/week", capacity: 35 },
    ],
  },
  {
    id: 4, city: "McKinney", state: "Texas", tier: "B", compositeScore: 78,
    population: 199177, elementarySchools: 35, childrenPct: 10.9, medianIncome: 95200, competitorCount: 4,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 80, schoolDensity: 78, childPopulation: 82, dualIncomeFamilies: 76, stemJobs: 74, competitionScore: 70 },
    competitors: [
      { name: "Code Ninjas McKinney", type: "Coding Camp", pricing: "$299/week", capacity: 40 },
      { name: "Sylvan Learning", type: "Tutoring", pricing: "$200/month", capacity: 45 },
      { name: "KidzArt McKinney", type: "Art Camp", pricing: "$180/week", capacity: 20 },
    ],
  },
  {
    id: 5, city: "Weston", state: "Florida", tier: "B", compositeScore: 75,
    population: 71166, elementarySchools: 15, childrenPct: 10.1, medianIncome: 98300, competitorCount: 2,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 76, schoolDensity: 72, childPopulation: 78, dualIncomeFamilies: 80, stemJobs: 70, competitionScore: 88 },
    competitors: [
      { name: "Bricks 4 Kidz Weston", type: "LEGO Camp", pricing: "$225/week", capacity: 25 },
      { name: "iCode Weston", type: "Tech Camp", pricing: "$275/week", capacity: 30 },
      { name: "Club Scientific", type: "Science Camp", pricing: "$240/week", capacity: 28 },
    ],
  },
  {
    id: 6, city: "Round Rock", state: "Texas", tier: "B", compositeScore: 73,
    population: 135861, elementarySchools: 30, childrenPct: 10.4, medianIncome: 82100, competitorCount: 3,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 74, schoolDensity: 76, childPopulation: 72, dualIncomeFamilies: 70, stemJobs: 78, competitionScore: 68 },
    competitors: [
      { name: "Mathnasium Round Rock", type: "STEM Tutoring", pricing: "$250/month", capacity: 30 },
      { name: "Snapology Round Rock", type: "Robotics", pricing: "$250/week", capacity: 20 },
      { name: "Code Ninjas Round Rock", type: "Coding Camp", pricing: "$299/week", capacity: 40 },
    ],
  },
  {
    id: 7, city: "Wellington", state: "Florida", tier: "C", compositeScore: 62,
    population: 65242, elementarySchools: 12, childrenPct: 9.8, medianIncome: 88700, competitorCount: 1,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 65, schoolDensity: 60, childPopulation: 64, dualIncomeFamilies: 62, stemJobs: 58, competitionScore: 90 },
    competitors: [
      { name: "Kumon Wellington", type: "Learning Center", pricing: "$200/month", capacity: 50 },
      { name: "Club Scientific", type: "Science Camp", pricing: "$240/week", capacity: 28 },
      { name: "Young Engineers", type: "STEM Camp", pricing: "$265/week", capacity: 22 },
    ],
  },
  {
    id: 8, city: "Cedar Park", state: "Texas", tier: "C", compositeScore: 58,
    population: 79462, elementarySchools: 16, childrenPct: 9.5, medianIncome: 91400, competitorCount: 2,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 60, schoolDensity: 55, childPopulation: 62, dualIncomeFamilies: 58, stemJobs: 56, competitionScore: 72 },
    competitors: [
      { name: "Code Ninjas Cedar Park", type: "Coding Camp", pricing: "$299/week", capacity: 40 },
      { name: "Bricks 4 Kidz", type: "LEGO Camp", pricing: "$225/week", capacity: 25 },
      { name: "Mad Science", type: "Science Shows", pricing: "$200/week", capacity: 30 },
    ],
  },
  {
    id: 9, city: "Doral", state: "Florida", tier: "D", compositeScore: 45,
    population: 78015, elementarySchools: 14, childrenPct: 8.9, medianIncome: 62500, competitorCount: 6,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 48, schoolDensity: 50, childPopulation: 44, dualIncomeFamilies: 42, stemJobs: 40, competitionScore: 35 },
    competitors: [
      { name: "Mathnasium Doral", type: "STEM Tutoring", pricing: "$250/month", capacity: 30 },
      { name: "Kumon Doral", type: "Learning Center", pricing: "$200/month", capacity: 50 },
      { name: "iCode Doral", type: "Tech Camp", pricing: "$275/week", capacity: 35 },
    ],
  },
  {
    id: 10, city: "Pflugerville", state: "Texas", tier: "D", compositeScore: 41,
    population: 73883, elementarySchools: 13, childrenPct: 9.1, medianIncome: 78600, competitorCount: 5,
    isNonRegistration: true, notes: "",
    scoreBreakdown: { summerCampDemand: 42, schoolDensity: 44, childPopulation: 40, dualIncomeFamilies: 38, stemJobs: 36, competitionScore: 42 },
    competitors: [
      { name: "Sylvan Learning", type: "Tutoring", pricing: "$200/month", capacity: 45 },
      { name: "KidzArt", type: "Art Camp", pricing: "$180/week", capacity: 20 },
      { name: "Code Ninjas Pflugerville", type: "Coding Camp", pricing: "$299/week", capacity: 40 },
    ],
  },
  // ===== Expanded starter markets (Texas) =====
  {
    id: 11, city: "Austin", state: "Texas", tier: "B", compositeScore: 76,
    population: 974447, elementarySchools: 78, childrenPct: 10.2, medianIncome: 86500, competitorCount: 12,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 82, schoolDensity: 80, childPopulation: 70, dualIncomeFamilies: 84, stemJobs: 90, competitionScore: 55 },
    competitors: [],
  },
  {
    id: 12, city: "Prosper", state: "Texas", tier: "A", compositeScore: 88,
    population: 41660, elementarySchools: 11, childrenPct: 14.2, medianIncome: 152000, competitorCount: 1,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 90, schoolDensity: 86, childPopulation: 92, dualIncomeFamilies: 91, stemJobs: 84, competitionScore: 95 },
    competitors: [],
  },
  {
    id: 13, city: "The Woodlands", state: "Texas", tier: "A", compositeScore: 85,
    population: 114436, elementarySchools: 24, childrenPct: 11.0, medianIncome: 122600, competitorCount: 4,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 86, schoolDensity: 84, childPopulation: 85, dualIncomeFamilies: 88, stemJobs: 82, competitionScore: 80 },
    competitors: [],
  },
  {
    id: 14, city: "Sugar Land", state: "Texas", tier: "B", compositeScore: 80,
    population: 111026, elementarySchools: 22, childrenPct: 10.6, medianIncome: 117400, competitorCount: 3,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 80, schoolDensity: 82, childPopulation: 78, dualIncomeFamilies: 85, stemJobs: 80, competitionScore: 78 },
    competitors: [],
  },
  // ===== Florida =====
  {
    id: 15, city: "Boca Raton", state: "Florida", tier: "B", compositeScore: 78,
    population: 97422, elementarySchools: 18, childrenPct: 9.4, medianIncome: 87800, competitorCount: 4,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 80, schoolDensity: 76, childPopulation: 72, dualIncomeFamilies: 82, stemJobs: 78, competitionScore: 70 },
    competitors: [],
  },
  {
    id: 16, city: "Tampa", state: "Florida", tier: "B", compositeScore: 72,
    population: 384959, elementarySchools: 52, childrenPct: 10.0, medianIncome: 62400, competitorCount: 9,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 76, schoolDensity: 74, childPopulation: 72, dualIncomeFamilies: 70, stemJobs: 74, competitionScore: 60 },
    competitors: [],
  },
  {
    id: 17, city: "Orlando", state: "Florida", tier: "B", compositeScore: 70,
    population: 307573, elementarySchools: 48, childrenPct: 9.8, medianIncome: 60800, competitorCount: 11,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 78, schoolDensity: 72, childPopulation: 70, dualIncomeFamilies: 68, stemJobs: 72, competitionScore: 55 },
    competitors: [],
  },
  {
    id: 18, city: "Naples", state: "Florida", tier: "C", compositeScore: 65,
    population: 19115, elementarySchools: 8, childrenPct: 7.8, medianIncome: 109200, competitorCount: 2,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 68, schoolDensity: 60, childPopulation: 58, dualIncomeFamilies: 72, stemJobs: 64, competitionScore: 80 },
    competitors: [],
  },
  // ===== Arizona =====
  {
    id: 19, city: "Scottsdale", state: "Arizona", tier: "A", compositeScore: 84,
    population: 241361, elementarySchools: 38, childrenPct: 9.6, medianIncome: 97400, competitorCount: 5,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 84, schoolDensity: 82, childPopulation: 78, dualIncomeFamilies: 88, stemJobs: 86, competitionScore: 75 },
    competitors: [],
  },
  {
    id: 20, city: "Chandler", state: "Arizona", tier: "A", compositeScore: 82,
    population: 275987, elementarySchools: 42, childrenPct: 11.4, medianIncome: 92900, competitorCount: 6,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 82, schoolDensity: 84, childPopulation: 84, dualIncomeFamilies: 84, stemJobs: 86, competitionScore: 70 },
    competitors: [],
  },
  {
    id: 21, city: "Gilbert", state: "Arizona", tier: "A", compositeScore: 83,
    population: 267918, elementarySchools: 40, childrenPct: 12.1, medianIncome: 99300, competitorCount: 5,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 84, schoolDensity: 82, childPopulation: 86, dualIncomeFamilies: 86, stemJobs: 82, competitionScore: 75 },
    competitors: [],
  },
  {
    id: 22, city: "Peoria", state: "Arizona", tier: "B", compositeScore: 74,
    population: 190985, elementarySchools: 30, childrenPct: 10.5, medianIncome: 79800, competitorCount: 4,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 74, schoolDensity: 72, childPopulation: 76, dualIncomeFamilies: 74, stemJobs: 72, competitionScore: 76 },
    competitors: [],
  },
  // ===== Colorado =====
  {
    id: 23, city: "Highlands Ranch", state: "Colorado", tier: "A", compositeScore: 86,
    population: 103444, elementarySchools: 22, childrenPct: 12.4, medianIncome: 137200, competitorCount: 3,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 88, schoolDensity: 84, childPopulation: 88, dualIncomeFamilies: 90, stemJobs: 84, competitionScore: 82 },
    competitors: [],
  },
  {
    id: 24, city: "Boulder", state: "Colorado", tier: "B", compositeScore: 76,
    population: 108250, elementarySchools: 20, childrenPct: 8.4, medianIncome: 78900, competitorCount: 4,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 78, schoolDensity: 76, childPopulation: 64, dualIncomeFamilies: 78, stemJobs: 92, competitionScore: 70 },
    competitors: [],
  },
  {
    id: 25, city: "Fort Collins", state: "Colorado", tier: "B", compositeScore: 73,
    population: 169810, elementarySchools: 28, childrenPct: 9.2, medianIncome: 73600, competitorCount: 4,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 74, schoolDensity: 74, childPopulation: 70, dualIncomeFamilies: 72, stemJobs: 78, competitionScore: 70 },
    competitors: [],
  },
  // ===== North Carolina =====
  {
    id: 26, city: "Cary", state: "North Carolina", tier: "A", compositeScore: 87,
    population: 174721, elementarySchools: 32, childrenPct: 12.0, medianIncome: 122600, competitorCount: 4,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 88, schoolDensity: 86, childPopulation: 86, dualIncomeFamilies: 90, stemJobs: 88, competitionScore: 80 },
    competitors: [],
  },
  {
    id: 27, city: "Raleigh", state: "North Carolina", tier: "B", compositeScore: 78,
    population: 467665, elementarySchools: 64, childrenPct: 10.4, medianIncome: 72300, competitorCount: 8,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 80, schoolDensity: 80, childPopulation: 76, dualIncomeFamilies: 78, stemJobs: 84, competitionScore: 68 },
    competitors: [],
  },
  {
    id: 28, city: "Charlotte", state: "North Carolina", tier: "B", compositeScore: 75,
    population: 874579, elementarySchools: 102, childrenPct: 10.6, medianIncome: 70300, competitorCount: 14,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 78, schoolDensity: 78, childPopulation: 76, dualIncomeFamilies: 76, stemJobs: 78, competitionScore: 60 },
    competitors: [],
  },
  // ===== Georgia =====
  {
    id: 29, city: "Alpharetta", state: "Georgia", tier: "A", compositeScore: 85,
    population: 65818, elementarySchools: 16, childrenPct: 11.6, medianIncome: 119200, competitorCount: 3,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 86, schoolDensity: 84, childPopulation: 84, dualIncomeFamilies: 88, stemJobs: 86, competitionScore: 82 },
    competitors: [],
  },
  {
    id: 30, city: "Johns Creek", state: "Georgia", tier: "A", compositeScore: 84,
    population: 81216, elementarySchools: 18, childrenPct: 12.2, medianIncome: 132400, competitorCount: 2,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 84, schoolDensity: 82, childPopulation: 86, dualIncomeFamilies: 90, stemJobs: 82, competitionScore: 88 },
    competitors: [],
  },
  // ===== Virginia =====
  {
    id: 31, city: "Ashburn", state: "Virginia", tier: "A", compositeScore: 88,
    population: 46349, elementarySchools: 14, childrenPct: 13.4, medianIncome: 162800, competitorCount: 2,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 90, schoolDensity: 86, childPopulation: 90, dualIncomeFamilies: 92, stemJobs: 92, competitionScore: 88 },
    competitors: [],
  },
  {
    id: 32, city: "Fairfax", state: "Virginia", tier: "B", compositeScore: 79,
    population: 24574, elementarySchools: 10, childrenPct: 10.8, medianIncome: 124600, competitorCount: 3,
    isNonRegistration: true, notes: "Starter market — refresh for live data.",
    scoreBreakdown: { summerCampDemand: 80, schoolDensity: 78, childPopulation: 80, dualIncomeFamilies: 84, stemJobs: 86, competitionScore: 76 },
    competitors: [],
  },
];
