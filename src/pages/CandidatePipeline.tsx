import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { sampleCandidates, Candidate, StageId, STAGES } from "@/data/pipelineData";
import { KanbanBoard } from "@/components/candidate-pipeline/KanbanBoard";
import { PipelineAnalyticsBar } from "@/components/candidate-pipeline/PipelineAnalyticsBar";
import { CandidateDetailPanel } from "@/components/candidate-pipeline/CandidateDetailPanel";

const CandidatePipeline = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(sampleCandidates);
  const [active, setActive] = useState<Candidate | null>(null);

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

  return (
    <div style={{ backgroundColor: "#f2f4f6", margin: -32, padding: 32, minHeight: "calc(100vh)" }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold" style={{ color: "#003c7e" }}>Candidate Pipeline</h1>
        <Button
          onClick={() => toast.info("Open Teacher Prospects to promote a candidate")}
          className="text-white"
          style={{ backgroundColor: "#fd7e14" }}
        >
          <UserPlus size={16} /> Promote from Prospect
        </Button>
      </div>
      <p className="mb-6" style={{ color: "#6c757d" }}>
        Track and manage franchise candidates through every stage of the qualification process.
      </p>
      <div className="h-px mb-6" style={{ backgroundColor: "#dee2e6" }} />

      <PipelineAnalyticsBar candidates={candidates} />

      <KanbanBoard
        candidates={candidates}
        onStageChange={handleStageChange}
        onCardClick={setActive}
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
