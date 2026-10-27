import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Row = z.object({ label: z.string().max(500), value: z.string().max(10000) })
const Body = z.object({
  form_key: z.string().min(1).max(60),
  signer_name: z.string().trim().min(3).max(200),
  signed_text: z.string().min(20).max(20000),
  pre_text: z.string().max(5000).optional(),
  form_title: z.string().min(1).max(200),
  step_num: z.number().int().min(1).max(5),
  item_key: z.string().min(1).max(60),
  item_label: z.string().min(1).max(300),
  first_key: z.string().min(1).max(60),
  last_key: z.string().min(1).max(60),
  esign_consent_text: z.string().max(5000).optional(),
  pdf_category: z.enum(['background_check', 'general']),
  pdf_item_key: z.string().regex(/^[a-z0-9_]{1,40}$/),
  fdd_issuance_date: z.string().min(4).max(40).nullable().optional(),
  paper_order: z.boolean().optional(),
  no_signature: z.boolean().optional(),
  sections: z.array(z.object({ title: z.string().max(300), rows: z.array(Row).max(200) })).max(40),
})

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
async function sha256(data: string | Uint8Array) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
// Standard PDF fonts only cover basic Latin characters.
const clean = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\r/g, '').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '?')

async function buildPdf(o: {
  title: string; sections: { title: string; rows: { label: string; value: string }[] }[]
  preText?: string; signedText: string; signer: string; signedAt: string
  email: string | null; ip: string | null; ua: string | null; consentAt: string | null; answersHash: string
  paperOrder?: boolean; noSignature?: boolean
}) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const W = 612, H = 792, M = 54, maxW = W - M * 2
  let page = doc.addPage([W, H]); let y = H - M
  const newPage = () => { page = doc.addPage([W, H]); y = H - M }
  const wrap = (text: string, f: typeof font, size: number) => {
    const out: string[] = []
    for (const para of clean(text).split('\n')) {
      let line = ''
      for (const word of para.split(/\s+/)) {
        const t = line ? `${line} ${word}` : word
        if (f.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = word } else line = t
      }
      out.push(line)
    }
    return out
  }
  const write = (text: string, f = font, size = 10, color = rgb(0.1, 0.1, 0.15), gap = 3) => {
    for (const l of wrap(text, f, size)) {
      if (y < M + size) newPage()
      page.drawText(l, { x: M, y: y - size, size, font: f, color }); y -= size + gap
    }
  }
  const navy = rgb(0.07, 0.19, 0.33)
  write('Neuron Garage', bold, 10, navy)
  write(o.title.toUpperCase(), bold, 16, navy); y -= 8
  // Paper order (Item 23 receipt): the full form text comes first, like the paper form; answers follow.
  if (o.paperOrder) {
    if (o.preText) { write(o.preText, font, 9.5, rgb(0.25, 0.25, 0.3)); y -= 6 }
    write(o.signedText, font, 10); y -= 8
  }
  for (const s of o.sections) {
    y -= 6; write(s.title, bold, 12, navy); y -= 2
    for (const r of s.rows) { write(r.label, bold, 9, rgb(0.35, 0.38, 0.45), 1); write(r.value || '-', font, 10); y -= 4 }
  }
  y -= 10
  write(o.noSignature ? 'SUBMITTED' : 'SIGNATURE', bold, 12, navy); y -= 2
  if (!o.paperOrder) {
    if (o.preText) { write(o.preText, font, 9.5, rgb(0.25, 0.25, 0.3)); y -= 6 }
    write(o.signedText, font, 10); y -= 8
  }
  write(`${o.noSignature ? 'Submitted by' : 'Signature'}: ${o.signer}`, italic, 14); write(`Date: ${new Date(o.signedAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}`, font, 10)
  if (!o.noSignature) write('Signed electronically. Typing a full name counts as a signature.', font, 8.5, rgb(0.4, 0.4, 0.45))
  y -= 14
  if (y < M + 130) newPage()
  page.drawRectangle({ x: M - 6, y: y - 118, width: maxW + 12, height: 124, borderColor: navy, borderWidth: 1 })
  y -= 4
  write('AUDIT TRAIL', bold, 9, navy)
  write(`${o.noSignature ? 'Submitted by' : 'Signer'}: ${o.signer} (${o.email ?? 'unknown email'}), signed in to the Neuron Garage owner portal`, font, 8.5)
  if (o.consentAt) write(`Agreed to electronic records and signatures: ${o.consentAt} (UTC)`, font, 8.5)
  write(`${o.noSignature ? 'Submitted at' : 'Signed at'}: ${o.signedAt} (UTC)`, font, 8.5)
  write(`IP address: ${o.ip ?? 'not available'}`, font, 8.5)
  write(`Browser: ${(o.ua ?? 'not available').slice(0, 180)}`, font, 8.5)
  write(`Answers fingerprint (SHA-256): ${o.answersHash}`, font, 8.5)
  write('The PDF file fingerprint is stored separately by Neuron Garage.', font, 8.5)
  return await doc.save()
}

/** Prospect-only. Signs and locks the caller's own form, makes a signed PDF, and records an audit trail. */
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
  const consentAt = typeof a.__esign_consent_at === 'string' ? a.__esign_consent_at : null
  if (b.esign_consent_text && !consentAt) return json({ error: 'Please agree to electronic records and signatures first.' }, 400)

  // Item 23 receipt: name the exact FDD version this prospect received (never the newest).
  let item23Fdd: { id: string; date: string | null; receivedAt: string | null } | null = null
  if (b.form_key === 'item23') {
    const { data: comp } = await admin.from('candidate_compliance').select('fdd_file_id, fdd_received_at').eq('candidate_id', candId).maybeSingle()
    let fddId: string | null = (comp?.fdd_file_id as string | null) ?? null
    if (!fddId) {
      const { data: ev } = await admin.from('fdd_delivery_events').select('fdd_file_id')
        .eq('candidate_id', candId).not('fdd_file_id', 'is', null).order('at', { ascending: true }).limit(1).maybeSingle()
      fddId = (ev?.fdd_file_id as string | null) ?? null
    }
    if (!fddId) return json({ error: "We can't confirm which FDD version you received yet. Please contact Skyler Bossen at 512-593-2750." }, 409)
    const { data: f } = await admin.from('portal_step_files').select('fdd_issuance_date').eq('id', fddId).maybeSingle()
    item23Fdd = { id: fddId, date: (f?.fdd_issuance_date as string | null) ?? null, receivedAt: (comp?.fdd_received_at as string | null) ?? null }
    if (b.fdd_issuance_date && b.fdd_issuance_date !== item23Fdd.date) {
      return json({ error: 'The FDD version on file has changed. Please refresh this page and review your receipt again.' }, 409)
    }
  }

  const now = new Date().toISOString()
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null
  const ua = req.headers.get('user-agent')
  const answersHash = await sha256(JSON.stringify(a) + '\n' + b.signed_text + '\n' + b.signer_name + '\n' + now)

  // Signed PDF
  let pdfPath: string | null = null, pdfHash: string | null = null
  try {
    const bytes = await buildPdf({
      title: b.form_title, sections: b.sections, preText: b.pre_text, signedText: b.signed_text,
      signer: b.signer_name, signedAt: now, email, ip, ua, consentAt, answersHash,
      paperOrder: b.paper_order === true, noSignature: b.no_signature === true,
    })
    pdfHash = await sha256(bytes)
    const safeTitle = b.form_title.replace(/[^A-Za-z0-9]+/g, '-')
    pdfPath = `candidates/${candId}/portal/forms/${b.pdf_category}/${b.pdf_item_key}/${crypto.randomUUID()}-Signed-${safeTitle}.pdf`
    const up = await admin.storage.from('candidate_documents').upload(pdfPath, bytes, { contentType: 'application/pdf' })
    if (up.error) throw up.error
  } catch (e) {
    console.error('pdf failed', e)
    return json({ error: 'Could not create your signed copy. Nothing was submitted. Please try again.' }, 500)
  }

  const { error: sErr } = await admin.from('candidate_portal_signatures').insert({
    form_id: form.id, candidate_id: candId, form_key: b.form_key, form_version: form.form_version,
    signer_name: b.signer_name, signed_text: (b.pre_text ? b.pre_text + '\n\n' : '') + b.signed_text,
    esign_consent_text: b.esign_consent_text ?? null, esign_consent_at: consentAt,
    answers_snapshot: a, answers_sha256: answersHash,
    signed_at: now, user_id: uid, user_email: email, ip, user_agent: ua, pdf_path: pdfPath, pdf_sha256: pdfHash,
  })
  if (sErr) return json({ error: 'Could not save your signature. Please try again.' }, 500)

  await admin.from('candidate_portal_forms').update({ status: 'submitted', submitted_at: now, progress: 100 }).eq('id', form.id)

  // File the PDF in Documents (its trigger logs "Prospect uploaded" and notifies staff).
  await admin.from('candidate_files').insert({
    candidate_id: candId, bucket_path: pdfPath, file_name: `Signed - ${b.form_title}.pdf`, mime_type: 'application/pdf',
    category: b.pdf_category, uploaded_by: uid, uploaded_by_email: email, uploaded_by_prospect: true, portal_step: b.step_num,
  })

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

  // Item 23: the signing date counts as the FDD received date (starts the 16-day lock), and the event goes in the permanent log.
  if (b.form_key === 'item23' && item23Fdd) {
    if (!item23Fdd.receivedAt) {
      await admin.from('candidate_compliance').upsert({ candidate_id: candId, fdd_received_at: now }, { onConflict: 'candidate_id' })
    }
    await admin.from('fdd_delivery_events').insert({
      candidate_id: candId, fdd_file_id: item23Fdd.id, event: 'receipt_signed', actor_id: uid, actor_email: email, ip, user_agent: ua,
      meta: { signer_name: b.signer_name, form_version: form.form_version, pdf_path: pdfPath, pdf_sha256: pdfHash, fdd_issuance_date: item23Fdd.date },
    })
  }
  return json({ status: 'submitted', signed_at: now, pdf_path: pdfPath })
})
