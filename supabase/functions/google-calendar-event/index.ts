import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
import { CalendarProviderError, syncCalendarCall } from './lifecycle.ts'
import { savedResultMatches } from './savedResult.ts'

// Shared "Shared NG Franchise Development" calendar (owner: sam.reed@neurongarage.com).
const CALENDAR_ID = 'c_2657dd51a7eb8df6bb86775a5b4aa780644ed97abb01fd24ca65ada54b09140a@group.calendar.google.com'
const GATEWAY = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({ event_id: z.string().uuid(), action: z.enum(['sync', 'delete']).default('sync') }).strict()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const URL_ = Deno.env.get('SUPABASE_URL')
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!URL_ || !ANON || !SERVICE) return json({ error: 'Server configuration error' }, 500)
    const LOVABLE = Deno.env.get('LOVABLE_API_KEY')
    const GCAL = Deno.env.get('GOOGLE_CALENDAR_API_KEY')
    if (!LOVABLE || !GCAL) return json({ error: 'Google Calendar is not connected' }, 500)

    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)
    const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } })
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7))
    if (cErr || !claims?.claims?.sub) return json({ error: 'Not signed in' }, 401)
    const admin = createClient(URL_, SERVICE)
    const { data: staff, error: roleError } = await admin.rpc('is_staff', { _user_id: claims.claims.sub })
    if (roleError || !staff) return json({ error: 'Staff only' }, 403)

    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)

    const { data: ev, error: eErr } = await admin.from('candidate_events')
      .select('id,candidate_id,title,notes,starts_at,duration_minutes,status,google_event_id,meet_url,google_sync_revision')
      .eq('id', parsed.data.event_id).maybeSingle()
    if (eErr || !ev) return json({ error: 'Event not found' }, 404)
    const { data: cand } = await admin.from('candidates')
      .select('first_name,last_name,email').eq('id', ev.candidate_id).maybeSingle()
    const result = await syncCalendarCall(ev, cand?.email ? {
      email: cand.email, displayName: `${cand.first_name ?? ''} ${cand.last_name ?? ''}`.trim(),
    } : null, (method, path, body) => fetch(
      `${GATEWAY}/calendars/${encodeURIComponent(CALENDAR_ID)}${path}`, {
        method,
        headers: { Authorization: `Bearer ${LOVABLE}`, 'X-Connection-Api-Key': GCAL, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }), parsed.data.action === 'delete')
    const { data: saved, error: saveError } = await admin.from('candidate_events').update({
      google_event_id: result.google_event_id, meet_url: result.meet_url,
      google_sync_pending: ev.status === 'scheduled' && !result.meet_url,
      ...(result.meet_url ? { google_notice_before: null } : {}),
    }).eq('id', ev.id).eq('google_sync_revision', ev.google_sync_revision).select('id').maybeSingle()
    if (saveError) {
      console.error('Google call result save failed', saveError.code)
      return json({ error: 'Google changed the invite, but the app could not save the result. Please retry this call.' }, 500)
    }
    if (!saved) {
      const { data: live, error: readError } = await admin.from('candidate_events')
        .select('candidate_id,title,notes,starts_at,duration_minutes,status,google_event_id,meet_url,google_sync_pending')
        .eq('id', ev.id).maybeSingle()
      if (readError) return json({ error: 'Could not confirm the saved call. Please refresh and try again.' }, 500)
      if (savedResultMatches(ev, live, result, parsed.data.action === 'delete')) return json({ ...result, operation: 'unchanged' })
      return json({ conflict: true, message: 'This call changed while Google was updating. Reopen the call to review its latest details, then save it again.' })
    }
    return json(result)
  } catch (e) {
    console.error(e)
    if (e instanceof CalendarProviderError) return json({ error: 'Google Calendar request failed', status: e.status, details: e.details }, e.status)
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
