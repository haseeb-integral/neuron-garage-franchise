import { processCallStartsAt, syncProcessCallEvent, type ProcessCallDetails } from './candidateEvents';

/** Explicit scheduling only; draft saves never call this action. */
export async function scheduleProcessCall(candidateId: string, step: number, title: string,
  details: ProcessCallDetails, saveDraft: () => Promise<void>) {
  if (!details.date || !details.time || !details.timeZone) throw new Error('Choose a date, time, and time zone first.');
  const duration = details.durationMinutes ?? 30;
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) throw new Error('Choose a call length from 5 to 480 minutes.');
  processCallStartsAt(details.date, details.time, details.timeZone);
  await saveDraft();
  return syncProcessCallEvent(candidateId, step, title, details);
}