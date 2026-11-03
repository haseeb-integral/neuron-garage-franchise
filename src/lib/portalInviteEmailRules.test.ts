import { describe, expect, it } from 'vitest';
import { isProspectInvite } from '../../supabase/functions/_shared/portalInviteEmailRules';
describe('Prospect-only invite wording', () => {
  it('uses prospect wording only on an invitation with the portal setup destination', () => {
    const url = 'https://example.test/verify?redirect_to=' + encodeURIComponent('https://example.test/reset-password?portal=1');
    expect(isProspectInvite('invite', url)).toBe(true);
    expect(isProspectInvite('invite', 'https://example.test/reset-password?portal=1')).toBe(true);
  });
  it('keeps staff invitations and every password reset on their existing wording', () => {
    expect(isProspectInvite('invite', 'https://example.test/verify?redirect_to=https%3A%2F%2Fexample.test%2Freset-password')).toBe(false);
    expect(isProspectInvite('recovery', 'https://example.test/reset-password?portal=1')).toBe(false);
    expect(isProspectInvite('invite', 'invalid')).toBe(false);
  });
});