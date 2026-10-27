import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({
  form_key: z.string().min(1).max(60),
  signer_name: z.string().trim().min(3).max(200),
  signed_text: z.string().min(20).max(20000),
  form_title: z.string().min(1).max(200),
  step_num: z.number().int().min(1).max(5),
  item_key: z.string().min(1).max(60),
  item_label: z.string().min(1).max(300),
  first_key: z.string().min(1).max(60),
  last_key: z.string().min(1).max(60),
})

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Prospect-only. Signs and locks the caller's own form, with an audit trail. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const URL_ = Deno.env.get('SUPABASE_URL')!
  const ANON = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } })
  const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7))
  const uid = claims?.claims?.sub as string | undefined
  const email = (claims?.claims?.email as string | undefined) ?? null
  if (cErr || !uid) return json({ error: 'Invalid session' }, 401)

  let p
  try { p = Body.safeParse(await req.json()) } catch { return json({ error: 'Bad request' }, 400) }
  if (!p.success) return json({ error: 'Bad request' }, 400)
  const b = p.data

  const admin = createClient(URL_, SERVICE)
  const { data: candId } = await admin.rpc('portal_candidate_id', { _user_id: uid })
  if (!candId) return json({ error: 'Prospects only' }, 403)

  const { data: form } = await admin.from('candidate_portal_forms')
    .select('id, status, answers, form_version').eq('candidate_id', candId).eq('form_key', b.form_key).maybeSingle()
  if (!form) return json({ error: 'Form not found. Please save your answers first.' }, 404)
  if (form.status === 'submitted') return json({ error: 'This form was already submitted.' }, 409)

  const a = (form.answers ?? {}) as Record<string, unknown>
  const f = norm(String(a[b.first_key] ?? '')), l = norm(String(a[b.last_key] ?? '')), t = norm(b.signer_name)
  if (!f || !l || !t.startsWith(f) || !t.endsWith(l)) {
    return json({ error: 'Your typed name must match the first and last name on the form.' }, 400)
  }

  const now = new Date().toISOString()
  const snapshot = JSON.stringify(a)
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null
  const { error: sErr } = await admin.from('candidate_portal_signatures').insert({
    form_id: form.id, candidate_id: candId, form_key: b.form_key, form_version: form.form_version,
    signer_name: b.signer_name, signed_text: b.signed_text, answers_snapshot: a,
    answers_sha256: await sha256(snapshot + '\n' + b.signed_text + '\n' + b.signer_name + '\n' + now),
    signed_at: now, user_id: uid, user_email: email, ip, user_agent: req.headers.get('user-agent'),
  })
  if (sErr) return json({ error: 'Could not save your signature. Please try again.' }, 500)

  await admin.from('candidate_portal_forms').update({ status: 'submitted', submitted_at: now, progress: 100 }).eq('id', form.id)

  // Tick the matching checklist item (its trigger logs the Activity line too).
  const { data: tick } = await admin.from('candidate_portal_checklist').select('id')
    .eq('candidate_id', candId).eq('step_num', b.step_num).eq('item_key', b.item_key).maybeSingle()
  if (!tick) {
    await admin.from('candidate_portal_checklist').insert({
      candidate_id: candId, step_num: b.step_num, item_key: b.item_key, item_label: b.item_label, done_by: uid,
    })
  }
  await admin.from('candidate_activities').insert({
    candidate_id: candId, type: 'note', content: `Prospect signed and submitted: ${b.form_title}`,
    metadata: { source: 'portal', form_key: b.form_key }, actor_email: email,
  })
  const { data: cand } = await admin.from('candidates').select('first_name, last_name').eq('id', candId).maybeSingle()
  const who = cand ? `${cand.first_name} ${cand.last_name}`.trim() : 'A prospect'
  const { data: staff } = await admin.from('user_roles').select('user_id')
  const ids = [...new Set((staff ?? []).map((r) => r.user_id))]
  if (ids.length) {
    await admin.from('notifications').insert(ids.map((user_id) => ({
      user_id, kind: 'prospect_form', title: `${who} submitted a form`, message: b.form_title, link: '/candidate-pipeline',
    })))
  }
  return json({ status: 'submitted', signed_at: now })
})
