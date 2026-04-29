import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Rows3, Rows2, Minimize2, Filter, X } from "lucide-react";
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

type OwnerFilter = "all" | "Kaylie" | "Sam" | "Skylar";
type TagFilter = "all" | "High Potential" | "Active" | "Follow-Up" | "Qualified";
type FitFilter = "all" | "90" | "75";

interface PendingMove {
  candidate: Candidate;
  fromStage: StageId;
  toStage: StageId;
}

const CandidatePipeline = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>(sampleCandidates);
  const [active, setActive] = useState<Candidate | null>(null);
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<StageId>>(new Set());
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  // Open detail panel when arriving via global search (?candidate=ID)
  useEffect(() => {
    const id = searchParams.get("candidate");
    if (!id) return;
    const found = candidates.find((c) => c.id === Number(id));
    if (found) setActive(found);
    searchParams.delete("candidate");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Filters
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [fitFilter, setFitFilter] = useState<FitFilter>("all");

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (ownerFilter !== "all" && c.assignedTo !== ownerFilter) return false;
      if (tagFilter !== "all" && c.tag !== tagFilter) return false;
      if (fitFilter === "90" && c.fitScore < 90) return false;
      if (fitFilter === "75" && c.fitScore < 75) return false;
      return true;
    });
  }, [candidates, ownerFilter, tagFilter, fitFilter]);

  const filtersActive = ownerFilter !== "all" || tagFilter !== "all" || fitFilter !== "all";
  const clearFilters = () => {
    setOwnerFilter("all");
    setTagFilter("all");
    setFitFilter("all");
  };

  const handleStartOnboarding = (c: Candidate) => setConfirmCandidate(c);

  const confirmStartOnboarding = () => {
    if (!confirmCandidate) return;
    const franchisee = buildFranchiseeFromCandidate({
      name: confirmCandidate.name,
      city: confirmCandidate.city,
      state: confirmCandidate.state,
      email: confirmCandidate.email,
      phone: confirmCandidate.phone,
    });
    queueOnboarding(franchisee);
    const name = confirmCandidate.name;
    setConfirmCandidate(null);
    toast.success(`Onboarding started for ${name}.`);
    navigate("/onboarding");
  };

  // Drag-drop guard rail: ask user to confirm any cross-stage move
  const handleStageDrop = (id: number, toStage: StageId) => {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return;
    if (candidate.stage === toStage) return; // same column = no-op
    setPendingMove({ candidate, fromStage: candidate.stage, toStage });
  };

  const applyStageMove = (id: number, toStage: StageId) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: toStage, daysInStage: 0 } : c)),
    );
  };

  const confirmStageMove = () => {
    if (!pendingMove) return;
    const { candidate, fromStage, toStage } = pendingMove;
    const fromLabel = STAGES.find((s) => s.id === fromStage)?.short ?? fromStage;
    const toLabel = STAGES.find((s) => s.id === toStage)?.short ?? toStage;
    const previousDays = candidate.daysInStage;

    applyStageMove(candidate.id, toStage);
    setPendingMove(null);

    toast.success(`Moved ${candidate.name} → ${toLabel}`, {
      description: `From ${fromLabel}`,
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          setCandidates((prev) =>
            prev.map((c) => (c.id === candidate.id ? { ...c, stage: fromStage, daysInStage: previousDays } : c)),
          );
          toast.info(`Reverted ${candidate.name} to ${fromLabel}`);
        },
      },
    });
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
      const count = filteredCandidates.filter((c) => c.stage === s.id).length;
      if (count === 0 || s.id === "disqualified") next.add(s.id);
    });
    setCollapsed(next);
    toast.success("Collapsed empty & Disqualified columns");
  };

  const isDisqMove = pendingMove?.toStage === "disqualified";
  const fromLabel = pendingMove ? STAGES.find((s) => s.id === pendingMove.fromStage)?.label : "";
  const toLabel = pendingMove ? STAGES.find((s) => s.id === pendingMove.toStage)?.label : "";

  // Filter chip styling
  const chipBase = "px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap";
  const chipActive = { backgroundColor: "#003c7e", color: "#ffffff" };
  const chipInactive = { backgroundColor: "#ffffff", color: "#495057", border: "1px solid #dee2e6" };

  return (
    <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 px-4 md:px-8 py-4 md:py-8 min-h-screen" style={{ backgroundColor: "#f2f4f6" }}>
      <PageHeader
        title="Candidate Pipeline"
        subtitle="Track and manage franchise candidates through every stage of the qualification process."
        action={
          <Button
            size="sm"
            onClick={() => toast.info("Open Teacher Prospects to promote a candidate")}
            className="text-white w-full sm:w-auto"
            style={{ backgroundColor: "#fd7e14" }}
          >
            <UserPlus size={14} /> Promote from Prospect
          </Button>
        }
      />

      <PipelineAnalyticsBar candidates={candidates} />

      {/* Filter strip */}
      <div className="bg-white rounded-lg px-3 py-2 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-1.5" style={{ color: "#6c757d" }}>
          <Filter size={13} />
          <span className="text-xs font-semibold uppercase tracking-wide">Filter</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "#6c757d" }}>Owner:</span>
          {(["all", "Kaylie", "Sam", "Skylar"] as OwnerFilter[]).map((o) => (
            <button
              key={o}
              onClick={() => setOwnerFilter(o)}
              className={chipBase}
              style={ownerFilter === o ? chipActive : chipInactive}
            >
              {o === "all" ? "All" : o}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "#6c757d" }}>Tag:</span>
          {(["all", "High Potential", "Active", "Follow-Up", "Qualified"] as TagFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={chipBase}
              style={tagFilter === t ? chipActive : chipInactive}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "#6c757d" }}>Fit:</span>
          {([
            { id: "all" as FitFilter, label: "All" },
            { id: "90" as FitFilter, label: "90+" },
            { id: "75" as FitFilter, label: "75+" },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFitFilter(f.id)}
              className={chipBase}
              style={fitFilter === f.id ? chipActive : chipInactive}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtersActive && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#f1f3f5]"
            style={{ color: "#dc3545" }}
          >
            <X size={12} /> Clear ({filteredCandidates.length} of {candidates.length})
          </button>
        )}
      </div>

      {/* Days-in-stage legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 px-1 text-[11px]" style={{ color: "#6c757d" }}>
        <span className="font-semibold uppercase tracking-wide">Days in stage:</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#20c997" }} />
          <span>Fresh (≤3 days)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#fd7e14" }} />
          <span>Watch (4–7)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#dc3545" }} />
          <span>Stalled (8+)</span>
        </div>
        <span className="ml-auto italic">Tip: drag a card to another column — you'll be asked to confirm.</span>
      </div>

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
        candidates={filteredCandidates}
        onStageChange={handleStageDrop}
        onCardClick={setActive}
        onStartOnboarding={handleStartOnboarding}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        compact={compact}
      />

      <CandidateDetailPanel
        candidate={active}
        onClose={() => setActive(null)}
        onUpdate={handleUpdate}
      />

      {/* Drag-drop confirm */}
      <AlertDialog open={!!pendingMove} onOpenChange={(v) => !v && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDisqMove
                ? `Disqualify ${pendingMove?.candidate.name}?`
                : `Move ${pendingMove?.candidate.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isDisqMove ? (
                <>
                  This will mark the candidate as <strong>Disqualified</strong> and remove them from active stages.
                  You can undo this immediately from the toast.
                </>
              ) : (
                <>
                  Move from <strong>{fromLabel}</strong> to <strong>{toLabel}</strong>? Day counter will reset.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStageMove}
              className="text-white"
              style={{ backgroundColor: isDisqMove ? "#dc3545" : "#003c7e" }}
            >
              {isDisqMove ? "Disqualify" : "Move"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start onboarding confirm */}
      <AlertDialog open={!!confirmCandidate} onOpenChange={(v) => !v && setConfirmCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Start onboarding for {confirmCandidate?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new onboarding record with the default 7 steps for this candidate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStartOnboarding}
              className="text-white"
              style={{ backgroundColor: "#fd7e14" }}
            >
              Start Onboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CandidatePipeline;
