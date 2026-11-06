import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

// Shared "Shared NG Franchise Development" calendar (owner: sam.reed@neurongarage.com).
const CALENDAR_ID = 'c_2657dd51a7eb8df6bb86775a5b4aa780644ed97abb01fd24ca65ada54b09140a@group.calendar.google.com'
const GATEWAY = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({ event_id: z.string().uuid() })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const URL_ = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const LOVABLE = Deno.env.get('LOVABLE_API_KEY')
    const GCAL = Deno.env.get('GOOGLE_CALENDAR_API_KEY')
    if (!LOVABLE || !GCAL) return json({ error: 'Google Calendar is not connected' }, 500)

    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)
    const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } })
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7))
    if (cErr || !claims?.claims?.sub) return json({ error: 'Not signed in' }, 401)
    const admin = createClient(URL_, SERVICE)
    const { data: staff } = await admin.rpc('is_staff', { _user_id: claims.claims.sub })
    if (!staff) return json({ error: 'Staff only' }, 403)

    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)

    const { data: ev, error: eErr } = await admin.from('candidate_events')
      .select('id,candidate_id,title,notes,starts_at,duration_minutes,status,google_event_id,meet_url')
      .eq('id', parsed.data.event_id).maybeSingle()
    if (eErr || !ev) return json({ error: 'Event not found' }, 404)
    if (ev.google_event_id) return json({ google_event_id: ev.google_event_id, meet_url: ev.meet_url })
    if (ev.status !== 'scheduled') return json({ error: 'Only scheduled calls get an invite' }, 400)

    const { data: cand } = await admin.from('candidates')
      .select('first_name,last_name,email').eq('id', ev.candidate_id).maybeSingle()
    if (!cand?.email) return json({ error: 'This prospect has no email address' }, 400)

    const start = new Date(ev.starts_at)
    const end = new Date(start.getTime() + (ev.duration_minutes || 30) * 60000)
    const res = await fetch(
      `${GATEWAY}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE}`, 'X-Connection-Api-Key': GCAL, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `${ev.title} — Neuron Garage`,
          description: ev.notes ?? '',
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          attendees: [{ email: cand.email, displayName: `${cand.first_name ?? ''} ${cand.last_name ?? ''}`.trim() }],
          conferenceData: { createRequest: { requestId: ev.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
        }),
      },
    )
    const text = await res.text()
    if (!res.ok) {
      console.error(`Google event create failed [${res.status}]: ${text}`)
      return json({ error: 'Google Calendar request failed', status: res.status, details: text }, 502)
    }
    const g = JSON.parse(text)
    const meet = g.hangoutLink ?? g.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri ?? null
    await admin.from('candidate_events').update({ google_event_id: g.id, meet_url: meet }).eq('id', ev.id)
    return json({ google_event_id: g.id, meet_url: meet })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
