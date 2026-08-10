import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/data/pipelineData";
import {
  CandidateEvent,
  EVENT_TYPE_LABEL,
  eventColors,
  fetchEventsInRange,
} from "@/lib/candidateEvents";
import { EventDialog } from "./EventDialog";

type ViewMode = "day" | "week" | "month";

interface Props {
  candidates: Candidate[];
  onOpenCandidate: (c: Candidate) => void;
}

const chipBase =
  "px-2 py-1 text-xs font-medium rounded-md transition-colors";

export function CandidateCalendar({ candidates, onOpenCandidate }: Props) {
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [events, setEvents] = useState<CandidateEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CandidateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const byDbId = useMemo(() => {
    const m = new Map<string, Candidate>();
    for (const c of candidates) {
      const id = (c as any).dbId as string | undefined;
      if (id) m.set(id, c);
    }
    return m;
  }, [candidates]);

  const range = useMemo(() => {
    if (view === "day") {
      const from = startOfDay(cursor);
      return { from, to: addDays(from, 1) };
    }
    if (view === "week") {
      const from = startOfWeek(cursor, { weekStartsOn: 0 });
      return { from, to: addDays(from, 7) };
    }
    const from = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const to = addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }), 1);
    return { from, to };
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inRange, next] = await Promise.all([
        fetchEventsInRange(range.from, range.to),
        fetchEventsInRange(new Date(), addDays(new Date(), 60)),
      ]);
      setEvents(inRange);
      setUpcoming(next.filter((e) => e.status === "scheduled").slice(0, 8));
    } catch {
      setEvents([]);
      setUpcoming([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.from, end: addDays(range.to, -1) }),
    [range.from, range.to],
  );

  const eventsForDay = useCallback(
    (d: Date) => events.filter((e) => isSameDay(new Date(e.starts_at), d)),
    [events],
  );

  const step = (dir: 1 | -1) => {
    if (view === "day") setCursor((c) => addDays(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addMonths(c, dir));
  };

  const openNew = (d?: Date) => {
    setEditing(null);
    setDefaultDate(d ?? null);
    setDialogOpen(true);
  };

  const openEdit = (ev: CandidateEvent) => {
    setEditing(ev);
    setDefaultDate(null);
    setDialogOpen(true);
  };

  const title =
    view === "day"
      ? format(cursor, "EEEE d MMMM yyyy")
      : view === "week"
        ? `${format(range.from, "d MMM")} – ${format(addDays(range.to, -1), "d MMM yyyy")}`
        : format(cursor, "MMMM yyyy");

  const EventChip = ({ ev, showTime = true }: { ev: CandidateEvent; showTime?: boolean }) => {
    const c = eventColors(ev);
    const cand = byDbId.get(ev.candidate_id);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          openEdit(ev);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (cand) onOpenCandidate(cand);
        }}
        className="w-full text-left rounded-md px-1.5 py-1 text-[11px] leading-tight"
        style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}`, color: c.text }}
        title={`${EVENT_TYPE_LABEL[ev.event_type]} · ${cand?.name ?? "Unknown candidate"} · click to edit, double-click to open the card`}
      >
        <span className="font-semibold">
          {showTime ? format(new Date(ev.starts_at), "h:mm a") : ""} {cand?.name ?? "Unknown"}
        </span>
        <span className="block truncate opacity-80">{ev.title}</span>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
      <div className="bg-white rounded-xl shadow-sm" style={{ border: "1px solid #cfe0ff" }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #e9edf5" }}>
          <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid #cfe0ff" }}>
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={chipBase}
                style={{
                  backgroundColor: view === v ? "#174be8" : "#ffffff",
                  color: view === v ? "#ffffff" : "#495057",
                }}
              >
                {v === "day" ? "Day" : v === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => step(-1)}
              className="p-1 rounded-md hover:bg-[#f3f6fb]"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCursor(new Date())}
              className="text-xs font-medium px-2 py-1 rounded-md hover:bg-[#f3f6fb]"
              style={{ color: "#174be8" }}
            >
              Today
            </button>
            <button
              onClick={() => step(1)}
              className="p-1 rounded-md hover:bg-[#f3f6fb]"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="text-sm font-semibold" style={{ color: "#212529" }}>
            {title}
          </span>

          <Button
            size="sm"
            onClick={() => openNew(view === "month" ? null : cursor)}
            className="ml-auto text-white"
            style={{ backgroundColor: "#174be8" }}
          >
            <Plus size={14} /> Schedule
          </Button>
        </div>

        {/* Grid */}
        {view === "month" && (
          <div className="p-2">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-[11px] font-semibold uppercase tracking-wide text-center py-1"
                  style={{ color: "#526078" }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const dayEvents = eventsForDay(d);
                return (
                  <div
                    key={d.toISOString()}
                    onClick={() => openNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0))}
                    className="min-h-[92px] rounded-lg p-1 cursor-pointer hover:bg-[#f8faff]"
                    style={{
                      border: "1px solid #e9edf5",
                      backgroundColor: isSameMonth(d, cursor) ? "#ffffff" : "#fbfcfe",
                    }}
                  >
                    <div
                      className="text-[11px] font-semibold mb-1 inline-flex items-center justify-center rounded-full w-5 h-5"
                      style={{
                        color: isToday(d) ? "#ffffff" : isSameMonth(d, cursor) ? "#212529" : "#adb5bd",
                        backgroundColor: isToday(d) ? "#174be8" : "transparent",
                      }}
                    >
                      {format(d, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <EventChip key={ev.id} ev={ev} />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] font-medium" style={{ color: "#526078" }}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="p-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            {days.map((d) => {
              const dayEvents = eventsForDay(d);
              return (
                <div
                  key={d.toISOString()}
                  onClick={() => openNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0))}
                  className="min-h-[220px] rounded-lg p-1.5 cursor-pointer hover:bg-[#f8faff]"
                  style={{ border: "1px solid #e9edf5" }}
                >
                  <div className="text-[11px] font-semibold mb-1.5" style={{ color: isToday(d) ? "#174be8" : "#526078" }}>
                    {format(d, "EEE d")}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => (
                      <EventChip key={ev.id} ev={ev} />
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-[10px]" style={{ color: "#adb5bd" }}>
                        No calls
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "day" && (
          <div className="p-3 space-y-1.5">
            {eventsForDay(cursor).length === 0 && (
              <div className="text-sm py-8 text-center" style={{ color: "#adb5bd" }}>
                Nothing scheduled for this day. Click Schedule to add a call.
              </div>
            )}
            {eventsForDay(cursor).map((ev) => {
              const c = eventColors(ev);
              const cand = byDbId.get(ev.candidate_id);
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{ backgroundColor: c.bg, borderLeft: `4px solid ${c.border}` }}
                >
                  <div className="text-xs font-semibold w-20 shrink-0" style={{ color: c.text }}>
                    {format(new Date(ev.starts_at), "h:mm a")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: "#212529" }}>
                      {cand?.name ?? "Unknown candidate"} — {ev.title}
                    </div>
                    <div className="text-[11px]" style={{ color: "#526078" }}>
                      {EVENT_TYPE_LABEL[ev.event_type]} · {ev.duration_minutes} min · {ev.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(ev)}
                      className="text-xs font-medium px-2 py-1 rounded-md hover:bg-white/60"
                      style={{ color: "#174be8" }}
                    >
                      Edit
                    </button>
                    {cand && (
                      <button
                        onClick={() => onOpenCandidate(cand)}
                        className="text-xs font-medium px-2 py-1 rounded-md hover:bg-white/60"
                        style={{ color: "#526078" }}
                      >
                        Open card
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="px-3 pb-3 text-[11px]" style={{ color: "#adb5bd" }}>
            Loading events…
          </div>
        )}
      </div>

      {/* Upcoming rail */}
      <div className="bg-white rounded-xl shadow-sm p-3 h-fit" style={{ border: "1px solid #cfe0ff" }}>
        <div className="flex items-center gap-1.5 mb-2" style={{ color: "#526078" }}>
          <CalendarDays size={14} />
          <span className="text-xs font-semibold uppercase tracking-wide">Upcoming</span>
        </div>
        {upcoming.length === 0 && (
          <div className="text-xs" style={{ color: "#adb5bd" }}>
            No calls scheduled in the next 60 days.
          </div>
        )}
        <div className="space-y-1.5">
          {upcoming.map((ev) => {
            const cand = byDbId.get(ev.candidate_id);
            const c = eventColors(ev);
            return (
              <button
                key={ev.id}
                onClick={() => (cand ? onOpenCandidate(cand) : openEdit(ev))}
                className="w-full text-left rounded-md px-2 py-1.5"
                style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}` }}
              >
                <div className="text-[11px] font-semibold" style={{ color: c.text }}>
                  {format(new Date(ev.starts_at), "EEE d MMM · h:mm a")}
                </div>
                <div className="text-xs font-medium truncate" style={{ color: "#212529" }}>
                  {cand?.name ?? "Unknown candidate"}
                </div>
                <div className="text-[11px] truncate" style={{ color: "#526078" }}>
                  {ev.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidates={candidates}
        event={editing}
        defaultDate={defaultDate}
        onSaved={load}
      />
    </div>
  );
}
