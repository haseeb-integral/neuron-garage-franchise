import { describe, it, expect } from 'vitest';
import { fddPortalUnlocked, fddAccessAllowed } from './fddPortalAccess';
describe('FDD portal unlock', () => {
  it('keeps Step 2 locked before email is sent', () => expect(fddPortalUnlocked(2, null, [])).toBe(false));
  it('does not treat availability or download as sent proof', () => expect(fddPortalUnlocked(2, null, ['made_available', 'downloaded'])).toBe(false));
  it('keeps old recorded send dates unlocked', () => expect(fddPortalUnlocked(2, '2026-10-01', [])).toBe(true));
  it('keeps old emailed events unlocked', () => expect(fddPortalUnlocked(3, null, ['emailed'])).toBe(true));
  it('does not unlock Step 1', () => expect(fddPortalUnlocked(1, '2026-10-01', ['emailed'])).toBe(false));
  it('does not unlock a closed process', () => expect(fddPortalUnlocked(null, '2026-10-01', ['emailed'])).toBe(false));
  it('keeps download and receipt locked while the access check is unknown', () => {
    expect(fddAccessAllowed(undefined)).toBe(false);
    expect(fddAccessAllowed(null)).toBe(false);
    expect(fddAccessAllowed(false)).toBe(false);
    expect(fddAccessAllowed(true)).toBe(true);
  });
});