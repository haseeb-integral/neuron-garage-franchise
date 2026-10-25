import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({
  candidate_id: z.string().uuid(),
  redirect_origin: z.string().url(),
})

/** Staff-only. Invites a candidate to the prospect portal, or re-sends their link. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const URL_ = Deno.env.get('SUPABASE_URL')!
  const ANON = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } })
  const { data: u, error: uErr } = await userClient.auth.getUser()
  if (uErr || !u.user) return json({ error: 'Invalid session' }, 401)

  const admin = createClient(URL_, SERVICE)
  const { data: staff } = await admin.rpc('is_staff', { _user_id: u.user.id })
  if (!staff) return json({ error: 'Staff only' }, 403)

  let parsed
  try { parsed = Body.safeParse(await req.json()) } catch { return json({ error: 'Bad request' }, 400) }
  if (!parsed.success) return json({ error: 'Bad request' }, 400)
  const { candidate_id, redirect_origin } = parsed.data
  const redirectTo = `${new URL(redirect_origin).origin}/reset-password?portal=1`

  const { data: cand, error: cErr } = await admin
    .from('candidates').select('id, email, name').eq('id', candidate_id).maybeSingle()
  if (cErr || !cand) return json({ error: 'Candidate not found' }, 404)
  const email = (cand.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) return json({ error: 'This candidate has no email address.' }, 400)

  const { data: existingLink } = await admin
    .from('candidate_portal_users').select('user_id').eq('candidate_id', candidate_id).maybeSingle()

  // Re-send: account already linked — send a set-password link.
  if (existingLink?.user_id) {
    const anon = createClient(URL_, ANON)
    const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return json({ error: 'Could not send the link. Try again later.' }, 502)
    await admin.from('candidate_portal_users').update({ invited_at: new Date().toISOString(), invited_by: u.user.id })
      .eq('candidate_id', candidate_id)
    return json({ status: 'resent' })
  }

  const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: cand.name ?? null },
  })
  if (invErr || !inv.user) {
    const msg = /already|registered|exists/i.test(invErr?.message ?? '')
      ? 'An account with this email already exists. Use a different email for this candidate.'
      : 'Could not send the invite. Try again later.'
    return json({ error: msg }, 409)
  }

  // Safety: never link a staff account as a prospect.
  const { data: isStaffTarget } = await admin.rpc('is_staff', { _user_id: inv.user.id })
  if (isStaffTarget) return json({ error: 'That email belongs to a staff account.' }, 409)

  const { error: linkErr } = await admin.from('candidate_portal_users').insert({
    user_id: inv.user.id, candidate_id, invited_by: u.user.id,
  })
  if (linkErr) return json({ error: 'Invite sent, but the link could not be saved.' }, 500)

  await admin.from('candidate_activities').insert({
    candidate_id, type: 'note', content: `Invited to the prospect portal (${email})`,
    author: u.user.email ?? 'Staff',
  }).then(() => {}, () => {})

  return json({ status: 'invited' })
})
