import { Candidate } from "@/data/pipelineData";
import { FitScoreBadge } from "@/components/teacher-prospects/FitScoreBadge";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
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

const daysBorderColor = (days: number) => {
  if (days <= 3) return "#20c997"; // green - fresh
  if (days <= 7) return "#fd7e14"; // amber - watch
  return "#dc3545"; // red - stalled
};

export function CandidateCard({ candidate, onDragStart, onClick, onStartOnboarding, compact = false }: Props) {
  const showStartOnboarding = candidate.stage === "signing" && !!onStartOnboarding;
  const handleStart = (e: MouseEvent) => {
    e.stopPropagation();
    onStartOnboarding?.(candidate);
  };
  const borderLeft = `3px solid ${daysBorderColor(candidate.daysInStage)}`;
  const ownerLabel = `Owned by ${candidate.assignedTo}`;

  if (compact) {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(candidate.id)}
        onClick={onClick}
        className="bg-white rounded-md px-2 py-1.5 mb-1.5 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-2"
        style={{ border: "1px solid #dee2e6", borderLeft }}
      >
        <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={20} />
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
      style={{ border: "1px solid #dee2e6", borderLeft }}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={28} />
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate leading-tight" style={{ color: "#212529" }}>{candidate.name}</div>
            <div className="text-[11px] truncate" style={{ color: "#6c757d" }}>
              {candidate.city}, {candidate.state}
            </div>
          </div>
        </div>
        <FitScoreBadge score={candidate.fitScore} />
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
            title={ownerLabel}
            aria-label={ownerLabel}
          >
            {candidate.assignedTo[0]}
          </div>
        </div>
      </div>
      {showStartOnboarding && (
        <button
          onClick={handleStart}
          className="mt-2 w-full text-white text-xs font-semibold rounded-md px-2 py-1.5 flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#fd7e14" }}
        >
          Start Onboarding <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
