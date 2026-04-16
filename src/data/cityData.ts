export interface CityData {
  id: number;
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
];
