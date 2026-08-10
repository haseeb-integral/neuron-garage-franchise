import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { Candidate } from "@/data/pipelineData";
import {
  CandidateEvent,
  CandidateEventType,
  CandidateEventStatus,
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/lib/candidateEvents";
import { logActivity } from "@/lib/candidateActivity";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Candidates that can be picked. Pass a single-item list to lock the choice. */
  candidates: Candidate[];
  /** Locks the candidate picker when set (used from the candidate card). */
  lockedCandidateId?: string;
  /** Event being edited; omit to create a new one. */
  event?: CandidateEvent | null;
  /** Pre-filled date when creating from a calendar cell. */
  defaultDate?: Date | null;
  onSaved: () => void;
}

const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

export function EventDialog({
  open,
  onOpenChange,
  candidates,
  lockedCandidateId,
  event,
  defaultDate,
  onSaved,
}: Props) {
  const editing = !!event;
  const [candidateId, setCandidateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CandidateEventType>("call");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState<CandidateEventStatus>("scheduled");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () =>
      candidates
        .map((c) => ({ id: (c as any).dbId as string | undefined, name: c.name }))
        .filter((o): o is { id: string; name: string } => !!o.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [candidates],
  );

  useEffect(() => {
    if (!open) return;
    if (event) {
      setCandidateId(event.candidate_id);
      setTitle(event.title);
      setType(event.event_type);
      setWhen(toLocalInput(event.starts_at));
      setDuration(event.duration_minutes);
      setStatus(event.status);
      setNotes(event.notes ?? "");
    } else {
      const base = defaultDate ? new Date(defaultDate) : new Date();
      if (!defaultDate) base.setMinutes(0, 0, 0);
      if (base.getHours() === 0 && defaultDate) base.setHours(9, 0, 0, 0);
      setCandidateId(lockedCandidateId ?? "");
      setTitle("");
      setType("call");
      setWhen(format(base, "yyyy-MM-dd'T'HH:mm"));
      setDuration(30);
      setStatus("scheduled");
      setNotes("");
    }
  }, [open, event, defaultDate, lockedCandidateId]);

  const save = async () => {
    if (!candidateId) {
      toast.error("Pick a candidate first");
      return;
    }
    if (!when) {
      toast.error("Pick a date and time");
      return;
    }
    setSaving(true);
    try {
      const startsAt = new Date(when).toISOString();
      const finalTitle =
        title.trim() || (type === "call" ? "Call" : "Follow-up");
      if (editing && event) {
        await updateEvent(event.id, {
          candidate_id: candidateId,
          title: finalTitle,
          event_type: type,
          starts_at: startsAt,
          duration_minutes: duration,
          all_day: false,
          notes: notes.trim() || null,
          status,
        });
        await logActivity(
          candidateId,
          "event_updated",
          `${finalTitle} — ${format(new Date(startsAt), "EEE d MMM, h:mm a")} (${status})`,
          { event_id: event.id, event_type: type, status },
        );
        toast.success("Event updated");
      } else {
        const created = await createEvent({
          candidate_id: candidateId,
          title: finalTitle,
          event_type: type,
          starts_at: startsAt,
          duration_minutes: duration,
          all_day: false,
          notes: notes.trim() || null,
          status,
        });
        await logActivity(
          candidateId,
          "event_scheduled",
          `${finalTitle} scheduled for ${format(new Date(startsAt), "EEE d MMM, h:mm a")}`,
          { event_id: created.id, event_type: type },
        );
        toast.success("Event scheduled");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the event");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await deleteEvent(event.id);
      toast.success("Event deleted");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete the event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "Schedule an event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Candidate</Label>
            <Select
              value={candidateId}
              onValueChange={setCandidateId}
              disabled={!!lockedCandidateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a candidate" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CandidateEventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Length (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date and time</Label>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Business Overview Call"
            />
          </div>

          {editing && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CandidateEventStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda or reminder details"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <Button variant="outline" onClick={remove} disabled={saving} className="text-[#dc3545]">
              <Trash2 size={14} /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="text-white"
              style={{ backgroundColor: "#174be8" }}
            >
              {editing ? "Save" : "Schedule"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
