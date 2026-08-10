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
