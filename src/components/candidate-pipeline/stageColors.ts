import type { StageId } from "@/data/pipelineData";

/** Single source of truth for kanban stage accent colors. */
export const STAGE_ACCENT: Record<StageId, string> = {
  new_lead: "#6f42c1",
  initial_qual: "#003c7e",
  business_overview: "#0dcaf0",
  fdd_review: "#6610f2",
  immersion: "#20c997",
  confirmation: "#198754",
  signing: "#fd7e14",
  disqualified: "#adb5bd",
};

export function getStageAccent(stageId: StageId | string): string {
  return STAGE_ACCENT[stageId as StageId] ?? "#003c7e";
}
