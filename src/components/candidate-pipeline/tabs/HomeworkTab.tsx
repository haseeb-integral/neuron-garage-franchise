import { useEffect, useState } from "react";
import { Candidate, STAGE_HOMEWORK, TrialClose } from "@/data/pipelineData";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, BookOpen, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StageDocumentsSection } from "../StageDocumentsSection";


interface Props {
  candidate: Candidate;
  onTrialCloseChange: (key: keyof TrialClose, value: boolean) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export function HomeworkTab({ candidate, onTrialCloseChange }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const homework = STAGE_HOMEWORK[candidate.stage] ?? [];
  const showFddLock = candidate.stage === "fdd_review" && candidate.fddSentDate;
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);


  let daysRemaining = 0;
  if (showFddLock && candidate.fddSentDate) {
    const sent = new Date(candidate.fddSentDate).getTime();
    const unlock = sent + 16 * 24 * 60 * 60 * 1000;
    daysRemaining = Math.max(0, Math.ceil((unlock - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  useEffect(() => {
    let cancelled = false;
    if (!dbId) {
      setItems([]);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("candidate_checklist_items")
        .select("id, label, is_completed, completed_at, completed_by")
        .eq("candidate_id", dbId)
        .eq("stage", candidate.stage as any)
        .eq("kind", "homework")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load checklist", error);
        toast.error("Couldn't load checklist", { description: error.message });
        setItems([]);
        setLoading(false);
        return;
      }

      // Lazy-seed from STAGE_HOMEWORK the first time a stage is opened with zero rows.
      if ((data?.length ?? 0) === 0 && homework.length > 0) {
        const seedRows = homework.map((label) => ({
          candidate_id: dbId,
          stage: candidate.stage as any,
          label,
          is_completed: false,
          kind: "homework",
        }));
        const { data: inserted, error: insertErr } = await supabase
          .from("candidate_checklist_items")
          .insert(seedRows)
          .select("id, label, is_completed, completed_at, completed_by");
        if (cancelled) return;
        if (insertErr) {
          console.error("Failed to seed checklist", insertErr);
          toast.error("Couldn't seed checklist", { description: insertErr.message });
          setItems([]);
        } else {
          setItems(inserted ?? []);
        }
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dbId, candidate.stage, homework]);

  const handleToggle = async (item: ChecklistItem, checked: boolean) => {
    if (!dbId) return;
    const previous = items;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              is_completed: checked,
              completed_at: checked ? new Date().toISOString() : null,
            }
          : i,
      ),
    );

    const { data: sess } = await supabase.auth.getUser();
    const email = sess?.user?.email ?? null;

    const { error } = await supabase
      .from("candidate_checklist_items")
      .update({
        is_completed: checked,
        completed_at: checked ? new Date().toISOString() : null,
        completed_by: checked ? email : null,
      })
      .eq("id", item.id);

    if (error) {
      setItems(previous);
      toast.error("Couldn't update item", { description: error.message });
    }
  };

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label || !dbId) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("candidate_checklist_items")
      .insert({
        candidate_id: dbId,
        stage: candidate.stage as any,
        label,
        is_completed: false,
        kind: "homework",
      })
      .select("id, label, is_completed, completed_at, completed_by")
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Couldn't add item", { description: error?.message });
      return;
    }
    setItems((prev) => [...prev, data]);
    setNewLabel("");
  };

  const handleDelete = async (item: ChecklistItem) => {
    if (!dbId) return;
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const { error } = await supabase
      .from("candidate_checklist_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      setItems(previous);
      toast.error("Couldn't delete item", { description: error.message });
    }
  };

  const showDbChecklist = !!dbId;


  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} style={{ color: "#003c7e" }} />
          <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Stage Homework</h4>
        </div>
        {homework.length === 0 ? (
          <p className="text-sm" style={{ color: "#6c757d" }}>No homework assigned for this stage.</p>
        ) : (
          <ul className="space-y-2">
            {homework.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: "#fd7e14" }}>•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dbId && <StageDocumentsSection candidateDbId={dbId} stage={candidate.stage} />}



      {showFddLock && (
        <div
          className="rounded-lg p-4 flex items-start gap-2"
          style={{ backgroundColor: "#fff4d1", border: "1px solid #ffca28" }}
        >
          <Lock size={16} style={{ color: "#7a5a00" }} className="mt-0.5" />
          <div>
            <div className="font-semibold text-sm mb-1" style={{ color: "#7a5a00" }}>Stage 4 FDD Lock</div>
            <p className="text-sm" style={{ color: "#7a5a00" }}>
              Cannot advance past Stage 4 until 16 days after FDD sent date.
            </p>
            <p className="text-sm font-semibold mt-1" style={{ color: "#7a5a00" }}>
              {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` : "Lock period complete — eligible to advance"}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Trial Close Checklist</h4>
        <p className="text-xs mb-3" style={{ color: "#6c757d" }}>
          All items must be checked before advancing to next stage.
        </p>

        {showDbChecklist ? (
          loading ? (
            <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>
          ) : (
            <>
              {items.length === 0 ? (
                <p className="text-xs mb-3" style={{ color: "#6c757d" }}>
                  No checklist items for this stage yet.
                </p>
              ) : (
                <div className="space-y-2 mb-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={(v) => handleToggle(item, !!v)}
                        />
                        <span className="text-sm">{item.label}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                        aria-label={`Delete ${item.label}`}
                        title="Delete item"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "#dee2e6" }}>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="Add a checklist item…"
                  className="h-8 text-sm"
                  disabled={adding}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAdd}
                  disabled={adding || !newLabel.trim()}
                  className="h-8"
                >
                  <Plus size={14} className="mr-1" />
                  Add
                </Button>
              </div>
            </>
          )
        ) : (

          // Fallback: legacy in-memory trial close (used outside Confirmation / mock data)
          <div className="space-y-2">
            {([
              { key: "answeredQuestions" as const, label: "Answered all questions" },
              { key: "prospectSummarized" as const, label: "Prospect summarized key takeaways" },
              { key: "askedToMoveForward" as const, label: "Asked if they want to move forward" },
              { key: "scheduledNextCall" as const, label: "Scheduled next call" },
              { key: "assignedHomework" as const, label: "Assigned homework" },
            ]).map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={candidate.trialClose[item.key]}
                  onCheckedChange={(v) => onTrialCloseChange(item.key, !!v)}
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
