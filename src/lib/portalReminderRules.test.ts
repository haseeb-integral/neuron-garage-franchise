import { describe, it, expect } from 'vitest';
import { reminderDue } from '../../supabase/functions/_shared/portalNoticeRules';
// "now" = 9 AM Mountain (MDT) on Oct 27 2026
const now = new Date('2026-10-27T15:00:00Z');
const at = '2026-10-28T21:00:00Z'; // 3 PM Mountain, Oct 28
describe('day-before reminder', () => {
  it('sends for a scheduled call tomorrow', () => {
    expect(reminderDue(at, { status: 'scheduled', starts_at: at }, now)).toBe(true);
  });
  it('skips a call later today', () => {
    const t = '2026-10-27T22:00:00Z';
    expect(reminderDue(t, { status: 'scheduled', starts_at: t }, now)).toBe(false);
  });
  it('skips a call two days out', () => {
    const t = '2026-10-29T21:00:00Z';
    expect(reminderDue(t, { status: 'scheduled', starts_at: t }, now)).toBe(false);
  });
  it('skips canceled or done calls', () => {
    expect(reminderDue(at, { status: 'canceled', starts_at: at }, now)).toBe(false);
    expect(reminderDue(at, { status: 'completed', starts_at: at }, now)).toBe(false);
    expect(reminderDue(at, null, now)).toBe(false);
  });
  it('skips a call moved after the reminder was queued', () => {
    expect(reminderDue(at, { status: 'scheduled', starts_at: '2026-10-28T22:00:00Z' }, now)).toBe(false);
  });
  it('uses the Mountain date, not the UTC date', () => {
    // 8 PM Mountain Oct 28 = 02:00 UTC Oct 29, still "tomorrow" in Mountain time
    const t = '2026-10-29T02:00:00Z';
    expect(reminderDue(t, { status: 'scheduled', starts_at: t }, now)).toBe(true);
  });
});
