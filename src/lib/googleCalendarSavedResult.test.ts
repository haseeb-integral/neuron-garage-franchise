import { describe, expect, it } from 'vitest';
import { savedResultMatches } from '../../supabase/functions/google-calendar-event/savedResult';

describe('Google saved-result read-back', () => {
  const call = { candidate_id: 'candidate', title: 'Call', notes: null, starts_at: '2026-11-14T19:30:00Z', duration_minutes: 30, status: 'scheduled', google_event_id: 'google-id', meet_url: 'https://meet.google.com/abc-defg-hij', google_sync_pending: false };
  const result = { google_event_id: call.google_event_id, meet_url: call.meet_url };
  it('accepts an identical already-finished save', () => {
    expect(savedResultMatches(call, { ...call, starts_at: '2026-11-14T19:30:00.000Z' }, result, false)).toBe(true);
  });
  it('rejects a genuinely moved call', () => {
    expect(savedResultMatches(call, { ...call, starts_at: '2026-11-14T20:30:00Z' }, result, false)).toBe(false);
  });
  it('rejects cancellation and completed history', () => {
    for (const status of ['canceled', 'completed']) expect(savedResultMatches(call, { ...call, status }, result, false)).toBe(false);
  });
  it('rejects deleted calls and deletion actions', () => {
    expect(savedResultMatches(call, null, result, false)).toBe(false);
    expect(savedResultMatches(call, call, result, true)).toBe(false);
  });
  it('rejects changed details, unfinished saves, and different Google results', () => {
    for (const patch of [{ title: 'New title' }, { notes: 'Changed' }, { duration_minutes: 60 }, { candidate_id: 'other' }, { google_sync_pending: true }, { google_event_id: 'other' }, { meet_url: null }]) {
      expect(savedResultMatches(call, { ...call, ...patch }, result, false)).toBe(false);
    }
  });
});