import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { z } from 'npm:zod@3'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({ candidate_id: z.string().uuid() })

const clean = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\r/g, '').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '?')

const EVENT_LABELS: Record<string, string> = {
  made_available: 'Made available in the portal',
  downloaded: 'Downloaded by prospect',
  emailed: 'Emailed by staff',
  receipt_signed: 'Item 23 receipt signed',
}

/** Staff-only. Builds a regulator-ready PDF: the FDD delivery log, the FDD fingerprint, and the signed Item 23 receipt. */
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
  if (cErr || !uid) return json({ error: 'Invalid session' }, 401)

  let p
  try { p = Body.safeParse(await req.json()) } catch { return json({ error: 'Bad request' }, 400) }
  if (!p.success) return json({ error: 'Bad request' }, 400)
  const candidateId = p.data.candidate_id

  const admin = createClient(URL_, SERVICE)
  const { data: isStaff } = await admin.rpc('is_staff', { _user_id: uid })
  if (!isStaff) return json({ error: 'Staff only' }, 403)

  const [{ data: cand }, { data: comp }, { data: events }, { data: sigs }] = await Promise.all([
    admin.from('candidates').select('first_name, last_name, email').eq('id', candidateId).maybeSingle(),
    admin.from('candidate_compliance').select('fdd_sent_at, fdd_received_at, fdd_file_id').eq('candidate_id', candidateId).maybeSingle(),
    admin.from('fdd_delivery_events').select('event, at, actor_email, ip, user_agent, fdd_file_id, meta')
      .eq('candidate_id', candidateId).order('at', { ascending: true }),
    admin.from('candidate_portal_signatures').select('*').eq('candidate_id', candidateId).eq('form_key', 'item23')
      .order('signed_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!cand) return json({ error: 'Candidate not found' }, 404)

  let fdd: { file_name: string; fdd_issuance_date: string | null; file_sha256: string | null } | null = null
  const fddId = comp?.fdd_file_id ?? events?.find((e) => e.fdd_file_id)?.fdd_file_id ?? null
  if (fddId) {
    const { data } = await admin.from('portal_step_files').select('file_name, fdd_issuance_date, file_sha256').eq('id', fddId).maybeSingle()
    fdd = data ?? null
  }

  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago' }) : '—')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const W = 612, H = 792, M = 54, maxW = W - M * 2
  let page = doc.addPage([W, H]); let y = H - M
  const navy = rgb(0.07, 0.19, 0.33)
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

  write('Neuron Garage', bold, 10, navy)
  write('FDD PROOF PACKET', bold, 16, navy); y -= 4
  write(`Prospect: ${cand.first_name} ${cand.last_name} (${cand.email})`, font, 10)
  write(`Built: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} (Central)`, font, 9, rgb(0.4, 0.4, 0.45))
  y -= 8

  write('FDD VERSION', bold, 12, navy); y -= 2
  if (fdd) {
    write(`File: ${fdd.file_name}`, font, 10)
    write(`Issuance date: ${fdd.fdd_issuance_date ?? 'not recorded'}`, font, 10)
    write(`File fingerprint (SHA-256): ${fdd.file_sha256 ?? 'not recorded'}`, font, 10)
  } else {
    write('Version not recorded — no FDD version is linked to this prospect yet.', font, 10)
  }
  write(`FDD sent by staff: ${day(comp?.fdd_sent_at ?? null)}`, font, 10)
  write(`FDD received (prospect): ${day(comp?.fdd_received_at ?? null)}`, font, 10)
  const earliest = comp?.fdd_sent_at || comp?.fdd_received_at
  if (earliest) {
    const d = new Date(earliest); d.setDate(d.getDate() + 16)
    write(`Earliest signing date (16-day rule): ${d.toLocaleDateString('en-US')}`, font, 10)
  }
  y -= 6

  write('FDD DELIVERY LOG (one line per event, append-only)', bold, 12, navy); y -= 2
  if (!events?.length) write('No delivery events recorded yet.', font, 10)
  for (const e of events ?? []) {
    const v = e.fdd_file_id === fddId ? ' · FDD version on file' : e.fdd_file_id ? ' · another FDD version' : ''
    const at = day(e.at)
    const who = e.actor_email ? ` · ${e.actor_email}` : ''
    const ipUa = e.ip || e.user_agent ? ` · IP ${e.ip ?? 'n/a'}${e.user_agent ? ` · ${String(e.user_agent).slice(0, 120)}` : ''}` : ''
    write(`- ${at} — ${EVENT_LABELS[e.event] ?? e.event}${v}${who}${ipUa}`, font, 9)
  }
  y -= 6

  write('ITEM 23 RECEIPT', bold, 12, navy); y -= 2
  if (sig) {
    write(`Signer: ${sig.signer_name}`, font, 10)
    write(`Signed at: ${day(sig.signed_at)} (Central)`, font, 10)
    write(`Agreed to electronic records and signatures: ${sig.esign_consent_at ? day(sig.esign_consent_at) : 'n/a'} (Central)`, font, 10)
    write(`Signed-in account: ${sig.user_email ?? 'unknown'}`, font, 10)
    write(`IP address: ${sig.ip ?? 'not available'}`, font, 10)
    write(`Browser: ${sig.user_agent ?? 'not available'}`, font, 10)
    write(`Signed PDF fingerprint (SHA-256): ${sig.pdf_sha256 ?? 'n/a'}`, font, 10)
    write(`Answers fingerprint (SHA-256): ${sig.answers_sha256}`, font, 10)
    write(`Signed PDF stored at: ${sig.pdf_path ?? 'n/a'}`, font, 9, rgb(0.4, 0.4, 0.45))
    write('The full signed receipt is attached on the following pages.', font, 9, rgb(0.4, 0.4, 0.45))
  } else {
    write('The Item 23 receipt has not been signed yet.', font, 10)
  }

  if (sig?.pdf_path) {
    try {
      const { data: blob, error } = await admin.storage.from('candidate_documents').download(sig.pdf_path)
      if (error) throw error
      const receipt = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true })
      const pages = await doc.copyPages(receipt, receipt.getPageIndices())
      pages.forEach((pg) => doc.addPage(pg))
    } catch (e) {
      console.error('receipt copy failed', e)
      newPage()
      write('NOTE: the signed receipt PDF could not be attached. It is stored at:', bold, 10)
      write(sig.pdf_path, font, 10)
    }
  }

  const bytes = await doc.save()
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="FDD-proof-packet.pdf"' },
  })
})
