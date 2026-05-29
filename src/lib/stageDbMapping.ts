import type { StageId } from "@/data/pipelineData";

// Single source of truth for translating between the UI's StageId
// and the database's `candidate_stage` enum. The only divergence
// today is initial_qual <-> initial_qualification, but centralising
// this prevents future drift (and the "invalid input value for enum
// candidate_stage" toast it caused on the Homework tab).

const UI_TO_DB: Record<StageId, string> = {
  new_lead: "new_lead",
  initial_qual: "initial_qualification",
  business_overview: "business_overview",
  fdd_review: "fdd_review",
  immersion: "immersion",
  confirmation: "confirmation",
  signing: "signing",
  disqualified: "disqualified",
};

const DB_TO_UI: Record<string, StageId> = Object.fromEntries(
  Object.entries(UI_TO_DB).map(([ui, db]) => [db, ui as StageId]),
);

export function toDbStage(stage: StageId): string {
  return UI_TO_DB[stage] ?? stage;
}

export function fromDbStage(stage: string): StageId {
  return (DB_TO_UI[stage] ?? (stage as StageId));
}
