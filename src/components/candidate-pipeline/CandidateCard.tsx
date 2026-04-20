import { Candidate } from "@/data/pipelineData";
import { FitScoreBadge } from "@/components/teacher-prospects/FitScoreBadge";
import { ArrowRight } from "lucide-react";
import { MouseEvent } from "react";

interface Props {
  candidate: Candidate;
  onDragStart: (id: number) => void;
  onClick: () => void;
  onStartOnboarding?: (candidate: Candidate) => void;
  compact?: boolean;
}

const avatarColor = (name: string) => {
  const palette = ["#003c7e", "#fd7e14", "#20c997", "#6f42c1", "#e83e8c", "#17a2b8"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % palette.length;
  return palette[h];
};

export function CandidateCard({ candidate, onDragStart, onClick, onStartOnboarding, compact = false }: Props) {
  const showStartOnboarding = candidate.stage === "signing" && !!onStartOnboarding;
  const handleStart = (e: MouseEvent) => {
    e.stopPropagation();
    onStartOnboarding?.(candidate);
  };
  if (compact) {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(candidate.id)}
        onClick={onClick}
        className="bg-white rounded-md px-2 py-1.5 mb-1.5 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-2"
        style={{ border: "1px solid #dee2e6" }}
      >
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-semibold text-white"
          style={{ backgroundColor: avatarColor(candidate.assignedTo) }}
          title={candidate.assignedTo}
        >
          {candidate.assignedTo[0]}
        </div>
        <div className="text-xs font-semibold flex-1 truncate" style={{ color: "#212529" }}>
          {candidate.name}
        </div>
        <FitScoreBadge score={candidate.fitScore} />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(candidate.id)}
      onClick={onClick}
      className="bg-white rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow"
      style={{ border: "1px solid #dee2e6" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="font-semibold text-sm" style={{ color: "#212529" }}>{candidate.name}</div>
        <FitScoreBadge score={candidate.fitScore} />
      </div>
      <div className="text-xs mb-2" style={{ color: "#6c757d" }}>
        {candidate.city}, {candidate.state}
      </div>
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: "#e7f1ff", color: "#003c7e" }}
        >
          {candidate.tag}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "#6c757d" }}>Day {candidate.daysInStage}</span>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ backgroundColor: avatarColor(candidate.assignedTo) }}
            title={candidate.assignedTo}
          >
            {candidate.assignedTo[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
