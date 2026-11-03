/** Both download and Item 23 require a sent record, not merely portal availability. */
export function fddPortalUnlocked(step: number | null, sentAt: string | null, events: string[]): boolean {
  return step !== null && step >= 2 && (!!sentAt || events.includes('emailed'));
}
export function fddAccessAllowed(result: boolean | null | undefined): boolean {
  return result === true;
}