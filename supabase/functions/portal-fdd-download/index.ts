import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** Prospect-only. Logs an FDD download (version, time, IP, browser) and returns a short-lived link. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const URL_ = Deno.env.get('SUPABASE_URL')!
  const ANON = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } })
  const { data: claims, error } = await userClient.auth.getClaims(auth.slice(7))
  const uid = claims?.claims?.sub as string | undefined
  const email = (claims?.claims?.email as string | undefined) ?? null
  if (error || !uid) return json({ error: 'Invalid session' }, 401)

  const admin = createClient(URL_, SERVICE)
  const { data: candId } = await admin.rpc('portal_candidate_id', { _user_id: uid })
  if (!candId) return json({ error: 'Prospects only' }, 403)
  const { data: step } = await admin.rpc('portal_current_step', { _user_id: uid })
  if (!step || step < 2) return json({ error: 'The FDD unlocks at Step 2.' }, 403)
  const { data: fddId } = await admin.rpc('portal_latest_fdd_id')
  if (!fddId) return json({ error: 'No FDD is available yet.' }, 404)
  const { data: f } = await admin.from('portal_step_files').select('id, bucket_path, file_name, fdd_issuance_date, file_sha256')
    .eq('id', fddId).maybeSingle()
  if (!f) return json({ error: 'No FDD is available yet.' }, 404)

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null
  // Make sure "made available" exists before the first download.
  const { data: avail } = await admin.from('fdd_delivery_events').select('id')
    .eq('candidate_id', candId).eq('fdd_file_id', f.id).eq('event', 'made_available').maybeSingle()
  if (!avail) {
    await admin.from('fdd_delivery_events').insert({ candidate_id: candId, fdd_file_id: f.id, event: 'made_available', actor_id: uid, actor_email: email })
  }
  const { error: logErr } = await admin.from('fdd_delivery_events').insert({
    candidate_id: candId, fdd_file_id: f.id, event: 'downloaded', actor_id: uid, actor_email: email, ip,
    user_agent: req.headers.get('user-agent'),
    meta: { file_name: f.file_name, issuance_date: f.fdd_issuance_date, file_sha256: f.file_sha256 },
  })
  if (logErr) return json({ error: 'Could not prepare the download. Please try again.' }, 500)

  const { data: signed, error: sErr } = await admin.storage.from('portal_files').createSignedUrl(f.bucket_path, 120, { download: f.file_name })
  if (sErr || !signed) return json({ error: 'Could not prepare the download. Please try again.' }, 500)
  return json({ url: signed.signedUrl })
})
