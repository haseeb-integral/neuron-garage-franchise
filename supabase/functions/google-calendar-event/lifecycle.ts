export interface CalendarCall {
  id: string;
  title: string;
  notes: string | null;
  starts_at: string;
  duration_minutes: number;
  status: string;
  google_event_id: string | null;
  meet_url: string | null;
}

interface GoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: Array<{ entryPointType: string; uri: string }>;
  };
}

export type CalendarRequest = (method: string, path: string, body?: Record<string, unknown>) => Promise<Response>;

export class CalendarProviderError extends Error {
  constructor(public status: number, public details: string) {
    super(`Google Calendar request failed [${status}]: ${details}`);
  }
}

async function readEvent(response: Response): Promise<GoogleEvent> {
  const text = await response.text();
  if (!response.ok) throw new CalendarProviderError(response.status, text);
  return text ? JSON.parse(text) as GoogleEvent : {};
}

function meetLink(event: GoogleEvent): string | null {
  return event.hangoutLink ?? event.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ?? null;
}

/** Stable IDs also recover a Google success followed by a failed local save. */
export async function replacementEventId(previousId: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ng-restored:${previousId}`));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function syncCalendarCall(
  call: CalendarCall,
  attendee: { email: string; displayName: string } | null,
  request: CalendarRequest,
  removing = false,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 500)),
): Promise<{ google_event_id: string | null; meet_url: string | null; operation: string }> {
  if (!removing && call.status === 'completed') {
    return { google_event_id: call.google_event_id, meet_url: call.meet_url, operation: 'unchanged' };
  }
  if (removing || call.status === 'canceled') {
    const id = call.google_event_id ?? call.id.replaceAll('-', '');
    const response = await request('DELETE', `/events/${encodeURIComponent(id)}?sendUpdates=all`);
    if (!response.ok && response.status !== 404 && response.status !== 410) await readEvent(response);
    return { google_event_id: call.google_event_id, meet_url: null, operation: 'canceled' };
  }
  if (call.status !== 'scheduled') throw new Error('Only scheduled calls get an invite');
  if (!attendee?.email) throw new Error('This prospect has no email address');

  const start = new Date(call.starts_at);
  if (!Number.isFinite(start.getTime()) || call.duration_minutes < 5 || call.duration_minutes > 480) {
    throw new Error('The call needs a valid time and a length from 5 to 480 minutes');
  }
  const end = new Date(start.getTime() + call.duration_minutes * 60000);
  const desired = {
    summary: `${call.title} — Neuron Garage`, description: call.notes ?? '',
    start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() },
    attendees: [attendee],
  };
  let id = call.google_event_id ?? call.id.replaceAll('-', '');
  let google: GoogleEvent | null = null;
  let operation = 'unchanged';

  // Canceled Google IDs cannot be reused. Derive a stable successor for each restore.
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await request('GET', `/events/${encodeURIComponent(id)}`);
    if (response.ok) {
      const found = await readEvent(response);
      if (found.status !== 'cancelled') { google = found; break; }
      id = await replacementEventId(id);
    } else if (response.status === 410) {
      id = await replacementEventId(id);
    } else if (response.status === 404) {
      break;
    } else {
      await readEvent(response);
    }
    if (attempt === 7) throw new Error('Could not restore this Google call. Please retry or check the calendar.');
  }

  if (!google) {
    const response = await request('POST', '/events?conferenceDataVersion=1&sendUpdates=all', {
      ...desired, id,
      conferenceData: { createRequest: { requestId: id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    });
    // Another retry may have created this exact ID already.
    google = response.status === 409
      ? await readEvent(await request('GET', `/events/${encodeURIComponent(id)}`))
      : await readEvent(response);
    operation = 'created';
  }

  const changed = google.summary !== desired.summary || (google.description ?? '') !== desired.description
    || new Date(google.start?.dateTime ?? '').getTime() !== start.getTime()
    || new Date(google.end?.dateTime ?? '').getTime() !== end.getTime();
  if (changed || !meetLink(google)) {
    // PATCH leaves the existing conference and guests intact. Refresh guests only on creation.
    const { attendees: _attendees, ...details } = desired;
    google = await readEvent(await request('PATCH', `/events/${encodeURIComponent(id)}?conferenceDataVersion=1&sendUpdates=all`, {
      ...details,
      ...(!meetLink(google) && google.conferenceData?.createRequest?.status?.statusCode !== 'pending'
        ? { conferenceData: { createRequest: { requestId: id, conferenceSolutionKey: { type: 'hangoutsMeet' } } } }
        : {}),
    }));
    if (operation !== 'created') operation = 'updated';
  }
  for (let attempt = 0; !meetLink(google) && attempt < 3; attempt++) {
    await wait();
    google = await readEvent(await request('GET', `/events/${encodeURIComponent(id)}`));
  }
  return { google_event_id: id, meet_url: meetLink(google), operation };
}