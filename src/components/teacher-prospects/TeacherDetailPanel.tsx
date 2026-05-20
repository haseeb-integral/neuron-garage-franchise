import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TeacherProspect } from "@/data/teacherData";
import { FitScoreBadge } from "./FitScoreBadge";
import { Linkedin, Mail, Phone, GraduationCap, Calendar, X, Plus, Sparkles, MapPin, MailPlus, UserX } from "lucide-react";

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

  const save = (nextTags: string[], nextNotes: string) => onUpdate({ ...prospect, tags: nextTags, notes: nextNotes });
  const addTag = () => {
    if (!newTag.trim()) return;
    const next = [...tags, newTag.trim()];
    setTags(next);
    setNewTag("");
    save(next, notes);
  };
  const removeTag = (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    save(next, notes);
  };

  return (
    <Sheet open={!!prospect} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-white p-0 sm:max-w-[470px]">
        <SheetHeader className="border-b border-[#e7edf5] bg-white p-6 pb-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-2xl font-black text-[#07142f]">{prospect.name}</SheetTitle>
              <p className="mt-1 text-sm font-medium text-[#526078]">{prospect.school}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#66728a]"><MapPin size={14} /> {prospect.city}, {prospect.state}</p>
            </div>
            <FitScoreBadge score={prospect.fitScore} />
          </div>
        </SheetHeader>

        <div className="space-y-5 p-6">
          <section className="rounded-xl border border-[#e7edf5] bg-white p-4">
            <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-[#8794ab]">Contact</h4>
            <div className="space-y-2 text-sm text-[#34445f]">
              <div className="flex items-center gap-2"><Mail size={14} className="text-[#8794ab]" /> {prospect.email || <span className="italic text-[#b0bbd0]">no email on file</span>}</div>
              {prospect.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-[#8794ab]" /> {prospect.phone}</div>}
              {prospect.linkedinUrl ? (
                <a href={/^https?:\/\//i.test(prospect.linkedinUrl) ? prospect.linkedinUrl : `https://${prospect.linkedinUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-[#0a66c2] hover:underline"><Linkedin size={14} /> View LinkedIn profile</a>
              ) : (
                <div className="flex items-center gap-2 text-[#b0bbd0]"><Linkedin size={14} /> <span className="italic">no LinkedIn</span></div>
              )}
              {prospect.title && <div className="text-xs text-[#526078]"><span className="font-semibold text-[#07142f]">Title:</span> {prospect.title}</div>}
              {prospect.schoolUrl && (
                <a href={/^https?:\/\//i.test(prospect.schoolUrl) ? prospect.schoolUrl : `https://${prospect.schoolUrl}`} target="_blank" rel="noreferrer" className="block truncate text-xs text-[#174be8] hover:underline">{prospect.schoolUrl} ↗</a>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#e7edf5] bg-white p-4">
            <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-[#8794ab]">Background</h4>
            <div className="grid gap-3 text-sm text-[#34445f]">
              <div className="flex items-center gap-2">
                <GraduationCap size={14} className="text-[#8794ab]" /> Grade Level:{" "}
                {prospect.gradeRaw
                  ? <strong className="text-[#07142f]">{prospect.gradeRaw}</strong>
                  : <span className="italic text-[#b0bbd0]">not yet enriched</span>}
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#8794ab]" />
                {prospect.experienceYearsRaw != null
                  ? <span>{prospect.experienceYearsRaw} years experience</span>
                  : <span className="italic text-[#b0bbd0]">years experience not enriched</span>}
              </div>
              {prospect.district && <div className="text-xs text-[#526078]"><span className="font-semibold text-[#07142f]">District:</span> {prospect.district}</div>}
            </div>
          </section>

          <section className="rounded-xl border border-[#e7edf5] bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#174be8]"><Sparkles size={14} /> AI Fit Score</h4>
              <FitScoreBadge score={prospect.fitScore} />
            </div>
            <p className="text-sm leading-6 text-[#34445f]">{prospect.aiReasoning}</p>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-[#8794ab]">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-bold text-[#174be8]">
                  {t}<button onClick={() => removeTag(t)} className="hover:text-red-600"><X size={12} /></button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs text-[#8794ab]">No tags yet</span>}
            </div>
            <div className="flex gap-2">
              <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Add tag..." className="h-9 rounded-lg border-[#dbe4f2] bg-white text-sm focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
              <Button size="sm" variant="outline" onClick={addTag} className="h-9 border-[#dbe4f2] text-[#174be8]"><Plus size={14} /></Button>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-[#8794ab]">Notes</h4>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => save(tags, notes)} placeholder="Add internal notes..." className="min-h-[86px] rounded-lg border-[#dbe4f2] bg-white focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
          </section>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button className="bg-[#174be8] text-white hover:bg-[#123fc5]" disabled={isPromoted || isPromoting} onClick={() => onPromote(prospect)}><MailPlus size={16} /> {isPromoted ? "In Outreach ✓" : isPromoting ? "Adding…" : "Add to Outreach"}</Button>
            <Button variant="outline" className="border-[#ef4444] text-[#ef4444] hover:bg-[#fff5f5]" onClick={() => onMarkNotFit(prospect)}><UserX size={16} /> Not a Fit</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
