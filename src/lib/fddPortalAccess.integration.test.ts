import { describe, it, expect } from 'vitest';
const base = process.env.PORTAL_TEST_URL;
const key = process.env.PORTAL_TEST_ANON_KEY;
const prospect = process.env.PORTAL_TEST_PROSPECT_TOKEN;
const staff = process.env.PORTAL_TEST_STAFF_TOKEN;
const candidateId = '871c0094-4091-451a-8594-c5d226c15c55';
async function call(path: string, body: unknown, token?: string) {
  const res = await fetch(`${base}/${path}`, { method: 'POST', headers: { apikey: key ?? '', Authorization: `Bearer ${token ?? key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
describe.skipIf(!base || !key || !prospect || !staff)('Live FDD access guards', () => {
  it('keeps the prior recorded recipient unlocked', async () => {
    const r = await call('rest/v1/rpc/portal_fdd_access', {}, prospect);
    expect(r.ok).toBe(true); expect(r.data).toBe(true);
  });
  it('rejects prospect attempts to send an FDD', async () => {
    const r = await call('functions/v1/send-transactional-email', { templateName: 'fdd-delivery', fddRequest: { candidateId, sendId: crypto.randomUUID() } }, prospect);
    expect(r.status).toBe(403);
  });
  it('rejects signed-out FDD requests', async () => {
    const r = await call('functions/v1/send-transactional-email', { templateName: 'fdd-delivery', fddRequest: { candidateId, sendId: crypto.randomUUID() } });
    expect([401,403]).toContain(r.status);
  });
  it('does not expose internal sent checks to prospects', async () => {
    const r = await call('rest/v1/rpc/fdd_has_been_sent', { _candidate_id: candidateId }, prospect);
    expect(r.ok).toBe(false);
  });
  it('repeating the same completed send is not a second email', async () => {
    const r = await call('functions/v1/send-transactional-email', { templateName: 'fdd-delivery', fddRequest: { candidateId, sendId: '2e21ff50-ed1a-453c-b67e-a0425373e75b' } }, staff);
    expect(r.ok).toBe(true); expect(r.data.status).toBe('sent');
  });
});