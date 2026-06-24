import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Quote,
  FileEdit,
} from "lucide-react";

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

type FilterKey = "all" | "note" | "changes" | "stage" | "vote";

const MAX_NOTE = 2000;

const iconFor = (type: ActivityType) => {
  if (type === "stage_changed") return ArrowRight;
  if (type === "vote_cast") return CheckCircle2;
  if (type === "lead_sheet_saved") return FileEdit;
  if (type === "process_step_updated") return Pencil;
  return MessageSquare;
};

const accentFor = (type: ActivityType): { bg: string; fg: string } => {
  if (type === "note") return { bg: "#fef3c7", fg: "#92400e" };
  if (type === "stage_changed") return { bg: "#dbeafe", fg: "#1e40af" };
  if (type === "vote_cast") return { bg: "#dcfce7", fg: "#166534" };
  if (type === "lead_sheet_saved") return { bg: "#e0e7ff", fg: "#3730a3" };
  if (type === "process_step_updated") return { bg: "#fce7f3", fg: "#9d174d" };
  return { bg: "#e7f1ff", fg: "#003c7e" };
};

const formatRelative = (iso: string) => {
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

const formatAbsolute = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const shortEmail = (e: string | null) => {
  if (!e) return "system";
  const at = e.indexOf("@");
  return at > 0 ? e.slice(0, at) : e;
};

const matchesFilter = (row: ActivityRow, f: FilterKey) => {
  if (f === "all") return true;
  if (f === "note") return row.type === "note";
  if (f === "changes") return row.type === "lead_sheet_saved" || row.type === "process_step_updated";
  if (f === "stage") return row.type === "stage_changed";
  if (f === "vote") return row.type === "vote_cast";
  return true;
};

export function NotesActivityTab({ candidate }: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const dbId = (candidate as any).dbId as string | undefined;

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

  const notes = useMemo(() => rows.filter((r) => r.type === "note"), [rows]);
  const events = useMemo(() => rows.filter((r) => r.type !== "note"), [rows]);

  const counts = useMemo(() => {
    const c = { all: events.length, changes: 0, stage: 0, vote: 0 };
    for (const r of events) {
      if (r.type === "lead_sheet_saved" || r.type === "process_step_updated") c.changes++;
      else if (r.type === "stage_changed") c.stage++;
      else if (r.type === "vote_cast") c.vote++;
    }
    return c;
  }, [events]);

  const visibleEvents = useMemo(
    () => events.filter((r) => matchesFilter(r, filter)),
    [events, filter],
  );

  const filterChips: { key: FilterKey; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "changes", label: "Changes", n: counts.changes },
    { key: "stage", label: "Stage", n: counts.stage },
    { key: "vote", label: "Votes", n: counts.vote },
  ];

  const NOTES_PREVIEW = 5;
  const [showAllNotes, setShowAllNotes] = useState(false);
  const visibleNotes = showAllNotes ? notes : notes.slice(0, NOTES_PREVIEW);


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

      {/* Add Note — improved */}
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #e3e8ef" }}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={16} style={{ color: "#003c7e" }} />
          <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Add a note</h4>
        </div>
        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_NOTE))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Write what happened, what was said, or what to do next…"
          rows={4}
          className="resize-y text-sm"
          disabled={!dbId || posting}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px]" style={{ color: "#8893a7" }}>
            Press <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: "#f1f5f9", border: "1px solid #e3e8ef" }}>⌘/Ctrl + Enter</kbd> to post
            <span className="mx-2">·</span>
            <span style={{ color: text.length > MAX_NOTE * 0.9 ? "#b91c1c" : "#8893a7" }}>
              {text.length} / {MAX_NOTE}
            </span>
          </span>
          <Button
            onClick={submit}
            disabled={!dbId || posting || !text.trim()}
            className="text-white"
            style={{ backgroundColor: "#174be8" }}
            size="sm"
          >
            {posting ? "Saving…" : "Add Note"}
          </Button>
        </div>
        {!dbId && (
          <p className="text-[11px] mt-2" style={{ color: "#6c757d" }}>
            Notes can only be added for saved candidates.
          </p>
        )}
      </div>

      {/* Notes panel — dedicated, pinned above the activity timeline */}
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #e3e8ef" }}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} style={{ color: "#92400e" }} />
            <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>
              Notes <span style={{ color: "#8893a7", fontWeight: 400 }}>({notes.length})</span>
            </h4>
          </div>
        </div>
        {loading ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>
            No notes yet. Use the box above to add the first one.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {visibleNotes.map((a) => (
                <div
                  key={a.id}
                  className="flex gap-3 p-3 rounded-md"
                  style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#fef3c7" }}
                  >
                    <MessageSquare size={14} style={{ color: "#92400e" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold truncate" title={a.actor_email ?? "system"}>
                        {shortEmail(a.actor_email)}
                      </span>
                      <span
                        className="text-[11px] whitespace-nowrap"
                        style={{ color: "#8893a7" }}
                        title={new Date(a.created_at).toLocaleString()}
                      >
                        {formatRelative(a.created_at)} · {formatAbsolute(a.created_at)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <Quote size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                      <p className="text-sm break-words whitespace-pre-wrap" style={{ color: "#1f2937" }}>
                        {a.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {notes.length > NOTES_PREVIEW && (
              <button
                onClick={() => setShowAllNotes((v) => !v)}
                className="mt-3 text-xs font-medium"
                style={{ color: "#174be8" }}
              >
                {showAllNotes ? "Show fewer" : `Show all ${notes.length} notes`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Activity Timeline — system events only */}
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #e3e8ef" }}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Activity Timeline</h4>
          <div className="flex flex-wrap gap-1">
            {filterChips.map((c) => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className="text-[11px] px-2 py-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? "#174be8" : "#f1f5f9",
                    color: active ? "#ffffff" : "#475569",
                    border: `1px solid ${active ? "#174be8" : "#e3e8ef"}`,
                  }}
                >
                  {c.label} <span style={{ opacity: 0.7 }}>{c.n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>
        ) : visibleEvents.length === 0 ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>
            {events.length === 0 ? "No activity yet." : "No activity matches this filter."}
          </p>
        ) : (
          <div className="space-y-2">
            {visibleEvents.map((a) => {
              const Icon = iconFor(a.type);
              const accent = accentFor(a.type);
              const meta = a.metadata ?? {};
              const changes: Array<{ label: string; from: string; to: string }> =
                Array.isArray(meta.changes) ? meta.changes : [];

              return (
                <div key={a.id} className="flex gap-3 p-2 rounded-md">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: accent.bg }}
                  >
                    <Icon size={14} style={{ color: accent.fg }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold truncate" title={a.actor_email ?? "system"}>
                        {shortEmail(a.actor_email)}
                      </span>
                      <span
                        className="text-[11px] whitespace-nowrap"
                        style={{ color: "#8893a7" }}
                        title={new Date(a.created_at).toLocaleString()}
                      >
                        {formatRelative(a.created_at)} · {formatAbsolute(a.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5 break-words" style={{ color: "#1f2937" }}>
                      {a.content}
                    </p>
                    {changes.length > 0 && (
                      <ul className="mt-1.5 ml-1 space-y-0.5">
                        {changes.map((c, i) => (
                          <li key={i} className="text-[12px]" style={{ color: "#475569" }}>
                            <span className="font-medium">{c.label}:</span>{" "}
                            <span className="line-through" style={{ color: "#94a3b8" }}>
                              {c.from || "(empty)"}
                            </span>{" "}
                            <ArrowRight size={10} className="inline" />{" "}
                            <span style={{ color: "#0f172a" }}>{c.to || "(empty)"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
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

