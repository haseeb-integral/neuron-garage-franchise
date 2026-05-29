import { useState } from "react";
import { Candidate, STAGE_PROCESS_ROADMAP, STAGES } from "@/data/pipelineData";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Mail, ArrowRight, ListChecks } from "lucide-react";
import { ChecklistSection } from "../ChecklistSection";

interface Props {
  candidate: Candidate;
  onAddNote: (content: string) => void;
}

const iconFor = (type: string) => {
  if (type === "call") return Phone;
  if (type === "email") return Mail;
  if (type === "stage_change") return ArrowRight;
  return MessageSquare;
};

export function NotesActivityTab({ candidate, onAddNote }: Props) {
  const [text, setText] = useState("");
  const dbId = (candidate as any).dbId as string | undefined;
  const roadmap = STAGE_PROCESS_ROADMAP[candidate.stage] ?? [];
  const stageLabel = STAGES.find((s) => s.id === candidate.stage)?.label ?? candidate.stage;

  const submit = () => {
    if (!text.trim()) return;
    onAddNote(text.trim());
    setText("");
  };

  const sorted = [...candidate.activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-4 pt-4">
      {dbId && (
        <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
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

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-2 text-sm" style={{ color: "#003c7e" }}>Add Note</h4>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note about this candidate..."
          rows={3}
          className="mb-2"
        />
        <Button
          onClick={submit}
          className="text-white"
          style={{ backgroundColor: "#174be8" }}
          size="sm"
        >
          Add Note
        </Button>
      </div>

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Activity Timeline</h4>
        <div className="space-y-3">
          {sorted.map((a) => {
            const Icon = iconFor(a.type);
            return (
              <div key={a.id} className="flex gap-3 pb-3" style={{ borderBottom: "1px solid #f1f3f5" }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#e7f1ff" }}
                >
                  <Icon size={14} style={{ color: "#003c7e" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{a.author}</span>
                    <span className="text-xs" style={{ color: "#6c757d" }}>{a.timestamp}</span>
                  </div>
                  <p className="text-sm mt-1">{a.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
