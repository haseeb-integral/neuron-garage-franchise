import { Candidate } from "@/data/pipelineData";

import { CompositeScoreBadge } from "@/components/candidate-pipeline/CompositeScoreBadge";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { MouseEvent } from "react";

interface Props {
  candidate: Candidate;
  onDragStart: (id: number) => void;
  onClick: () => void;
  onStartOnboarding?: (candidate: Candidate) => void;
  compact?: boolean;
}

/** Map tag -> shadcn Badge variant for consistent chip styling */
function tagVariant(tag: string): "secondary" | "outline" | "destructive" {
  const t = (tag ?? "").toLowerCase();
  if (t === "not a fit") return "destructive";
  if (t === "untagged" || t === "") return "outline";
  return "secondary";
}

/** Day-in-stage chip: encodes the freshness/watch/stalled urgency that the
 *  removed left-edge color bar used to carry. */
function DayChip({ days }: { days: number }) {
  if (days >= 8) {
    return (
      <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-semibold rounded">
        Day {days}
      </Badge>
    );
  }
  if (days >= 4) {
    return (
      <Badge
        variant="secondary"
        className="px-1.5 py-0 text-[10px] font-semibold rounded bg-orange-100 text-orange-700 hover:bg-orange-100"
      >
        Day {days}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium rounded text-muted-foreground">
      Day {days}
    </Badge>
  );
}

export function CandidateCard({ candidate, onDragStart, onClick, onStartOnboarding, compact = false }: Props) {
  const showStartOnboarding = candidate.stage === "signing" && !!onStartOnboarding;
  const handleStart = (e: MouseEvent) => {
    e.stopPropagation();
    onStartOnboarding?.(candidate);
  };
  const ownerInitial = (candidate.assignedTo?.[0] ?? "?").toUpperCase();
  const ownerLabel = `Owned by ${candidate.assignedTo ?? "—"}`;

  // Shared card surface + hover treatment. Hover uses the existing --ring
  // accent (blue) already used app-wide for focus states.
  const cardClasses =
    "group bg-card text-card-foreground border border-border rounded-lg shadow-sm cursor-pointer " +
    "hover:-translate-y-px hover:shadow-md hover:border-[hsl(var(--ring))] transition-all duration-150";

  if (compact) {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(candidate.id)}
        onClick={onClick}
        className={`${cardClasses} px-2 py-1.5 mb-1.5 flex items-center gap-2`}
      >
        <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={20} />
        <div className="text-xs font-medium flex-1 truncate text-foreground">
          {candidate.name}
        </div>
        <DayChip days={candidate.daysInStage} />
        <CompositeScoreBadge scores={candidate.qualificationScores} />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(candidate.id)}
      onClick={onClick}
      className={`${cardClasses} p-3 mb-2`}
    >
      <div className="flex items-start mb-2.5 gap-2.5">
        <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="font-medium text-sm truncate flex-1 text-foreground group-hover:text-[hsl(var(--ring))] transition-colors"
              style={{ lineHeight: 1.2 }}
            >
              {candidate.name}
            </div>
            <CompositeScoreBadge scores={candidate.qualificationScores} />
          </div>
          <div className="text-[11px] truncate mt-0.5 text-muted-foreground" style={{ lineHeight: 1.2 }}>
            {candidate.city}, {candidate.state}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        {(() => {
          const t = (candidate.tag ?? "").toLowerCase();
          if (!candidate.tag || t === "untagged") {
            return (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap bg-transparent border" style={{ color: "#8893a7", borderColor: "#e3e8ef" }}>
                Untagged
              </span>
            );
          }
          if (t === "not a fit") {
            return (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>
                {candidate.tag}
              </span>
            );
          }
          return (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap" style={{ backgroundColor: "#eef2f7", color: "#526078" }}>
              {candidate.tag}
            </span>
          );
        })()}
        <div className="flex items-center gap-2 flex-shrink-0">
          <DayChip days={candidate.daysInStage} />
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: "#f1f5f9", color: "#526078" }}
            title={ownerLabel}
            aria-label={ownerLabel}
          >
            {ownerInitial}
          </div>
        </div>
      </div>
      {showStartOnboarding && (
        <button
          onClick={handleStart}
          className="mt-2 w-full text-white text-xs font-semibold rounded-md px-2 py-1.5 flex items-center justify-center gap-1 transition-colors"
          style={{ backgroundColor: "#174be8" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0f3fc7")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#174be8")}
        >
          Start Onboarding <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
