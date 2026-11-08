import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent, deleteEvent, processCallStartsAt, syncProcessCallEvent, updateEvent } from "./candidateEvents";

const mock = vi.hoisted(() => ({ insert: vi.fn(), upsert: vi.fn(), eq: vi.fn(), update: vi.fn(), remove: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { email: "staff@example.com" } } }) },
  from: () => ({ insert: mock.insert, select: () => ({ eq: mock.eq }), upsert: mock.upsert, update: mock.update, delete: mock.remove }),
  functions: { invoke: mock.invoke },
} }));

describe("processCallStartsAt", () => {
  it("uses daylight-saving time for US zones", () => {
    expect(processCallStartsAt("2026-07-15", "09:00", "ET (Eastern)")).toBe("2026-07-15T13:00:00.000Z");
    expect(processCallStartsAt("2026-01-15", "09:00", "ET (Eastern)")).toBe("2026-01-15T14:00:00.000Z");
  });

  it("supports all six choices", () => {
    expect(processCallStartsAt("2026-07-15", "09:00", "CT (Central)")).toBe("2026-07-15T14:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "MT (Mountain)")).toBe("2026-07-15T15:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "PT (Pacific)")).toBe("2026-07-15T16:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "AKT (Alaska)")).toBe("2026-07-15T17:00:00.000Z");
    expect(processCallStartsAt("2026-07-15", "09:00", "HT (Hawaii)")).toBe("2026-07-15T19:00:00.000Z");
  });

  it("rejects a skipped daylight-saving time", () => {
    expect(() => processCallStartsAt("2026-03-08", "02:30", "ET (Eastern)")).toThrow(
      "does not exist",
    );
  });
});

describe('linked Google call saving', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.eq.mockReturnValue({ maybeSingle: async () => ({ data: { google_event_id: 'google-id', notify_prospect: false, status: 'scheduled' }, error: null }) });
    mock.update.mockReturnValue({ eq: async () => ({ error: null }) });
    mock.remove.mockReturnValue({ eq: async () => ({ error: null }) });
    mock.invoke.mockResolvedValue({ data: { meet_url: 'https://meet.google.com/test-link' }, error: null });
  });
  it('syncs edits while leaving the no-app-email setting unchanged', async () => {
    await updateEvent('call-id', { starts_at: '2026-11-11T20:00:00Z', duration_minutes: 60 });
    expect(mock.update).toHaveBeenCalledWith({ starts_at: '2026-11-11T20:00:00Z', duration_minutes: 60 });
    expect(mock.invoke).toHaveBeenCalledWith('google-calendar-event', { body: { event_id: 'call-id', action: 'sync' } });
  });
  it('does not delete the saved Google ID when cancellation fails', async () => {
    mock.invoke.mockResolvedValue({ data: { error: 'Calendar unavailable' }, error: null });
    await expect(deleteEvent('call-id')).rejects.toThrow('Call not deleted');
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('deletes locally only after Google cancellation succeeds', async () => {
    await deleteEvent('call-id');
    expect(mock.invoke).toHaveBeenCalledWith('google-calendar-event', { body: { event_id: 'call-id', action: 'delete' } });
    expect(mock.invoke.mock.invocationCallOrder[0]).toBeLessThan(mock.remove.mock.invocationCallOrder[0]);
  });
  it('creates invites for ordinary unlinked calls in Phase B', async () => {
    mock.eq.mockReturnValue({ maybeSingle: async () => ({ data: { google_event_id: null, notify_prospect: true, status: 'scheduled' }, error: null }) });
    await updateEvent('call-id', { notes: 'Updated' });
    expect(mock.invoke).toHaveBeenCalledWith('google-calendar-event', { body: { event_id: 'call-id', action: 'sync' } });
  });
  it('preserves completed Google history without a provider update', async () => {
    mock.eq.mockReturnValue({ maybeSingle: async () => ({ data: { google_event_id: 'google-id', notify_prospect: false, status: 'completed' }, error: null }) });
    await updateEvent('call-id', { status: 'completed' });
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it('creates one Google invite after saving a new ordinary call', async () => {
    mock.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'new-call' }, error: null }) }) });
    await createEvent({ candidate_id: 'candidate', title: 'Call', event_type: 'call', starts_at: '2026-11-12T22:00:00Z', duration_minutes: 30, all_day: false });
    expect(mock.invoke).toHaveBeenCalledTimes(1);
    expect(mock.invoke).toHaveBeenCalledWith('google-calendar-event', { body: { event_id: 'new-call', action: 'sync' } });
    expect(mock.insert.mock.invocationCallOrder[0]).toBeLessThan(mock.invoke.mock.invocationCallOrder[0]);
  });
});

describe("Step 2 next-call saving", () => {
  it("saves one Step 3 call linked to its Step 2 source", async () => {
    mock.eq.mockReturnValue({ eq: mock.eq, maybeSingle: async () => ({ data: { id: 'saved-call', status: 'scheduled', notify_prospect: true }, error: null }) });
    mock.upsert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'saved-call' }, error: null }) }) });
    expect(await syncProcessCallEvent("candidate", 2, "Business Immersion & Evaluation", {
      date: "2026-11-10", time: "15:00", timeZone: "MT (Mountain)",
    })).toBe("updated");
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({
      candidate_id: "candidate", source_process_step: 2,
      starts_at: "2026-11-10T22:00:00.000Z", event_type: "call",
      title: "Step 3 — Business Immersion & Evaluation",
    }), { onConflict: "candidate_id,source_process_step" });
    expect(mock.invoke).toHaveBeenCalledWith('google-calendar-event', { body: { event_id: 'saved-call', action: 'sync' } });
  });
  it('creates a Google invite for a newly saved process call too', async () => {
    mock.eq.mockReturnValueOnce({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) });
    mock.upsert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'process-new' }, error: null }) }) });
    expect(await syncProcessCallEvent('candidate', 1, 'Business Overview', { date: '2026-11-12', time: '15:00', timeZone: 'MT (Mountain)' })).toBe('created');
    expect(mock.invoke).toHaveBeenCalledWith('google-calendar-event', { body: { event_id: 'process-new', action: 'sync' } });
  });
});