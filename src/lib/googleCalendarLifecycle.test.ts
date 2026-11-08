import { describe, expect, it, vi } from 'vitest';
import { CalendarProviderError, replacementEventId, syncCalendarCall, type CalendarCall } from '../../supabase/functions/google-calendar-event/lifecycle';

const call: CalendarCall = {
  id: '8c664e96-3ec7-4445-abbd-da81e36ad02a', title: 'Initial Qualification', notes: 'Agenda',
  starts_at: '2026-11-10T20:00:00.000Z', duration_minutes: 30, status: 'scheduled',
  google_event_id: 'existing', meet_url: 'https://meet.google.com/test-link',
};
const attendee = { email: 'test@example.com', displayName: 'Test Prospect' };
const google = {
  id: 'existing', status: 'confirmed', summary: 'Initial Qualification — Neuron Garage', description: 'Agenda',
  start: { dateTime: call.starts_at }, end: { dateTime: '2026-11-10T20:30:00.000Z' }, hangoutLink: call.meet_url,
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('Google call lifecycle', () => {
  it('updates the same event for time, length, title and notes without replacing Meet', async () => {
    const request = vi.fn().mockResolvedValueOnce(response(google)).mockResolvedValueOnce(response({ ...google, summary: 'New — Neuron Garage' }));
    const result = await syncCalendarCall({ ...call, title: 'New', notes: 'New agenda', duration_minutes: 60, starts_at: '2026-11-11T20:00:00Z' }, attendee, request);
    expect(request.mock.calls[1]).toEqual(['PATCH', '/events/existing?conferenceDataVersion=1&sendUpdates=all', {
      summary: 'New — Neuron Garage', description: 'New agenda',
      start: { dateTime: '2026-11-11T20:00:00.000Z' }, end: { dateTime: '2026-11-11T21:00:00.000Z' },
    }]);
    expect(result.google_event_id).toBe('existing');
    expect(result.meet_url).toBe(call.meet_url);
  });
  it('cancels guests but keeps the saved event ID for retry and restore', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect(await syncCalendarCall({ ...call, status: 'canceled' }, null, request)).toEqual({ google_event_id: 'existing', meet_url: null, operation: 'canceled' });
    expect(request).toHaveBeenCalledWith('DELETE', '/events/existing?sendUpdates=all');
  });
  it('cancels Google before deleting a local scheduled call', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect((await syncCalendarCall(call, attendee, request, true)).operation).toBe('canceled');
    expect(request.mock.calls[0][0]).toBe('DELETE');
  });
  it('does not cancel or alter completed-call history', async () => {
    const request = vi.fn();
    expect((await syncCalendarCall({ ...call, status: 'completed' }, null, request)).operation).toBe('unchanged');
    expect(request).not.toHaveBeenCalled();
  });
  it('restores using a stable new ID and recovers a failed local save without a second invite', async () => {
    const nextId = await replacementEventId('existing');
    const request = vi.fn().mockResolvedValueOnce(response({ status: 'cancelled' }))
      .mockResolvedValueOnce(response({ error: 'missing' }, 404)).mockResolvedValueOnce(response({ ...google, id: nextId }));
    expect((await syncCalendarCall(call, attendee, request)).google_event_id).toBe(nextId);
    expect(request.mock.calls[2][2]).toMatchObject({ id: nextId, attendees: [attendee] });
    const retry = vi.fn().mockResolvedValueOnce(response({ status: 'cancelled' })).mockResolvedValueOnce(response({ ...google, id: nextId }));
    expect((await syncCalendarCall(call, attendee, retry)).google_event_id).toBe(nextId);
    expect(retry.mock.calls.map(c => c[0])).toEqual(['GET', 'GET']);
  });
  it('recovers first-create retries using the local UUID instead of creating duplicates', async () => {
    const request = vi.fn().mockResolvedValue(response(google));
    await syncCalendarCall({ ...call, google_event_id: null }, attendee, request);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]).toBe('/events/8c664e963ec74445abbdda81e36ad02a');
  });
  it('keeps provider status and failure text rather than masking failed cancellation', async () => {
    const request = vi.fn().mockResolvedValue(response({ error: 'Forbidden' }, 403));
    await expect(syncCalendarCall(call, attendee, request, true)).rejects.toMatchObject<Partial<CalendarProviderError>>({ status: 403, details: '{"error":"Forbidden"}' });
  });
  it('treats an already-canceled invite as a successful retry', async () => {
    const request = vi.fn().mockResolvedValue(response({}, 410));
    expect((await syncCalendarCall(call, null, request, true)).operation).toBe('canceled');
  });
  it('waits for a pending Meet link and does not claim one exists early', async () => {
    const pending = { ...google, hangoutLink: undefined, conferenceData: { createRequest: { status: { statusCode: 'pending' } } } };
    const request = vi.fn().mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response(google));
    const wait = vi.fn().mockResolvedValue(undefined);
    expect((await syncCalendarCall(call, attendee, request, false, wait)).meet_url).toBe(call.meet_url);
    expect(wait).toHaveBeenCalledTimes(1);
  });
});