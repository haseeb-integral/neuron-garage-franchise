import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Rows3, Rows2, Minimize2, Filter, X, Plus } from "lucide-react";
import { NewCandidateModal } from "@/components/candidate-pipeline/NewCandidateModal";
import { toast } from "sonner";
import { Candidate, StageId, STAGES, STAGE_HOMEWORK } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/candidate-pipeline/KanbanBoard";
import { CardLegendPopover } from "@/components/candidate-pipeline/CardLegendPopover";

import { PipelineAnalyticsBar } from "@/components/candidate-pipeline/PipelineAnalyticsBar";
import { CandidateDetailPanel } from "@/components/candidate-pipeline/CandidateDetailPanel";
import { PageHeader } from "@/components/PageHeader";
import { useCandidatePipelineStore } from "@/stores/candidatePipelineStore";
import { isEnabled } from "@/lib/featureFlags";
import { getEffectivePillarScores } from "@/lib/candidateScoring";
import { toDbStage, fromDbStage } from "@/lib/stageDbMapping";


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
import { startOnboardingForCandidate } from "@/lib/onboardingService";
import { FIT_TAGS, FitTag } from "@/constants/fitTags";

type OwnerFilter = string; // "all" or a user email
interface TeamMember { email: string; firstName: string; }
type TagFilter = "all" | FitTag;
type FitFilter = "all" | "90" | "75" | "60" | "lt60";

interface PendingMove {
  candidate: Candidate;
  fromStage: StageId;
  toStage: StageId;
}

const CandidatePipeline = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Candidate | null>(null);
  const compact = useCandidatePipelineStore((s) => s.compact);
  const setCompact = useCandidatePipelineStore((s) => s.setCompact);
  const [collapsed, setCollapsed] = useState<Set<StageId>>(new Set());
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [pendingIncompleteCount, setPendingIncompleteCount] = useState<number>(0);
  const [disqualifyTarget, setDisqualifyTarget] = useState<{ candidate: Candidate; fromStage: StageId } | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    totalInPipeline: 0,
    hotLeads: 0,
    conversionRate: 0,
    newThisWeek: 0,
  });

  const dbStageToUi = (s: string): StageId => fromDbStage(s);
  const uiStageToDb = (s: StageId): string => toDbStage(s);

  const mapRowToCandidate = (r: any, idx: number): Candidate => {
    const fullName = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
    const created = r.created_at ? new Date(r.created_at) : new Date();
    const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      id: idx,
      name: fullName || r.email,
      city: r.city ?? "",
      state: r.state ?? "",
      email: r.email ?? "",
      otherEmail: r.other_email ?? "",
      phone: r.phone ?? "",
      fitScore: r.fit_score ?? 0,
      stage: dbStageToUi(r.current_stage) ?? "new_lead",
      daysInStage: days,
      assignedTo: r.assigned_to ?? "",
      tag: r.fit_tag ?? "Untagged",
      source: r.source ?? "",
      createdDate: r.created_at ?? new Date().toISOString(),
      otherOpportunities: r.other_opportunities ?? "",
      mailingStreet: r.mailing_street ?? "",
      mailingCity: r.mailing_city ?? "",
      mailingState: r.mailing_state ?? "",
      mailingZip: r.mailing_zip ?? "",
      partnerInvolved: !!r.partner_involved,
      partnerName: r.partner_name ?? "",
      partnerEmail: r.partner_email ?? "",
      partnerPhone: r.partner_phone ?? "",
      backgroundCheckCompletedAt: r.background_check_completed_at ?? "",
      creditCheckCompletedAt: r.credit_check_completed_at ?? "",
      qualificationScores: { teaching: 0, leadership: 0, financial: 0, marketFit: 0, cultureFit: 0 },
      activity: [],
      trialClose: {
        answeredQuestions: false,
        prospectSummarized: false,
        askedToMoveForward: false,
        scheduledNextCall: false,
        assignedHomework: false,
      },
      votes: { Kaylie: null, Sam: null, Skylar: null },
      dbId: r.id,
      prospectId: r.prospect_id ?? null,
    } as unknown as Candidate;
  };


  const handleCandidateCreated = (row: any) => {
    setCandidates((prev) => {
      const nextId = (prev.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
      return [mapRowToCandidate(row, nextId), ...prev];
    });
    computeMetrics();
  };

  const computeMetrics = async () => {
    const { data: cands } = await supabase
      .from("candidates")
      .select("id, current_stage, status, fit_score, created_at");
    const all = cands ?? [];
    const active = all.filter(
      (c: any) => c.status !== "disqualified" && c.current_stage !== "disqualified",
    );
    const totalEver = all.length;
    const dayMs = 1000 * 60 * 60 * 24;
    const now = Date.now();
    const weekAgo = now - 7 * dayMs;

    const hot = active.filter((c: any) => (c.fit_score ?? 0) >= 80).length;

    // Conversion = candidates who EVER reached "signing" (qualified), not just those
    // currently parked there. Reads from stage history so signed candidates who moved
    // on (e.g., to onboarding) still count.
    const { data: signingHistory } = await supabase
      .from("candidate_stage_history")
      .select("candidate_id")
      .eq("to_stage", "signing");
    const everSignedIds = new Set((signingHistory ?? []).map((r: any) => r.candidate_id));
    // Also count candidates currently in signing in case history is missing the row.
    all.forEach((c: any) => {
      if (c.current_stage === "signing") everSignedIds.add(c.id);
    });
    const conv = totalEver > 0 ? Math.round((everSignedIds.size / totalEver) * 100) : 0;

    const newWeek = all.filter(
      (c: any) => new Date(c.created_at).getTime() >= weekAgo,
    ).length;

    setMetrics({
      totalInPipeline: active.length,
      hotLeads: hot,
      conversionRate: conv,
      newThisWeek: newWeek,
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        toast.error("Failed to load candidates");
        setLoading(false);
        return;
      }
      const mapped: Candidate[] = (data ?? []).map((r: any, idx: number) => mapRowToCandidate(r, idx + 1));

      // Hydrate qualification scores so the Qual badge appears on cards without opening the tab
      const dbIds = mapped.map((c) => (c as any).dbId).filter(Boolean);
      if (dbIds.length > 0) {
        const { data: qualRows } = await supabase
          .from("candidate_qualification")
          .select("*")
          .in("candidate_id", dbIds);
        if (qualRows && qualRows.length > 0) {
          const byId = new Map<string, any>(qualRows.map((q: any) => [q.candidate_id, q]));
          for (const c of mapped) {
            const row = byId.get((c as any).dbId);
            if (row) {
              c.qualificationScores = getEffectivePillarScores(row).effective;
            }
          }
        }
      }

      setCandidates(mapped);
      setLoading(false);


      // Load team members for Owner filter
      const { data: profs } = await supabase.from("profiles").select("email, full_name");
      if (mounted && profs) {
        const tm: TeamMember[] = profs.map((p: any) => ({
          email: p.email,
          firstName: (p.full_name ?? p.email)?.split(/[\s@]/)[0] || p.email,
        }));
        setTeamMembers(tm);
      }

      computeMetrics();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open detail panel when arriving via global search (?candidate=ID)
  // ID may be the DB uuid (from global search) or numeric local id.
  useEffect(() => {
    const id = searchParams.get("candidate");
    if (!id || candidates.length === 0) return;
    const found = candidates.find(
      (c: any) => c.dbId === id || String(c.id) === id,
    );
    if (!found) return;
    setActive(found);
    searchParams.delete("candidate");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, candidates]);

  useEffect(() => {
    setActive((prev) => {
      if (!prev) return prev;
      const prevDbId = (prev as any).dbId as string | undefined;
      const next = candidates.find((c: any) => {
        const candidateDbId = c.dbId as string | undefined;
        return prevDbId ? candidateDbId === prevDbId : c.id === prev.id;
      });
      return next ?? prev;
    });
  }, [candidates]);

  // Filters
  const ownerFilter = useCandidatePipelineStore((s) => s.ownerFilter);
  const setOwnerFilter = useCandidatePipelineStore((s) => s.setOwnerFilter);
  const tagFilter = useCandidatePipelineStore((s) => s.tagFilter);
  const setTagFilter = useCandidatePipelineStore((s) => s.setTagFilter);
  const fitFilter = useCandidatePipelineStore((s) => s.fitFilter);
  const setFitFilter = useCandidatePipelineStore((s) => s.setFitFilter);
  const daysFilter = useCandidatePipelineStore((s) => s.daysInStageFilter);
  const setDaysFilter = useCandidatePipelineStore((s) => s.setDaysInStageFilter);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (ownerFilter !== "all" && c.assignedTo !== ownerFilter) return false;
      if (tagFilter !== "all" && c.tag !== tagFilter) return false;
      if (fitFilter === "90" && c.fitScore < 90) return false;
      if (fitFilter === "75" && (c.fitScore < 75 || c.fitScore >= 90)) return false;
      if (fitFilter === "60" && (c.fitScore < 60 || c.fitScore >= 75)) return false;
      if (fitFilter === "lt60" && c.fitScore >= 60) return false;
      if (daysFilter === "fresh" && c.daysInStage > 3) return false;
      if (daysFilter === "watch" && (c.daysInStage < 4 || c.daysInStage > 7)) return false;
      if (daysFilter === "stalled" && c.daysInStage < 8) return false;
      return true;
    });
  }, [candidates, ownerFilter, tagFilter, fitFilter, daysFilter]);

  const filtersActive =
    ownerFilter !== "all" || tagFilter !== "all" || fitFilter !== "all" || daysFilter !== "all";
  const clearFilters = () => {
    setOwnerFilter("all");
    setTagFilter("all");
    setFitFilter("all");
    setDaysFilter("all");
  };


  const handleStartOnboarding = (c: Candidate) => setConfirmCandidate(c);

  const confirmStartOnboarding = async () => {
    if (!confirmCandidate) return;
    const candidate = confirmCandidate;
    const dbId = (candidate as any).dbId as string | undefined;
    if (!dbId) {
      toast.error("This candidate is not yet saved to the database.");
      setConfirmCandidate(null);
      return;
    }
    setConfirmCandidate(null);
    try {
      const { id, alreadyExisted } = await startOnboardingForCandidate({
        candidateId: dbId,
        franchiseeName: candidate.name,
        city: candidate.city,
        state: candidate.state,
      });
      if (alreadyExisted) {
        toast.message(`${candidate.name} already has an onboarding record. Opening it.`);
      } else {
        toast.success(`Onboarding started for ${candidate.name}.`);
      }
      navigate(`/onboarding?highlight=${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start onboarding");
    }
  };

  // Drag-drop guard rail: ask user to confirm any cross-stage move
  const handleStageDrop = async (id: number, toStage: StageId) => {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return;
    if (candidate.stage === toStage) return; // same column = no-op
    const dbId = (candidate as any).dbId as string | undefined;

    // Disqualified: open dedicated reason modal instead of generic confirm
    if (toStage === "disqualified") {
      setDisqualifyTarget({ candidate, fromStage: candidate.stage });
      return;
    }
    // Signing prerequisite: must currently be in Confirmation OR have passed through it before
    if (toStage === "signing" && dbId) {
      if (candidate.stage !== "confirmation") {
        const { count, error } = await supabase
          .from("candidate_stage_history")
          .select("id", { count: "exact", head: true })
          .eq("candidate_id", dbId)
          .eq("to_stage", "confirmation" as any);
        if (!error && (count ?? 0) === 0) {
          toast.error("Signing requires Confirmation first", {
            description: "To move a candidate to Signing, they must first pass through Confirmation.",
          });
          return;
        }
      }
    }

    // Phase C2 — 16-day FDD hard-block (T3-06).
    // Behind FF_FDD_GATE so it can be flipped off instantly if it misfires.
    // Blocks any forward move OUT of fdd_review until 16 calendar days have
    // elapsed since fdd_sent_at, unless compliance_override is on.
    if (
      isEnabled("FF_FDD_GATE") &&
      dbId &&
      candidate.stage === "fdd_review" &&
      toStage !== "fdd_review"
    ) {
      console.log("[FDD_GATE] evaluating", { dbId, from: candidate.stage, to: toStage });
      const { data: comp, error: compErr } = await supabase
        .from("candidate_compliance")
        .select("fdd_sent_at, compliance_override")
        .eq("candidate_id", dbId)
        .maybeSingle();
      console.log("[FDD_GATE] compliance row", { comp, compErr });

      if (compErr) {
        toast.error("Compliance check failed", {
          description: "Could not verify FDD lock. Move blocked. Try again or use override.",
        });
        return;
      }

      if (!comp?.compliance_override) {
        if (!comp?.fdd_sent_at) {
          toast.error("FDD sent date required", {
            description: "Set the FDD sent date on the Homework tab before advancing.",
          });
          return;
        }
        const sentMs = new Date(comp.fdd_sent_at).getTime();
        const daysElapsed = Math.floor((Date.now() - sentMs) / 86_400_000);
        const daysRemaining = 16 - daysElapsed;
        console.log("[FDD_GATE] math", { sentMs, daysElapsed, daysRemaining });
        if (daysRemaining > 0) {
          toast.error("16-day FDD lock active", {
            description: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Use compliance override on the Homework tab to bypass.`,
          });
          return;
        }
      }
    }



    // Hard gate: moving INTO confirmation requires Trial Close checklist
    let incomplete = 0;
    if (toStage === "confirmation" && dbId) {
      const { count } = await supabase
        .from("candidate_checklist_items")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", dbId)
        .eq("stage", "confirmation" as any)
        .eq("kind", "homework")
        .eq("is_completed", false);
      incomplete = count ?? 0;
    }
    setPendingIncompleteCount(incomplete);
    setPendingMove({ candidate, fromStage: candidate.stage, toStage });
  };

  const applyStageMove = (id: number, toStage: StageId) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: toStage, daysInStage: 0 } : c)),
    );
  };

  const confirmStageMove = async () => {
    if (!pendingMove) return;
    const { candidate, fromStage, toStage } = pendingMove;
    const overrideNote =
      toStage === "confirmation" && pendingIncompleteCount > 0 ? "confirmation_override" : null;
    const fromLabel = STAGES.find((s) => s.id === fromStage)?.short ?? fromStage;
    const toLabel = STAGES.find((s) => s.id === toStage)?.short ?? toStage;
    const previousDays = candidate.daysInStage;
    const dbId = (candidate as any).dbId as string | undefined;

    // Optimistic UI
    applyStageMove(candidate.id, toStage);
    setPendingMove(null);
    setPendingIncompleteCount(0);

    if (!dbId) {
      toast.error("Missing DB id; change not persisted.");
      return;
    }

    const { data: sess } = await supabase.auth.getUser();
    const changedBy = sess?.user?.email ?? "unknown";

    const { error: updErr } = await supabase
      .from("candidates")
      .update({ current_stage: uiStageToDb(toStage) as any })
      .eq("id", dbId);

    if (updErr) {
      // rollback
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, stage: fromStage, daysInStage: previousDays } : c)),
      );
      toast.error(`Failed to move ${candidate.name}: ${updErr.message}`);
      return;
    }

    const { error: histErr } = await supabase.from("candidate_stage_history").insert({
      candidate_id: dbId,
      from_stage: uiStageToDb(fromStage) as any,
      to_stage: uiStageToDb(toStage) as any,
      changed_by: changedBy,
      notes: overrideNote,
    });
    if (histErr) {
      // Non-fatal: stage already updated. Warn but keep state.
      toast.warning(`Stage saved, but history not logged: ${histErr.message}`);
    }

    // Carry forward ALL homework into the new stage.
    // A stage move must never make user-added homework disappear.
    // We merge the destination stage defaults with every homework item from the
    // prior stage, then preserve completion for anything already checked.
    try {
      const toDbStageVal = uiStageToDb(toStage) as any;
      const fromDbStageVal = uiStageToDb(fromStage) as any;
      const toHomework = STAGE_HOMEWORK[toStage] ?? [];
      const { data: fromItems } = await supabase
        .from("candidate_checklist_items")
        .select("label, is_completed, completed_at, completed_by")
        .eq("candidate_id", dbId)
        .eq("stage", fromDbStageVal)
        .eq("kind", "homework");

      const fromByLabel = new Map(
        (fromItems ?? []).map((row: any) => [row.label, row]),
      );
      const labelsToEnsure = new Set<string>([
        ...toHomework,
        ...(fromItems ?? []).map((row: any) => row.label),
      ]);

      if (labelsToEnsure.size > 0) {
        const { data: existingTo } = await supabase
          .from("candidate_checklist_items")
          .select("id, label, is_completed")
          .eq("candidate_id", dbId)
          .eq("stage", toDbStageVal)
          .eq("kind", "homework")
;
        const existingLabels = new Set((existingTo ?? []).map((row: any) => row.label));

        const rowsToInsert = Array.from(labelsToEnsure)
          .filter((label) => !existingLabels.has(label))
          .map((label) => {
            const source = fromByLabel.get(label);
            const carry = !!source?.is_completed;
            return {
              candidate_id: dbId,
              stage: toDbStageVal,
              label,
              kind: "homework",
              is_completed: carry,
              completed_at: carry ? source?.completed_at ?? new Date().toISOString() : null,
              completed_by: carry ? source?.completed_by ?? changedBy : null,
            };
          });

        if (rowsToInsert.length > 0) {
          await supabase.from("candidate_checklist_items").insert(rowsToInsert as any);
        }

        const toCheck = (existingTo ?? []).filter((row: any) => {
          const source = fromByLabel.get(row.label);
          return !row.is_completed && !!source?.is_completed;
        });

        if (toCheck.length > 0) {
          const nowIso = new Date().toISOString();
          await supabase
            .from("candidate_checklist_items")
            .update({ is_completed: true, completed_at: nowIso, completed_by: changedBy })
            .in("id", toCheck.map((row: any) => row.id));
        }
      }
    } catch (e: any) {
      // Non-fatal: stage move already succeeded.
      console.warn("Carry-forward of homework failed:", e?.message ?? e);
    }


    computeMetrics();
    qc.invalidateQueries({ queryKey: ["candidates"] });

    toast.success(`Moved ${candidate.name} → ${toLabel}`, {
      description: `From ${fromLabel}`,
      duration: 6000,
      action: {
        label: "Undo",
        onClick: async () => {
          setCandidates((prev) =>
            prev.map((c) => (c.id === candidate.id ? { ...c, stage: fromStage, daysInStage: previousDays } : c)),
          );
          await supabase
            .from("candidates")
            .update({ current_stage: uiStageToDb(fromStage) as any })
            .eq("id", dbId);
          await supabase.from("candidate_stage_history").insert({
            candidate_id: dbId,
            from_stage: uiStageToDb(toStage) as any,
            to_stage: uiStageToDb(fromStage) as any,
            changed_by: changedBy,
            notes: "undo",
          });
          computeMetrics();
          qc.invalidateQueries({ queryKey: ["candidates"] });
          toast.info(`Reverted ${candidate.name} to ${fromLabel}`);
        },
      },
    });
  };

  const submitDisqualify = async () => {
    if (!disqualifyTarget) return;
    const reason = disqualifyReason.trim();
    if (!reason) {
      toast.error("Please enter a disqualification reason.");
      return;
    }
    const { candidate, fromStage } = disqualifyTarget;
    const previousDays = candidate.daysInStage;
    const dbId = (candidate as any).dbId as string | undefined;

    // Optimistic UI
    applyStageMove(candidate.id, "disqualified");
    setDisqualifyTarget(null);
    setDisqualifyReason("");

    if (!dbId) {
      toast.error("Missing DB id; change not persisted.");
      return;
    }

    const { data: sess } = await supabase.auth.getUser();
    const changedBy = sess?.user?.email ?? "unknown";

    const { error: updErr } = await supabase
      .from("candidates")
      .update({ current_stage: "disqualified" as any, status: "disqualified" })
      .eq("id", dbId);

    if (updErr) {
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, stage: fromStage, daysInStage: previousDays } : c)),
      );
      toast.error(`Failed to disqualify ${candidate.name}: ${updErr.message}`);
      return;
    }

    const { error: histErr } = await supabase.from("candidate_stage_history").insert({
      candidate_id: dbId,
      from_stage: uiStageToDb(fromStage) as any,
      to_stage: "disqualified" as any,
      changed_by: changedBy,
      notes: reason,
    });
    if (histErr) {
      toast.warning(`Disqualified, but history not logged: ${histErr.message}`);
    }

    computeMetrics();
    qc.invalidateQueries({ queryKey: ["candidates"] });
    toast.success(`Disqualified ${candidate.name}`, { description: reason });
  };

  const handleUpdate = (updated: Candidate) => {
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setActive(updated);
  };

  const handleSaveProfile = async (
    dbPatch: Record<string, any>,
    localPatch: Partial<Candidate>,
  ) => {
    if (!active) return;
    const dbId = (active as any).dbId as string | undefined;
    const localId = active.id;
    const matchesTarget = (candidate: Candidate) => {
      const candidateDbId = (candidate as any).dbId as string | undefined;
      return dbId ? candidateDbId === dbId : candidate.id === localId;
    };
    const revertPatch = Object.keys(localPatch).reduce((acc, key) => {
      (acc as any)[key] = (active as any)[key];
      return acc;
    }, {} as Partial<Candidate>);

    setCandidates((prev) =>
      prev.map((candidate) => (matchesTarget(candidate) ? { ...candidate, ...localPatch } : candidate)),
    );
    setActive((prev) => (prev && matchesTarget(prev) ? { ...prev, ...localPatch } : prev));

    if (!dbId) {
      toast.warning("Saved locally — no database record linked.");
      return;
    }
    if (Object.keys(dbPatch).length === 0) {
      // local-only field (e.g. source)
      return;
    }
    const { data: updatedRows, error } = await supabase
      .from("candidates")
      .update(dbPatch as any)
      .eq("id", dbId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      setCandidates((prev) =>
        prev.map((candidate) => (matchesTarget(candidate) ? { ...candidate, ...revertPatch } : candidate)),
      );
      setActive((prev) => (prev && matchesTarget(prev) ? { ...prev, ...revertPatch } : prev));
      throw new Error(error?.message ?? "Update did not affect any row (permission or missing record).");
    }

    // Sync safe fields back to teacher_prospects (master record).
    // NEVER sync `email` — that's the Smartlead-verified address, locked by design.
    // assigned_to / source / fit_* are candidate-only concepts.
    const prospectId = (active as any).prospectId as string | null | undefined;
    if (prospectId) {
      const SYNC_FIELDS = [
        "first_name", "last_name", "phone", "city", "state", "other_email",
        "mailing_street", "mailing_city", "mailing_state", "mailing_zip",
      ] as const;

      const tpPatch: Record<string, any> = {};
      for (const k of SYNC_FIELDS) {
        if (k in dbPatch) tpPatch[k] = (dbPatch as any)[k];
      }
      if (Object.keys(tpPatch).length > 0) {
        const { error: tpErr } = await supabase
          .from("teacher_prospects")
          .update(tpPatch as any)
          .eq("id", prospectId);
        if (tpErr) {
          // Don't block — candidate is the pipeline source of truth. Just warn.
          console.warn("teacher_prospects sync failed:", tpErr.message);
          toast.warning("Saved to candidate, but master sync failed");
        }
      }
    }

    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["candidates"] });
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

  const isChecklistGate = pendingMove?.toStage === "confirmation" && pendingIncompleteCount > 0;
  const fromLabel = pendingMove ? STAGES.find((s) => s.id === pendingMove.fromStage)?.label : "";
  const toLabel = pendingMove ? STAGES.find((s) => s.id === pendingMove.toStage)?.label : "";

  // Filter chip styling
  const chipBase = "px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap";
  const chipActive = { backgroundColor: "#174be8", color: "#ffffff" };
  const chipInactive = { backgroundColor: "#ffffff", color: "#495057", border: "1px solid #cfe0ff" };

  return (
    <div className="-mx-3 md:-mx-5 lg:-mx-6 -my-3 px-3 md:px-5 lg:px-6 py-3 min-h-screen" style={{ backgroundColor: "#ffffff" }}>
      <div className="max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Candidate Pipeline"
        subtitle="Track and manage franchise candidates through every stage of the qualification process."
        hideJourneyBar
        action={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/teacher-prospects")}
              className="w-full sm:w-auto"
            >
              <UserPlus size={14} /> Promote from Prospect
            </Button>
            <Button
              size="sm"
              onClick={() => setNewOpen(true)}
              className="text-white w-full sm:w-auto"
              style={{ backgroundColor: "#fd7e14" }}
            >
              <Plus size={14} /> New Candidate
            </Button>
          </div>
        }
      />

      <PipelineAnalyticsBar
        totalInPipeline={metrics.totalInPipeline}
        hotLeads={metrics.hotLeads}
        conversionRate={metrics.conversionRate}
        newThisWeek={metrics.newThisWeek}
      />

      {/* Filter strip */}
      <div className="bg-white rounded-xl px-3 py-2.5 mb-3 shadow-sm flex flex-wrap items-center gap-x-3 gap-y-2" style={{ border: "1px solid #cfe0ff" }}>
        <div className="flex items-center gap-1.5" style={{ color: "#526078" }}>
          <Filter size={13} />
          <span className="text-xs font-semibold uppercase tracking-wide">Filter</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "#526078" }}>Owner:</span>
          <button
            onClick={() => setOwnerFilter("all")}
            className={chipBase}
            style={ownerFilter === "all" ? chipActive : chipInactive}
          >
            All
          </button>
          {teamMembers.map((m) => {
            const cap = m.firstName.charAt(0).toUpperCase() + m.firstName.slice(1);
            return (
              <button
                key={m.email}
                onClick={() => setOwnerFilter(m.email)}
                className={chipBase}
                style={ownerFilter === m.email ? chipActive : chipInactive}
                title={m.email}
              >
                {cap}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "#526078" }}>Tag:</span>
          {(["all", ...FIT_TAGS] as TagFilter[]).map((t) => (
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
          <span className="text-[11px] font-medium" style={{ color: "#526078" }}>Fit:</span>
          {([
            { id: "all" as FitFilter, label: "All" },
            { id: "90" as FitFilter, label: "90+" },
            { id: "75" as FitFilter, label: "75–89" },
            { id: "60" as FitFilter, label: "60–74" },
            { id: "lt60" as FitFilter, label: "<60" },
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

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "#526078" }}>Days in stage:</span>
          {([
            { id: "all" as const, label: "All" },
            { id: "fresh" as const, label: "Fresh (≤3)" },
            { id: "watch" as const, label: "Watch (4–7)" },
            { id: "stalled" as const, label: "Stalled (8+)" },
          ]).map((d) => (
            <button
              key={d.id}
              onClick={() => setDaysFilter(d.id)}
              className={chipBase}
              style={daysFilter === d.id ? chipActive : chipInactive}
            >
              {d.label}
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

      {/* Toolbar: density + collapse */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-xl px-3 py-2 shadow-sm" style={{ border: "1px solid #cfe0ff" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "#526078" }}>Density:</span>
          <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid #cfe0ff" }}>
            <button
              onClick={() => setCompact(false)}
              className="px-2 py-1 text-xs font-medium flex items-center gap-1"
              style={{
                backgroundColor: !compact ? "#174be8" : "#ffffff",
                color: !compact ? "#ffffff" : "#495057",
              }}
            >
              <Rows3 size={12} /> Comfortable
            </button>
            <button
              onClick={() => setCompact(true)}
              className="px-2 py-1 text-xs font-medium flex items-center gap-1"
              style={{
                backgroundColor: compact ? "#174be8" : "#ffffff",
                color: compact ? "#ffffff" : "#495057",
              }}
            >
              <Rows2 size={12} /> Compact
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3 ml-4 pl-4 text-[11px]" style={{ color: "#526078", borderLeft: "1px solid #cfe0ff" }}>
            <span className="font-semibold uppercase tracking-wider text-[10px]">Days in stage:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#20c997" }} />
              Fresh
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#fd7e14" }} />
              Watch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#dc3545" }} />
              Stalled
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CardLegendPopover />
          {collapsed.size > 0 && (
            <button
              onClick={() => setCollapsed(new Set())}
              className="text-xs font-medium px-2 py-1 rounded-md hover:bg-[#f3f6fb]"
              style={{ color: "#174be8" }}
            >
              Expand all
            </button>
          )}
          <button
            onClick={collapseEmpty}
            className="text-xs font-medium px-2 py-1 rounded-md hover:bg-[#f3f6fb] flex items-center gap-1"
            style={{ color: "#526078" }}
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
        onSaveProfile={handleSaveProfile}
        teamMembers={teamMembers}
      />

      {/* Drag-drop confirm */}
      <AlertDialog
        open={!!pendingMove}
        onOpenChange={(v) => {
          if (!v) {
            setPendingMove(null);
            setPendingIncompleteCount(0);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isChecklistGate
                ? "Checklist required for Confirmation"
                : `Move ${pendingMove?.candidate.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isChecklistGate ? (
                <>
                  All Trial Close items must be completed before moving this candidate into Confirmation.
                  You can override in special cases.
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
              style={{ backgroundColor: isChecklistGate ? "#dc3545" : "#003c7e" }}
            >
              {isChecklistGate ? "Override & Move" : "Move"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disqualification reason modal */}
      <AlertDialog
        open={!!disqualifyTarget}
        onOpenChange={(v) => {
          if (!v) {
            setDisqualifyTarget(null);
            setDisqualifyReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disqualify {disqualifyTarget?.candidate.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a short reason. This will be recorded in stage history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <textarea
              autoFocus
              value={disqualifyReason}
              onChange={(e) => setDisqualifyReason(e.target.value)}
              placeholder="e.g. Insufficient capital, declined offer, lost interest…"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "#dee2e6" }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitDisqualify}
              className="text-white"
              style={{ backgroundColor: "#dc3545" }}
            >
              Disqualify
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

      <NewCandidateModal
        open={newOpen}
        onOpenChange={setNewOpen}
        teamMembers={teamMembers}
        onCreated={handleCandidateCreated}
      />
      </div>
    </div>
  );
};

export default CandidatePipeline;
