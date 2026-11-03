import type { StageId } from "@/data/pipelineData";

const STEP_STAGE: Record<number, StageId> = { 1: "initial_qual", 2: "business_overview", 3: "immersion", 4: "confirmation", 5: "signing" };
const NEXT_STAGE: Record<number, StageId> = { 1: "business_overview", 2: "immersion", 3: "confirmation", 4: "signing" };

/** Only the current conversation can advance a prospect; never skip stages. */
export function nextProcessStage(step: number, current: StageId): StageId | null {
  if (STEP_STAGE[step] !== current && !(step === 2 && current === "fdd_review") && !(step === 1 && current === "new_lead")) return null;
  return NEXT_STAGE[step] ?? null;
}

export function candidatePanelId(candidate: { id: number; dbId?: string }): string {
  return candidate.dbId ?? String(candidate.id);
}