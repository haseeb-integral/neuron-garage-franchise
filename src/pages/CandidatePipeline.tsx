import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Rows3, Rows2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { sampleCandidates, Candidate, StageId, STAGES } from "@/data/pipelineData";
import { KanbanBoard } from "@/components/candidate-pipeline/KanbanBoard";
import { PipelineAnalyticsBar } from "@/components/candidate-pipeline/PipelineAnalyticsBar";
import { CandidateDetailPanel } from "@/components/candidate-pipeline/CandidateDetailPanel";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buildFranchiseeFromCandidate, queueOnboarding } from "@/data/onboardingStore";

const CandidatePipeline = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(sampleCandidates);
  const [active, setActive] = useState<Candidate | null>(null);
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<StageId>>(new Set());

  const handleStageChange = (id: number, stage: StageId) => {
    const stageLabel = STAGES.find((s) => s.id === stage)?.label ?? stage;
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage, daysInStage: 0 } : c)),
    );
    toast.success(`Stage updated to ${stageLabel}`);
  };

  const handleUpdate = (updated: Candidate) => {
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setActive(updated);
  };

  const toggleCollapse = (stageId: StageId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const collapseEmpty = () => {
    const next = new Set<StageId>();
    STAGES.forEach((s) => {
      const count = candidates.filter((c) => c.stage === s.id).length;
      if (count === 0 || s.id === "disqualified") next.add(s.id);
    });
    setCollapsed(next);
    toast.success("Collapsed empty & Disqualified columns");
  };

  return (
    <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 px-4 md:px-8 py-4 md:py-8 min-h-screen" style={{ backgroundColor: "#f2f4f6" }}>
      <PageHeader
        title="Candidate Pipeline"
        subtitle="Track and manage franchise candidates through every stage of the qualification process."
        action={
          <Button
            onClick={() => toast.info("Open Teacher Prospects to promote a candidate")}
            className="text-white w-full sm:w-auto"
            style={{ backgroundColor: "#fd7e14", minHeight: 44 }}
          >
            <UserPlus size={16} /> Promote from Prospect
          </Button>
        }
      />

      <PipelineAnalyticsBar candidates={candidates} />

      {/* Toolbar: density + collapse */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-lg px-3 py-2" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "#6c757d" }}>Density:</span>
          <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid #dee2e6" }}>
            <button
              onClick={() => setCompact(false)}
              className="px-2 py-1 text-xs font-medium flex items-center gap-1"
              style={{
                backgroundColor: !compact ? "#003c7e" : "#ffffff",
                color: !compact ? "#ffffff" : "#495057",
              }}
            >
              <Rows3 size={12} /> Comfortable
            </button>
            <button
              onClick={() => setCompact(true)}
              className="px-2 py-1 text-xs font-medium flex items-center gap-1"
              style={{
                backgroundColor: compact ? "#003c7e" : "#ffffff",
                color: compact ? "#ffffff" : "#495057",
              }}
            >
              <Rows2 size={12} /> Compact
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {collapsed.size > 0 && (
            <button
              onClick={() => setCollapsed(new Set())}
              className="text-xs font-medium px-2 py-1 rounded-md hover:bg-[#f1f3f5]"
              style={{ color: "#003c7e" }}
            >
              Expand all
            </button>
          )}
          <button
            onClick={collapseEmpty}
            className="text-xs font-medium px-2 py-1 rounded-md hover:bg-[#f1f3f5] flex items-center gap-1"
            style={{ color: "#495057" }}
          >
            <Minimize2 size={12} /> Collapse empty
          </button>
        </div>
      </div>

      <KanbanBoard
        candidates={candidates}
        onStageChange={handleStageChange}
        onCardClick={setActive}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        compact={compact}
      />

      <CandidateDetailPanel
        candidate={active}
        onClose={() => setActive(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default CandidatePipeline;
