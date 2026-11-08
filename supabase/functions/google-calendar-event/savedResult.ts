export interface SavedCall {
  candidate_id: string;
  title: string;
  notes: string | null;
  starts_at: string;
  duration_minutes: number;
  status: string;
  google_event_id: string | null;
  meet_url: string | null;
  google_sync_pending?: boolean;
}

/** Only an identical, finished scheduled call can satisfy a raced save. */
export function savedResultMatches(requested: SavedCall, live: SavedCall | null,
  result: { google_event_id: string | null; meet_url: string | null }, removing: boolean): boolean {
  return !removing && requested.status === 'scheduled' && !!live
    && live.status === 'scheduled' && live.google_sync_pending === false
    && live.candidate_id === requested.candidate_id
    && live.title === requested.title && live.notes === requested.notes
    && live.duration_minutes === requested.duration_minutes
    && new Date(live.starts_at).getTime() === new Date(requested.starts_at).getTime()
    && !!result.google_event_id && !!result.meet_url
    && live.google_event_id === result.google_event_id && live.meet_url === result.meet_url;
}