import { useRef, useState } from "react";
import { STAGES, Candidate, StageId } from "@/data/pipelineData";
import { KanbanColumn } from "./KanbanColumn";
import { getStageAccent } from "./stageColors";

interface Props {
  candidates: Candidate[];
  onStageChange: (id: number, stage: StageId) => void;
  onCardClick: (c: Candidate) => void;
  onStartOnboarding: (c: Candidate) => void;
  collapsed: Set<StageId>;
  onToggleCollapse: (stageId: StageId) => void;
  compact: boolean;
}

export function KanbanBoard({
  candidates,
  onStageChange,
  onCardClick,
  onStartOnboarding,
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
    const scroller = scrollRef.current;
    if (!el || !scroller) return;

    el.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });

    requestAnimationFrame(() => {
      const elRect = el.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const left = scroller.scrollLeft + (elRect.left - scrollerRect.left) - 12;
      scroller.scrollTo({ left, behavior: "smooth" });
    });
  };




  return (
    <div>
      {/* Stage navigator dots */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider mr-1"
          style={{ color: "#6c757d" }}
        >
          Jump to:
        </span>
        {STAGES.map((s) => {
          const count = candidates.filter((c) => c.stage === s.id).length;
          const accent = getStageAccent(s.id);
          return (
            <button
              key={s.id}
              onClick={(e) => {
                scrollToStage(s.id);
                e.currentTarget.blur();
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all"
              style={{
                border: "1px solid transparent",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#dee2e6";
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title={`Jump to ${s.label}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <span
                className="text-[11px] font-semibold"
                style={{ color: "#495057" }}
              >
                {s.short}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 rounded-full"
                style={{ color: "#6c757d", backgroundColor: "#e9ecef" }}
              >
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
              data-stage-id={stage.id}
              className="flex-shrink-0"
            >
              <KanbanColumn
                stage={stage}
                candidates={candidates.filter((c) => c.stage === stage.id)}
                onDragStart={setDraggingId}
                onDrop={handleDrop}
                onCardClick={onCardClick}
                onStartOnboarding={onStartOnboarding}
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
