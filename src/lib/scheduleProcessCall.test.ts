import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ sync: vi.fn(), starts: vi.fn() }));
vi.mock('./candidateEvents', () => ({ processCallStartsAt: mocks.starts, syncProcessCallEvent: mocks.sync }));
import { scheduleProcessCall } from './scheduleProcessCall';
describe('explicit next-call scheduling', () => {
  const details = { date: '2026-11-14', time: '12:00', timeZone: 'MT (Mountain)', durationMinutes: 30 };
  beforeEach(() => { vi.clearAllMocks(); mocks.sync.mockResolvedValue('created'); });
  it('saves the draft before one calendar action', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    await scheduleProcessCall('candidate', 1, 'Business Overview', details, save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(save.mock.invocationCallOrder[0]).toBeLessThan(mocks.sync.mock.invocationCallOrder[0]);
  });
  it('does not schedule missing call details', async () => {
    await expect(scheduleProcessCall('candidate', 1, 'Call', { ...details, time: '' }, vi.fn())).rejects.toThrow('date, time, and time zone');
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('rejects invalid lengths without saving or sending', async () => {
    const save = vi.fn();
    await expect(scheduleProcessCall('candidate', 1, 'Call', { ...details, durationMinutes: 4 }, save)).rejects.toThrow('5 to 480');
    expect(save).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('does not send when draft saving fails', async () => {
    await expect(scheduleProcessCall('candidate', 1, 'Call', details, vi.fn().mockRejectedValue(new Error('Save failed')))).rejects.toThrow('Save failed');
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});