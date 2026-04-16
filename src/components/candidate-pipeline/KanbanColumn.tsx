import { useState } from "react";
import { Stage, Candidate } from "@/data/pipelineData";
import { CandidateCard } from "./CandidateCard";

interface Props {
  stage: Stage;
  candidates: Candidate[];
  onDragStart: (id: number) => void;
  onDrop: (stageId: Stage["id"]) => void;
  onCardClick: (c: Candidate) => void;
}

export function KanbanColumn({ stage, candidates, onDragStart, onDrop, onCardClick }: Props) {
  const [over, setOver] = useState(false);
  const isDisq = stage.id === "disqualified";

  return (
    <div
      className="flex-shrink-0 w-72 rounded-lg p-3 flex flex-col"
      style={{
        backgroundColor: over ? "#e9ecef" : "#ffffff",
        border: "1px solid #dee2e6",
        minHeight: 500,
      }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(stage.id); }}
    >
      <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: "1px solid #dee2e6" }}>
        <h3 className="text-sm font-bold" style={{ color: isDisq ? "#6c757d" : "#003c7e" }}>
          {stage.short}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: "#f1f3f5", color: "#495057" }}
        >
          {candidates.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} onDragStart={onDragStart} onClick={() => onCardClick(c)} />
        ))}
        {candidates.length === 0 && (
          <div className="text-center text-xs py-8" style={{ color: "#adb5bd" }}>
            Drop candidates here
          </div>
        )}
      </div>
    </div>
  );
}
