import { useState } from "react";
import { STAGES, Candidate, StageId } from "@/data/pipelineData";
import { KanbanColumn } from "./KanbanColumn";

interface Props {
  candidates: Candidate[];
  onStageChange: (id: number, stage: StageId) => void;
  onCardClick: (c: Candidate) => void;
}

export function KanbanBoard({ candidates, onStageChange, onCardClick }: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const handleDrop = (stageId: StageId) => {
    if (draggingId == null) return;
    onStageChange(draggingId, stageId);
    setDraggingId(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          candidates={candidates.filter((c) => c.stage === stage.id)}
          onDragStart={setDraggingId}
          onDrop={handleDrop}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
