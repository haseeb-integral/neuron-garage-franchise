import { describe, it, expect } from 'vitest';
import { opensStep, callNotice, callTemplateData } from '../../supabase/functions/_shared/portalNoticeRules';
describe('prospect notice rules', () => {
  it('opens step 3 when FDD review advances to immersion', () => {
    expect(opensStep('fdd_review', 'immersion')).toBe(3);
  });
  it('does not notify backward or same-step moves', () => {
    expect(opensStep('immersion', 'fdd_review')).toBeNull();
    expect(opensStep('business_overview', 'fdd_review')).toBeNull();
    expect(opensStep('confirmation', 'disqualified')).toBeNull();
  });
  it('sends a booking for a new scheduled event', () => {
    expect(callNotice(null, { status: 'scheduled', starts_at: '2026-10-28T20:00:00Z' })).toBe('portal-call-booked');
  });
  it('sends a move only for changed time on a scheduled event', () => {
    const old = { status: 'scheduled', starts_at: '2026-10-28T20:00:00Z' };
    expect(callNotice(old, { ...old, starts_at: '2026-10-28T21:00:00Z' })).toBe('portal-call-moved');
    expect(callNotice(old, { ...old, starts_at: '2026-10-28T20:00:00.000Z' })).toBeNull();
  });
  it('does not send on completion or cancellation', () => {
    for (const status of ['completed', 'canceled']) expect(callNotice(null, { status, starts_at: '2026-10-28T20:00:00Z' })).toBeNull();
  });
  it('a restored booking is not a move', () => {
    expect(callNotice({ status: 'canceled', starts_at: '2026-10-28T20:00:00Z' },
      { status: 'scheduled', starts_at: '2026-10-28T21:00:00Z' })).toBe('portal-call-booked');
  });
  it('passes only public call fields, not staff notes or host email', () => {
    const result = callTemplateData({ title: 'Call', starts_at: '2026-10-28T21:00:00Z', duration_minutes: 30,
      notes: 'Private staff note', owner_email: 'private@example.com' }, 'Sam', 'Sam Reed');
    expect(Object.keys(result).sort()).toEqual(['callTitle','dateTime','duration','firstName','hostName']);
    expect(result.dateTime).toContain('3:00:00 PM MDT');
    expect(JSON.stringify(result)).not.toContain('Private staff note');
  });
});