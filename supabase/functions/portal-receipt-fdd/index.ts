import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401)
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } })
  const { data: claims, error } = await client.auth.getClaims(auth.slice(7))
  const uid = claims?.claims?.sub
  if (error || !uid) return json({ error: 'Please sign in again.' }, 401)
  let body
  try { body = z.object({ form_key: z.literal('item23') }).strict().safeParse(await req.json()) } catch { return json({ error: 'Invalid request.' }, 400) }
  if (!body.success) return json({ error: 'Invalid request.' }, 400)
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cid } = await admin.rpc('portal_candidate_id', { _user_id: uid })
  if (!cid) return json({ error: 'Prospects only.' }, 403)
  const { data: step } = await admin.rpc('portal_current_step', { _user_id: uid })
  const { data: sent, error: sentError } = await admin.rpc('fdd_has_been_sent', { _candidate_id: cid })
  if (!step || step < 2 || sentError || !sent) return json({ error: 'Your receipt opens after the team emails your FDD.' }, 403)
  const { data: versions, error: versionError } = await client.rpc('portal_form_fdd_version', { _form_key: 'item23' })
  const id = versions?.[0]?.fdd_file_id
  if (versionError || !id) return json({ error: 'We cannot confirm your FDD version. Please contact the team.' }, 409)
  const { data: f } = await admin.from('portal_step_files').select('bucket_path,file_name,file_sha256').eq('id', id).maybeSingle()
  if (!f?.file_sha256) return json({ error: 'Your full FDD is unavailable. Please contact the team.' }, 409)
  const { data: link, error: linkError } = await admin.storage.from('portal_files').createSignedUrl(f.bucket_path, 120)
  if (linkError || !link) return json({ error: 'Could not open your FDD. Please try again.' }, 500)
  return json({ url: link.signedUrl, file_name: f.file_name, fdd_file_id: id, sha256: f.file_sha256 })
})