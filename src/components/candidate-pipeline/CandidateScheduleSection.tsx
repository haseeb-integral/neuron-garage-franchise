import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/data/pipelineData";
import {
  CandidateEvent,
  EVENT_TYPE_LABEL,
  eventColors,
  fetchEventsForCandidate,
  updateEvent,
} from "@/lib/candidateEvents";
import { EventDialog } from "./EventDialog";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
}

/** Small scheduling panel shown at the top of the Qualification Process tab. */
export function CandidateScheduleSection({ candidate }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [events, setEvents] = useState<CandidateEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateEvent | null>(null);

  const load = useCallback(async () => {
    if (!dbId) return;
    try {
      setEvents(await fetchEventsForCandidate(dbId));
    } catch {
      setEvents([]);
    }
  }, [dbId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!dbId) return null;

  const markDone = async (ev: CandidateEvent) => {
    try {
      await updateEvent(ev.id, { status: "completed" });
      toast.success("Marked as done");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update the event");
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm" style={{ border: "1px solid #cfe0ff" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#526078" }}>
          Scheduled calls &amp; follow-ups
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <CalendarPlus size={14} /> Schedule
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="text-xs" style={{ color: "#adb5bd" }}>
          Nothing scheduled yet. These show up on the pipeline calendar.
        </p>
      ) : (
        <div className="space-y-1.5">
          {events.map((ev) => {
            const c = eventColors(ev);
            return (
              <div
                key={ev.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}` }}
              >
                <div className="text-[11px] font-semibold w-40 shrink-0" style={{ color: c.text }}>
                  {format(new Date(ev.starts_at), "EEE d MMM · h:mm a")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate" style={{ color: "#212529" }}>
                    {ev.title}
                  </div>
                  <div className="text-[11px]" style={{ color: "#526078" }}>
                    {EVENT_TYPE_LABEL[ev.event_type]} · {ev.duration_minutes} min · {ev.status}
                  </div>
                </div>
                {ev.status === "scheduled" && (
                  <button
                    onClick={() => markDone(ev)}
                    className="text-[11px] font-medium px-2 py-1 rounded-md hover:bg-white/60 flex items-center gap-1"
                    style={{ color: "#20c997" }}
                  >
                    <Check size={12} /> Done
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditing(ev);
                    setOpen(true);
                  }}
                  className="text-[11px] font-medium px-2 py-1 rounded-md hover:bg-white/60"
                  style={{ color: "#174be8" }}
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      )}

      <EventDialog
        open={open}
        onOpenChange={setOpen}
        candidates={[candidate]}
        lockedCandidateId={dbId}
        event={editing}
        onSaved={load}
      />
    </div>
  );
}
