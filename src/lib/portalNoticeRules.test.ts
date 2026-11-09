import { describe, it, expect } from 'vitest';
import { opensStep, callNotice, callTemplateData, callReadyForNotice, safeMeetUrl, stepNoticeLinks, PERSONALITY_TEST_URL } from '../../supabase/functions/_shared/portalNoticeRules';
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
describe('Google call email safeguards', () => {
  const starts_at = '2026-11-11T21:00:00Z';
  const live = { starts_at, status: 'scheduled', notify_prospect: true, google_sync_pending: false, meet_url: 'https://meet.google.com/abc-defg-hij' };
  it('waits for the Google result before sending', () => {
    expect(callReadyForNotice(starts_at, { ...live, google_sync_pending: true })).toBe(false);
    expect(callReadyForNotice(starts_at, { ...live, meet_url: null })).toBe(false);
    expect(callReadyForNotice(starts_at, live)).toBe(true);
  });
  it('keeps Step 1 Google-only calls out of app emails', () => {
    expect(callReadyForNotice(starts_at, { ...live, notify_prospect: false })).toBe(false);
  });
  it('rejects moved and canceled saved notices', () => {
    expect(callReadyForNotice('2026-11-11T22:00:00Z', live)).toBe(false);
    expect(callReadyForNotice(starts_at, { ...live, status: 'canceled' })).toBe(false);
  });
  it('includes only a safe Google Meet link in email data', () => {
    expect(callTemplateData({ ...live, duration_minutes: 30 }, 'Sam').meetUrl).toBe(live.meet_url);
    expect(safeMeetUrl('https://meet.google.com.evil.example/a')).toBeUndefined();
    expect(safeMeetUrl('javascript:alert(1)')).toBeUndefined();
  });
  it('adds the personality test link to the Step 2 email only', () => {
    expect(stepNoticeLinks(2)).toEqual({ personalityUrl: 'https://zorakle.net/assessment-portal/welcome/neuron-garage' });
    expect(stepNoticeLinks(1)).toEqual({});
    expect(stepNoticeLinks(3)).toEqual({});
    expect(PERSONALITY_TEST_URL).toBe('https://zorakle.net/assessment-portal/welcome/neuron-garage');
  });
});