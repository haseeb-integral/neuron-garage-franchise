import { useEffect, useState, useCallback } from "react";
import { Candidate, STAGE_PROCESS_ROADMAP, STAGES } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ArrowRight,
  ListChecks,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { ChecklistSection } from "../ChecklistSection";
import { logActivity, ActivityType } from "@/lib/candidateActivity";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
}

interface ActivityRow {
  id: string;
  type: ActivityType;
  content: string;
  metadata: Record<string, any> | null;
  actor_email: string | null;
  created_at: string;
}

const iconFor = (type: ActivityType) => {
  if (type === "stage_changed") return ArrowRight;
  if (type === "vote_cast") return CheckCircle2;
  if (type === "lead_sheet_saved" || type === "process_step_updated") return Pencil;
  return MessageSquare;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

export function NotesActivityTab({ candidate }: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const dbId = (candidate as any).dbId as string | undefined;
  const roadmap = STAGE_PROCESS_ROADMAP[candidate.stage] ?? [];
  const stageLabel = STAGES.find((s) => s.id === candidate.stage)?.label ?? candidate.stage;

  const load = useCallback(async () => {
    if (!dbId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("candidate_activities")
      .select("id, type, content, metadata, actor_email, created_at")
      .eq("candidate_id", dbId)
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      console.warn("Failed to load activities:", error.message);
      return;
    }
    setRows((data ?? []) as ActivityRow[]);
  }, [dbId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const content = text.trim();
    if (!content || !dbId) return;
    setPosting(true);
    await logActivity(dbId, "note", content);
    setPosting(false);
    setText("");
    toast.success("Note added");
    load();
  };

  return (
    <div className="space-y-4 pt-4">
      {dbId && (
        <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
          <div className="flex items-center gap-2 mb-1">
            <ListChecks size={16} style={{ color: "#003c7e" }} />
            <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>
              Process Roadmap — {stageLabel}
            </h4>
          </div>
          <p className="text-xs mb-3" style={{ color: "#6c757d" }}>
            Per-candidate steps for this stage. Any staff member can check, add, or remove items.
          </p>
          <ChecklistSection
            candidateDbId={dbId}
            stage={candidate.stage}
            kind="process"
            seedLabels={roadmap}
            addPlaceholder="Add a roadmap step…"
            emptyText="No roadmap steps yet."
          />
        </div>
      )}

      <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
        <h4 className="font-semibold mb-2 text-sm" style={{ color: "#003c7e" }}>Add Note</h4>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note about this candidate..."
          rows={3}
          className="mb-2"
          disabled={!dbId || posting}
        />
        <Button
          onClick={submit}
          disabled={!dbId || posting || !text.trim()}
          className="text-white"
          style={{ backgroundColor: "#174be8" }}
          size="sm"
        >
          {posting ? "Saving…" : "Add Note"}
        </Button>
        {!dbId && (
          <p className="text-[11px] mt-2" style={{ color: "#6c757d" }}>
            Notes can only be added for saved candidates.
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Activity Timeline</h4>
        {loading ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((a) => {
              const Icon = iconFor(a.type);
              return (
                <div key={a.id} className="flex gap-3 pb-3" style={{ borderBottom: "1px solid #f1f3f5" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#e7f1ff" }}
                  >
                    <Icon size={14} style={{ color: "#003c7e" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">
                        {a.actor_email ?? "system"}
                      </span>
                      <span className="text-xs whitespace-nowrap" style={{ color: "#6c757d" }}>
                        {formatTime(a.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 break-words">{a.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
