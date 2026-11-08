export const NOTICE_STEP_TITLES: Record<number, string> = {
  1: 'Initial Qualification', 2: 'Business Overview and FDD Review',
  3: 'Business Immersion and Evaluation', 4: 'Confirmation Call', 5: 'Signing Call',
}
export function noticeStep(stage: string): number | null {
  return ({ new_lead: 1, initial_qualification: 1, business_overview: 2,
    fdd_review: 2, immersion: 3, confirmation: 4, signing: 5 } as Record<string, number>)[stage] ?? null
}
export function opensStep(before: string, after: string): number | null {
  const from = noticeStep(before), to = noticeStep(after)
  return from !== null && to !== null && to > from ? to : null
}
export function callNotice(before: { status: string; starts_at: string } | null,
  after: { status: string; starts_at: string }): 'portal-call-booked' | 'portal-call-moved' | null {
  if (after.status !== 'scheduled') return null
  if (!before || before.status !== 'scheduled') return 'portal-call-booked'
  return new Date(before.starts_at).getTime() !== new Date(after.starts_at).getTime() ? 'portal-call-moved' : null
}
export function callTemplateData(row: Record<string, unknown>, firstName: string, hostName?: string) {
  return {
    firstName, callTitle: String(row.title ?? 'Neuron Garage call'), hostName,
    duration: Number(row.duration_minutes),
    ...(safeMeetUrl(row.meet_url) ? { meetUrl: safeMeetUrl(row.meet_url) } : {}),
    dateTime: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', dateStyle: 'full', timeStyle: 'long' })
      .format(new Date(String(row.starts_at))),
  }
}
export function safeMeetUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'meet.google.com' && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}
export function callReadyForNotice(savedStartsAt: string, live: { status: string; starts_at: string; notify_prospect: boolean; google_sync_pending: boolean; meet_url: string | null } | null): boolean {
  return !!live && live.status === 'scheduled' && live.notify_prospect && !live.google_sync_pending
    && !!safeMeetUrl(live.meet_url) && new Date(savedStartsAt).getTime() === new Date(live.starts_at).getTime()
}
// Day-before reminder: the call must still be scheduled at the same saved time,
// and its Mountain-time calendar date must be the day after "now".
function denverDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
export function reminderDue(savedStartsAt: string, current: { status: string; starts_at: string } | null, now: Date): boolean {
  if (!current || current.status !== 'scheduled') return false
  const start = new Date(current.starts_at)
  if (start.getTime() !== new Date(savedStartsAt).getTime()) return false
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)
  return start.getTime() > now.getTime() && denverDate(start) === denverDate(tomorrow)
}
