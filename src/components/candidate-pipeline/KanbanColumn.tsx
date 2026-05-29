import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Stage, Candidate } from "@/data/pipelineData";
import { CandidateCard } from "./CandidateCard";

interface Props {
  stage: Stage;
  candidates: Candidate[];
  onDragStart: (id: number) => void;
  onDrop: (stageId: Stage["id"]) => void;
  onCardClick: (c: Candidate) => void;
  onStartOnboarding: (c: Candidate) => void;
  collapsed: boolean;
  onToggleCollapse: (stageId: Stage["id"]) => void;
  compact: boolean;
}

export function KanbanColumn({
  stage,
  candidates,
  onDragStart,
  onDrop,
  onCardClick,
  onStartOnboarding,
  collapsed,
  onToggleCollapse,
  compact,
}: Props) {
  const [over, setOver] = useState(false);
  const isDisq = stage.id === "disqualified";

  // Stage accent palette (consistent across the kanban)
  const stageColorMap: Record<string, string> = {
    new_lead: "#6f42c1",
    initial_qual: "#003c7e",
    business_overview: "#0dcaf0",
    fdd_review: "#6610f2",
    immersion: "#20c997",
    confirmation: "#198754",
    signing: "#fd7e14",
    disqualified: "#adb5bd",
  };
  const accent = stageColorMap[stage.id] ?? "#003c7e";

  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 rounded-lg flex flex-col items-center py-3 cursor-pointer hover:bg-[#e9ecef] transition-colors"
        style={{
          backgroundColor: over ? "#e9ecef" : "#ffffff",
          border: "1px solid #dee2e6",
          width: 44,
          minHeight: 500,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
          onToggleCollapse(stage.id);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={() => {
          setOver(false);
          onDrop(stage.id);
        }}
        onClick={() => onToggleCollapse(stage.id)}
        title={`Expand ${stage.short}`}
      >
        <ChevronRight size={14} style={{ color: "#6c757d" }} />
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-2"
          style={{ backgroundColor: "#f1f3f5", color: "#495057" }}
        >
          {candidates.length}
        </span>
        <div
          className="text-xs font-bold mt-3 flex items-center gap-1.5"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            color: isDisq ? "#6c757d" : "#003c7e",
            letterSpacing: "0.02em",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accent }}
          />
          {stage.short}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 rounded-xl flex flex-col overflow-hidden shadow-sm"
      style={{
        backgroundColor: over ? "#e9ecef" : "#ffffff",
        border: "1px solid #dee2e6",
        width: 260,
        minHeight: 500,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={() => {
        setOver(false);
        onDrop(stage.id);
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 sticky top-0 z-10"
        style={{
          backgroundColor: over ? "#e9ecef" : "#f8f9fa",
          borderBottom: "1px solid #dee2e6",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleCollapse(stage.id)}
            className="flex-shrink-0 hover:bg-[#e9ecef] rounded p-0.5"
            title="Collapse column"
          >
            <ChevronLeft size={14} style={{ color: "#6c757d" }} />
          </button>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: accent }}
          />
          <h3
            className="text-sm font-bold truncate"
            style={{ color: isDisq ? "#6c757d" : "#212529", letterSpacing: "-0.01em" }}
          >
            {stage.short}
          </h3>
        </div>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
          style={{ backgroundColor: "#e9ecef", color: "#495057" }}
        >
          {candidates.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2" style={{ backgroundColor: "#fbfcfd" }}>
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            onDragStart={onDragStart}
            onClick={() => onCardClick(c)}
            onStartOnboarding={onStartOnboarding}
            compact={compact}
          />
        ))}
        {candidates.length === 0 && (
          <div
            className="text-center text-xs py-10 mt-2 rounded-lg"
            style={{
              color: "#adb5bd",
              border: "1px dashed #dee2e6",
              backgroundColor: "#ffffff",
            }}
          >
            Drop candidates here
          </div>
        )}
      </div>
    </div>
  );
}
