import { supabase } from "@/integrations/supabase/client";

export type CandidateEventType = "call" | "follow_up";
export type CandidateEventStatus = "scheduled" | "completed" | "canceled";

export interface CandidateEvent {
  id: string;
  candidate_id: string;
  title: string;
  event_type: CandidateEventType;
  starts_at: string; // ISO (UTC)
  duration_minutes: number;
  all_day: boolean;
  notes: string | null;
  status: CandidateEventStatus;
  owner_email: string | null;
  created_by: string | null;
  source_process_step: number | null;
}

export interface CandidateEventInput {
  candidate_id: string;
  title: string;
  event_type: CandidateEventType;
  starts_at: string;
  duration_minutes: number;
  all_day: boolean;
  notes?: string | null;
  status?: CandidateEventStatus;
  owner_email?: string | null;
  source_process_step?: number | null;
}

const TABLE = "candidate_events";

/** Fetch events that start inside [from, to). */
export async function fetchEventsInRange(from: Date, to: Date): Promise<CandidateEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CandidateEvent[];
}

/** Fetch every event for one candidate, newest first. */
export async function fetchEventsForCandidate(candidateId: string): Promise<CandidateEvent[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("candidate_id", candidateId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CandidateEvent[];
}

export async function createEvent(input: CandidateEventInput): Promise<CandidateEvent> {
  const { data: sess } = await supabase.auth.getUser();
  const email = sess?.user?.email ?? null;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...input,
      status: input.status ?? "scheduled",
      owner_email: input.owner_email ?? email,
      created_by: email,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CandidateEvent;
}

export async function updateEvent(id: string, patch: Partial<CandidateEventInput>): Promise<void> {
  const { error } = await supabase.from(TABLE).update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

const PROCESS_TIME_ZONES: Record<string, string> = {
  "ET (Eastern)": "America/New_York",
  "CT (Central)": "America/Chicago",
  "MT (Mountain)": "America/Denver",
  "PT (Pacific)": "America/Los_Angeles",
  "AKT (Alaska)": "America/Anchorage",
  "HT (Hawaii)": "Pacific/Honolulu",
};

const zonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
};

/** Convert the process form's local date/time and US time-zone label to UTC. */
export function processCallStartsAt(date: string, time: string, timeZoneLabel: string): string {
  const timeZone = PROCESS_TIME_ZONES[timeZoneLabel];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!timeZone || !match || !timeMatch) throw new Error("Enter a valid date, time, and time zone");

  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  };
  const desiredUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  let instant = desiredUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const shown = zonedParts(new Date(instant), timeZone);
    const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
    instant += desiredUtc - shownUtc;
  }
  const finalParts = zonedParts(new Date(instant), timeZone);
  if (
    finalParts.year !== desired.year ||
    finalParts.month !== desired.month ||
    finalParts.day !== desired.day ||
    finalParts.hour !== desired.hour ||
    finalParts.minute !== desired.minute
  ) {
    throw new Error("That local time does not exist because of daylight-saving time. Pick another time.");
  }
  return new Date(instant).toISOString();
}

export type ProcessEventSyncResult = "created" | "updated" | "canceled" | "unchanged";

export interface ProcessCallDetails {
  date?: string;
  time?: string;
  timeZone?: string;
  /** Option value from EVENT_TYPE_OPTIONS (e.g. "step-2", "follow-up"). */
  typeOption?: string;
  durationMinutes?: number;
  title?: string;
  notes?: string;
}

/**
 * Keep one automatic calendar event linked to a candidate's process step.
 * The date/time/time zone drive the event: fill them in and the call appears,
 * clear them and the call is marked canceled (kept in history).
 */
export async function syncProcessCallEvent(
  candidateId: string,
  sourceStep: number,
  nextStepTitle: string,
  details: ProcessCallDetails,
): Promise<ProcessEventSyncResult> {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select("id,status,starts_at,title")
    .eq("candidate_id", candidateId)
    .eq("source_process_step", sourceStep)
    .maybeSingle();
  if (readError) throw readError;

  const complete = !!(details.date && details.time && details.timeZone);
  if (!complete) {
    if (!existing || existing.status === "canceled") return "unchanged";
    const { error } = await supabase.from(TABLE).update({ status: "canceled" }).eq("id", existing.id);
    if (error) throw error;
    return "canceled";
  }

  const startsAt = processCallStartsAt(details.date!, details.time!, details.timeZone!);
  const option = details.typeOption
    ? PROCESS_EVENT_OPTIONS.find((o) => o.value === details.typeOption)
    : undefined;
  const defaultTitle = option
    ? option.label.includes(" — ")
      ? option.label.split(" — ")[1]
      : option.label
    : `Step ${sourceStep + 1} — ${nextStepTitle}`;
  const title = details.title?.trim() || defaultTitle;
  const duration =
    details.durationMinutes && details.durationMinutes > 0 ? details.durationMinutes : 30;
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? null;
  const payload = {
    candidate_id: candidateId,
    title,
    event_type: (option?.kind ?? "call") as CandidateEventType,
    starts_at: startsAt,
    duration_minutes: duration,
    all_day: false,
    notes:
      details.notes?.trim() ||
      `Automatically scheduled from Qualification Process Step ${sourceStep}.`,
    status: "scheduled" as const,
    owner_email: existing ? undefined : email,
    created_by: existing ? undefined : email,
    source_process_step: sourceStep,
  };
  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: "candidate_id,source_process_step" });
  if (error) throw error;
  return existing ? "updated" : "created";
}

/** Visual state used by the calendar blocks. */
export type EventVisualState = "upcoming" | "completed" | "missed" | "canceled";

export function eventVisualState(ev: CandidateEvent, now: Date = new Date()): EventVisualState {
  if (ev.status === "completed") return "completed";
  if (ev.status === "canceled") return "canceled";
  const end = new Date(new Date(ev.starts_at).getTime() + ev.duration_minutes * 60000);
  return end < now ? "missed" : "upcoming";
}

export const EVENT_TYPE_LABEL: Record<CandidateEventType, string> = {
  call: "Call",
  follow_up: "Follow-up",
};

/** Colors: calls are blue, follow-ups amber; state changes the shade. */
export function eventColors(ev: CandidateEvent, now: Date = new Date()) {
  const state = eventVisualState(ev, now);
  if (state === "completed") return { bg: "#e6f7f0", border: "#20c997", text: "#0d6b4f" };
  if (state === "missed") return { bg: "#fdecec", border: "#dc3545", text: "#a32029" };
  if (state === "canceled") return { bg: "#f1f3f5", border: "#adb5bd", text: "#6c757d" };
  return ev.event_type === "follow_up"
    ? { bg: "#fff4e5", border: "#fd7e14", text: "#8a4b06" }
    : { bg: "#eaf1ff", border: "#174be8", text: "#123a9e" };
}
