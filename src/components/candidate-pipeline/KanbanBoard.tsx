import { useRef, useState } from "react";
import { STAGES, Candidate, StageId } from "@/data/pipelineData";
import { KanbanColumn } from "./KanbanColumn";

interface Props {
  candidates: Candidate[];
  onStageChange: (id: number, stage: StageId) => void;
  onCardClick: (c: Candidate) => void;
  collapsed: Set<StageId>;
  onToggleCollapse: (stageId: StageId) => void;
  compact: boolean;
}

export function KanbanBoard({
  candidates,
  onStageChange,
  onCardClick,
  collapsed,
  onToggleCollapse,
  compact,
}: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleDrop = (stageId: StageId) => {
    if (draggingId == null) return;
    onStageChange(draggingId, stageId);
    setDraggingId(null);
  };

  const scrollToStage = (stageId: StageId) => {
    const el = colRefs.current[stageId];
    if (el && scrollRef.current) {
      const scroller = scrollRef.current;
      const left = el.offsetLeft - 12;
      scroller.scrollTo({ left, behavior: "smooth" });
    }
  };

  return (
    <div>
      {/* Stage navigator dots */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium" style={{ color: "#6c757d" }}>Jump to:</span>
        {STAGES.map((s) => {
          const count = candidates.filter((c) => c.stage === s.id).length;
          const isDisq = s.id === "disqualified";
          return (
            <button
              key={s.id}
              onClick={() => scrollToStage(s.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white transition-colors"
              title={s.label}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isDisq ? "#adb5bd" : "#003c7e" }}
              />
              <span className="text-[11px] font-medium" style={{ color: "#495057" }}>
                {s.short}
              </span>
              <span className="text-[10px]" style={{ color: "#6c757d" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable board with right-edge fade */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="kanban-scroll flex gap-3 overflow-x-auto pb-3"
        >
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              ref={(el) => (colRefs.current[stage.id] = el)}
              className="flex-shrink-0"
            >
              <KanbanColumn
                stage={stage}
                candidates={candidates.filter((c) => c.stage === stage.id)}
                onDragStart={setDraggingId}
                onDrop={handleDrop}
                onCardClick={onCardClick}
                collapsed={collapsed.has(stage.id)}
                onToggleCollapse={onToggleCollapse}
                compact={compact}
              />
            </div>
          ))}
        </div>
        {/* Right edge fade hint */}
        <div
          className="pointer-events-none absolute top-0 right-0 h-full w-12"
          style={{
            background: "linear-gradient(to right, transparent, #f2f4f6)",
          }}
        />
      </div>
    </div>
  );
}
