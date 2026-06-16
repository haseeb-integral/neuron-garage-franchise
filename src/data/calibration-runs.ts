// Static record of the most recent live-engine runs against Sam's named
// anchors. These are the numbers Brett/Sam should look at when judging
// whether the qualitative calibration criterion ("LeafSpring scores
// materially lower than Trinity", Sam brief v2.2 p.12) holds.
//
// Update this file by re-running each anchor through the Live Engine card
// on /site-analysis, then copy the composite + pillar values here. No DB
// writes — this is intentionally a static, reviewable artifact.

export type AnchorType = "positive" | "negative";

export interface CalibrationRun {
  schoolName: string;
  address: string;
  type: AnchorType;
  composite: number;
  pillars: {
    schoolProfile: number;
    affluence: number;
    familyDensity: number;
    ecosystem: number;
    accessibility: number;
  };
  /** ISO date the run was captured (YYYY-MM-DD). */
  runDate: string;
  /** Free-text note shown under the anchor. */
  note?: string;
}

export const CALIBRATION_RUNS: CalibrationRun[] = [
  {
    schoolName: "Trinity Episcopal School",
    address: "4011 Bee Caves Rd, Austin, TX 78746",
    type: "positive",
    composite: 63.32,
    pillars: {
      schoolProfile: 79.5,
      affluence: 85.4,
      familyDensity: 38.2,
      ecosystem: 56.1,
      accessibility: 55.7,
    },
    runDate: "2026-06-16",
    note: "Reference positive anchor — SAS doc §6, SOW v2.2 p.337.",
  },
  {
    schoolName: "LeafSpring School at Cedar Park (closed 2023)",
    address: "11651 W Parmer Ln, Cedar Park, TX 78613",
    type: "negative",
    composite: 0,
    pillars: { schoolProfile: 0, affluence: 0, familyDensity: 0, ecosystem: 0, accessibility: 0 },
    runDate: "pending",
    note: "Reference negative anchor — actual Neuron Garage camp host site (Austin metro), confirmed via NG's own past-locations list. Awaiting fresh live-engine run; prior numbers were from a Plano placeholder and have been cleared.",
  },
  {
    schoolName: "Wayside Eden Park Academy",
    address: "6215 Menchaca Rd, Austin, TX 78745",
    type: "positive",
    composite: 0,
    pillars: { schoolProfile: 0, affluence: 0, familyDensity: 0, ecosystem: 0, accessibility: 0 },
    runDate: "pending",
    note: "Awaiting live-engine run — preset wired in LiveEngineCard.",
  },
  {
    schoolName: "St. Francis School",
    address: "300 E Huntland Dr, Austin, TX 78752",
    type: "positive",
    composite: 0,
    pillars: { schoolProfile: 0, affluence: 0, familyDensity: 0, ecosystem: 0, accessibility: 0 },
    runDate: "pending",
    note: "Awaiting live-engine run — preset wired in LiveEngineCard.",
  },
  {
    schoolName: "Telluride Mountain School",
    address: "200 San Miguel River Rd, Telluride, CO 81435",
    type: "positive",
    composite: 0,
    pillars: { schoolProfile: 0, affluence: 0, familyDensity: 0, ecosystem: 0, accessibility: 0 },
    runDate: "pending",
    note: "Awaiting live-engine run — small-market positive anchor (SOW v2.2).",
  },
];

export const QUALITATIVE_CRITERION =
  "Per Sam's brief v2.2 p.12: \"Does Feature 1B score the LeafSpring site materially lower than the Trinity site?\" Qualitative — no numeric threshold is client-specified.";
