import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TeacherProspect } from "@/data/teacherData";
import { FitScoreBadge } from "./FitScoreBadge";
import { Linkedin, Mail, Phone, GraduationCap, Calendar, X, Plus } from "lucide-react";

interface Props {
  prospect: TeacherProspect | null;
  onClose: () => void;
  onUpdate: (p: TeacherProspect) => void;
  onPromote: (p: TeacherProspect) => void;
  onMarkNotFit: (p: TeacherProspect) => void;
  isPromoted?: boolean;
  isPromoting?: boolean;
}

export function TeacherDetailPanel({ prospect, onClose, onUpdate, onPromote, onMarkNotFit, isPromoted, isPromoting }: Props) {
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (prospect) {
      setTags(prospect.tags);
      setNotes(prospect.notes);
    }
  }, [prospect]);

  if (!prospect) return null;

  const save = (nextTags: string[], nextNotes: string) => {
    onUpdate({ ...prospect, tags: nextTags, notes: nextNotes });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const next = [...tags, newTag.trim()];
    setTags(next); setNewTag(""); save(next, notes);
  };

  const removeTag = (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next); save(next, notes);
  };

  return (
    <Sheet open={!!prospect} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="bg-white p-0 w-full sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="p-6 pb-4 border-b" style={{ borderColor: "#dee2e6" }}>
          <SheetTitle className="text-2xl" style={{ color: "#003c7e" }}>{prospect.name}</SheetTitle>
          <p className="text-sm" style={{ color: "#6c757d" }}>{prospect.school}</p>
          <p className="text-sm" style={{ color: "#6c757d" }}>{prospect.city}, {prospect.state}</p>
        </SheetHeader>

        <div className="p-6 space-y-5">
          {/* Contact */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#868e96" }}>Contact</h4>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#343a40" }}>
              <Mail size={14} style={{ color: "#adb5bd" }} /> {prospect.email}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#343a40" }}>
              <Phone size={14} style={{ color: "#adb5bd" }} /> {prospect.phone}
            </div>
            <a
              href={`https://${prospect.linkedin}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-sm hover:underline"
              style={{ color: "#0a66c2" }}
            >
              <Linkedin size={14} /> {prospect.linkedin}
            </a>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#868e96" }}>Background</h4>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#343a40" }}>
              <GraduationCap size={14} style={{ color: "#adb5bd" }} /> Grade Level: <strong>{prospect.gradeLevel}</strong>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#343a40" }}>
              <Calendar size={14} style={{ color: "#adb5bd" }} /> {prospect.yearsExperience} years experience
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: "#343a40" }}>Summer Camp Experience:</span>
              <Badge
                style={{
                  backgroundColor: prospect.hasSummerCampExp ? "#d8f5ea" : "#e9ecef",
                  color: prospect.hasSummerCampExp ? "#0d7a4e" : "#6c757d",
                }}
                className="border-0"
              >
                {prospect.hasSummerCampExp ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {/* AI Fit Score */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "#fff4ec", border: "1px solid #ffe4cc" }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#fd7e14" }}>AI Fit Score</h4>
              <FitScoreBadge score={prospect.fitScore} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#343a40" }}>{prospect.aiReasoning}</p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#868e96" }}>Tags</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: "#e7f1ff", color: "#003c7e" }}>
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-600"><X size={12} /></button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs" style={{ color: "#adb5bd" }}>No tags yet</span>}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="Add tag..."
                className="h-8 text-sm bg-white"
              />
              <Button size="sm" variant="outline" onClick={addTag} className="h-8"><Plus size={14} /></Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#868e96" }}>Notes</h4>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => save(tags, notes)}
              placeholder="Add internal notes..."
              className="bg-white min-h-[80px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 text-white"
              style={{ backgroundColor: isPromoted ? "#adb5bd" : "#fd7e14" }}
              disabled={isPromoted || isPromoting}
              onClick={() => onPromote(prospect)}
            >
              {isPromoted ? "Promoted ✓" : isPromoting ? "Promoting…" : "Promote to Pipeline"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              style={{ borderColor: "#ff4438", color: "#ff4438" }}
              onClick={() => onMarkNotFit(prospect)}
            >
              Mark Not a Fit
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
