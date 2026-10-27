import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
import { opensStep, callNotice, callTemplateData, NOTICE_STEP_TITLES } from '../_shared/portalNoticeRules.ts'

const Reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})
const Event = z.object({ id: z.string().uuid(), candidate_id: z.string().uuid(),
  status: z.enum(['scheduled','completed','canceled']), starts_at: z.string().datetime({ offset: true }),
  title: z.string().max(255), duration_minutes: z.number().int().positive().max(480),
  owner_email: z.string().nullable(), event_type: z.enum(['call','follow_up']) }).strict()
const Body = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('stage'), candidate_id: z.string().uuid(), before: z.string(), after: z.string() }).strict(),
  z.object({ kind: z.literal('call'), before: Event.nullable(), after: Event }).strict(),
])
const Dispatch = z.object({ dispatch_id: z.string().uuid(), dispatch_token: z.string().uuid() }).strict()

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return Reply({})
  if (req.method !== 'POST') return Reply({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return Reply({ error: 'Server configuration error' }, 500)
  const admin = createClient(url, key)
  let request
  try { request = Dispatch.safeParse(await req.json()) } catch { return Reply({ error: 'Invalid JSON' }, 400) }
  if (!request.success) return Reply({ error: 'Invalid dispatch' }, 400)
  // Each database-created event carries its own unguessable server-only token.
  // The caller cannot choose recipients or change the saved event payload.
  const { data: dispatch, error: dispatchErr } = await admin.from('portal_notice_dispatches')
    .select('payload,delivered_at').eq('id', request.data.dispatch_id)
    .eq('dispatch_token', request.data.dispatch_token).maybeSingle()
  if (dispatchErr) return Reply({ error: 'Dispatch lookup failed' }, 500)
  if (!dispatch) return Reply({ error: 'Invalid dispatch token' }, 403)
  if (dispatch.delivered_at) return Reply({ skipped: 'already_processed' })
  const parsed = Body.safeParse(dispatch.payload)
  if (!parsed.success) return Reply({ error: 'Invalid saved event' }, 400)
  const event = parsed.data
  const cid = event.kind === 'stage' ? event.candidate_id : event.after.candidate_id
  const { data: link, error: linkErr } = await admin.from('candidate_portal_users').select('user_id').eq('candidate_id', cid).maybeSingle()
  if (linkErr) return Reply({ error: 'Prospect lookup failed' }, 500)
  if (!link) return Reply({ skipped: 'no_portal_login' })
  const { data: cand, error: candErr } = await admin.from('candidates').select('first_name').eq('id', cid).single()
  const { data: account, error: accountErr } = await admin.auth.admin.getUserById(link.user_id)
  const { data: staff, error: staffErr } = await admin.rpc('is_staff', { _user_id: link.user_id })
  if (candErr || accountErr || staffErr) return Reply({ error: 'Recipient lookup failed' }, 500)
  if (staff || !account.user?.email) return Reply({ skipped: 'not_a_prospect' })
  let templateName: string, idempotencyKey: string, templateData: Record<string, unknown>
  if (event.kind === 'stage') {
    const step = opensStep(event.before, event.after)
    if (!step) return Reply({ skipped: 'no_new_step' })
    templateName = 'portal-step-opened'
    idempotencyKey = `portal-step-${cid}-${step}`
    templateData = { candidateId: cid, firstName: cand.first_name ?? '', stepTitle: NOTICE_STEP_TITLES[step] }
  } else {
    const notice = callNotice(event.before, event.after)
    if (!notice) return Reply({ skipped: 'no_call_change' })
    let hostName: string | undefined
    if (event.after.owner_email) {
      const { data: host, error } = await admin.from('profiles').select('full_name').ilike('email', event.after.owner_email).maybeSingle()
      if (error) return Reply({ error: 'Host lookup failed' }, 500)
      hostName = host?.full_name || undefined
    }
    templateName = notice
    idempotencyKey = `portal-${notice}-${event.after.id}-${new Date(event.after.starts_at).toISOString()}`
    templateData = { candidateId: cid, ...callTemplateData(event.after, cand.first_name ?? '', hostName) }
  }
  const { data, error } = await admin.functions.invoke('send-transactional-email', {
    body: { templateName, idempotencyKey, recipientEmail: account.user.email, templateData,
      noticeDispatch: { id: request.data.dispatch_id, token: request.data.dispatch_token } },
  })
  if (error) {
    const response = error.context instanceof Response ? error.context : null
    // The send endpoint returns generic errors only; no account data or tokens.
    const detail = response ? await response.json().catch(() => ({})) : {}
    console.error('Notice enqueue failed', { status: response?.status, error: detail.error ?? error.message })
    return Reply({ error: 'Notice enqueue failed' }, 502)
  }
  await admin.from('portal_notice_dispatches').update({ delivered_at: new Date().toISOString() })
    .eq('id', request.data.dispatch_id)
  return Reply(data)
})