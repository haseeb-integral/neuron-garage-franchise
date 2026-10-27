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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return Reply({})
  if (req.method !== 'POST') return Reply({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return Reply({ error: 'Server configuration error' }, 500)
  if (req.headers.get('Authorization') !== `Bearer ${key}`) return Reply({ error: 'Server event only' }, 403)
  let parsed
  try { parsed = Body.safeParse(await req.json()) } catch { return Reply({ error: 'Invalid JSON' }, 400) }
  if (!parsed.success) return Reply({ error: 'Invalid event' }, 400)
  const event = parsed.data
  const admin = createClient(url, key)
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
    body: { templateName, idempotencyKey, recipientEmail: account.user.email, templateData },
  })
  if (error) return Reply({ error: 'Notice enqueue failed' }, 502)
  return Reply(data)
})