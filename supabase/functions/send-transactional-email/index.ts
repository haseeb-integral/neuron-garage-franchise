import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

// Configuration baked in at scaffold time — do NOT change these manually.
// To update, re-run the email domain setup flow.
const SITE_NAME = "NG Franchise Recruiting"
// SENDER_DOMAIN is the verified sender subdomain FQDN (e.g., "notify.example.com").
// It MUST match the subdomain delegated to Lovable's nameservers — never the root domain.
// The email API looks up this exact domain; a mismatch causes "No email domain record found".
const SENDER_DOMAIN = "notify.neurongaragefranchise.com"
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// When display_from_root is enabled, this can be the root domain for cleaner branding,
// even though actual sending uses the subdomain above.
const FROM_DOMAIN = "neurongaragefranchise.com"

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// The gateway alone does not distinguish staff, prospects, or the anon key.
// Portal notices additionally require the server credential and a linked prospect.

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Parse request body
  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let messageId: string
  let noticeDispatch: unknown
  let fddRequest: unknown
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    noticeDispatch = body.noticeDispatch
    fddRequest = body.fddRequest
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 1. Look up template from registry (early — needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Resolve effective recipient: template-level `to` takes precedence over
  // the caller-provided recipientEmail. This allows notification templates
  // to always send to a fixed address (e.g., site owner from env var).
  let effectiveRecipient = template.to || recipientEmail

  if (!effectiveRecipient && templateName !== 'fdd-delivery') {
    return new Response(
      JSON.stringify({
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let fddSendId: string | null = null
  if (templateName === 'fdd-delivery') {
    const input = z.object({ candidateId: z.string().uuid(), sendId: z.string().uuid() }).strict().safeParse(fddRequest)
    const auth = req.headers.get('Authorization') ?? ''
    const { data: caller, error: authError } = await supabase.auth.getUser(auth.replace(/^Bearer /, ''))
    if (authError || !caller.user) return new Response(JSON.stringify({ error: 'Please sign in again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: staff, error: staffError } = await supabase.rpc('is_staff', { _user_id: caller.user.id })
    if (staffError || !staff) return new Response(JSON.stringify({ error: 'Staff only.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!input.success) return new Response(JSON.stringify({ error: 'Invalid FDD request.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: existing } = await supabase.from('fdd_email_sends').select('candidate_id,status').eq('id', input.data.sendId).maybeSingle()
    if (existing) return new Response(JSON.stringify(existing.candidate_id === input.data.candidateId ? { success: existing.status === 'sent' || existing.status === 'queued', status: existing.status } : { error: 'Request does not match.' }), { status: existing.candidate_id === input.data.candidateId ? 200 : 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: link } = await supabase.from('candidate_portal_users').select('user_id').eq('candidate_id', input.data.candidateId).maybeSingle()
    const { data: candidate } = await supabase.from('candidates').select('first_name,email').eq('id', input.data.candidateId).maybeSingle()
    if (!link || !candidate) return new Response(JSON.stringify({ error: 'Invite this prospect to the portal first.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: account } = await supabase.auth.admin.getUserById(link.user_id)
    const { data: targetStaff, error: targetError } = await supabase.rpc('is_staff', { _user_id: link.user_id })
    const targetEmail = account.user?.email
    if (targetError || targetStaff || !targetEmail || targetEmail.toLowerCase() !== candidate.email?.toLowerCase()) return new Response(JSON.stringify({ error: 'The prospect email and portal email must match before sending.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: latest } = await supabase.rpc('portal_latest_fdd_id')
    const { data: file } = await supabase.from('portal_step_files').select('id,file_name,bucket_path,fdd_issuance_date,file_sha256').eq('id', latest ?? '').maybeSingle()
    if (!file?.fdd_issuance_date || !file.file_sha256) return new Response(JSON.stringify({ error: 'Upload an FDD with its issuance date first.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: signed, error: downloadError } = await supabase.storage.from('portal_files').createSignedUrl(file.bucket_path, 7 * 86400, { download: file.file_name })
    if (downloadError || !signed) return new Response(JSON.stringify({ error: 'Could not prepare the FDD link.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    fddSendId = input.data.sendId
    messageId = fddSendId
    idempotencyKey = `fdd-delivery-${fddSendId}`
    effectiveRecipient = targetEmail
    templateData = { firstName: candidate.first_name, fileName: file.file_name, issuanceDate: new Date(file.fdd_issuance_date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }), downloadUrl: signed.signedUrl }
    const { error: saveError } = await supabase.from('fdd_email_sends').insert({ id: fddSendId, candidate_id: input.data.candidateId, fdd_file_id: file.id, recipient_email: targetEmail, actor_id: caller.user.id, actor_email: caller.user.email, file_name: file.file_name, issuance_date: file.fdd_issuance_date, file_sha256: file.file_sha256 })
    if (saveError) return new Response(JSON.stringify({ error: 'Could not save the FDD send request. Please try again.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (templateName.startsWith('portal-')) {
    const dispatchInput = z.object({ id: z.string().uuid(), token: z.string().uuid() }).strict().safeParse(noticeDispatch)
    if (!dispatchInput.success) {
      return new Response(JSON.stringify({ error: 'Server notice only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: dispatch, error: dispatchErr } = await supabase.from('portal_notice_dispatches')
      .select('candidate_id').eq('id', dispatchInput.data.id).eq('dispatch_token', dispatchInput.data.token).maybeSingle()
    if (dispatchErr || !dispatch) return new Response(JSON.stringify({ error: 'Invalid server dispatch' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    const NoticeData = z.object({
      candidateId: z.string().uuid(), firstName: z.string().max(255),
      stepTitle: z.string().max(255).optional(), callTitle: z.string().max(255).optional(),
      dateTime: z.string().max(255).optional(), hostName: z.string().max(255).nullable().optional(),
      duration: z.number().int().positive().max(480).optional(),
      meetUrl: z.string().url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'meet.google.com' && !url.username && !url.password }).optional(),
    }).strict()
    const parsed = NoticeData.safeParse(templateData)
    if (!parsed.success || parsed.data.candidateId !== dispatch.candidate_id || !z.string().email().safeParse(effectiveRecipient).success || !idempotencyKey.startsWith('portal-')) {
      return new Response(JSON.stringify({ error: 'Invalid notice data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: link, error: linkError } = await supabase.from('candidate_portal_users')
      .select('user_id').eq('candidate_id', parsed.data.candidateId).maybeSingle()
    if (linkError) return new Response(JSON.stringify({ error: 'Could not verify prospect' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    if (!link) return new Response(JSON.stringify({ success: false, reason: 'no_portal_login' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    const { data: account, error: accountError } = await supabase.auth.admin.getUserById(link.user_id)
    const { data: targetStaff, error: staffError } = await supabase.rpc('is_staff', { _user_id: link.user_id })
    if (accountError || staffError) return new Response(JSON.stringify({ error: 'Could not verify recipient' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    if (targetStaff || account.user?.email?.toLowerCase() !== effectiveRecipient.toLowerCase()) {
      return new Response(JSON.stringify({ success: false, reason: 'recipient_not_prospect' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { candidateId: _candidateId, ...publicData } = parsed.data
    templateData = publicData
  }

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed — refusing to send', {
      code: suppressionError.code,
      message: suppressionError.message,
      recipient_redacted: redactEmail(effectiveRecipient),
    })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', { templateName, recipient_redacted: redactEmail(effectiveRecipient) })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      code: tokenLookupError.code,
      message: tokenLookupError.message,
      email_redacted: redactEmail(normalizedEmail),
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token — upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        code: tokenError.code,
        message: tokenError.message,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        code: reReadError?.code,
        message: reReadError?.message,
        email_redacted: redactEmail(normalizedEmail),
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used — email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email_redacted: redactEmail(normalizedEmail),
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Render React Email template to HTML and plain text
  const html = await renderAsync(
    React.createElement(template.component, templateData)
  )
  const plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true }
  )

  // Resolve subject — supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 5. Enqueue the pre-rendered email for async processing by the dispatcher.
  // The dispatcher (process-email-queue) handles sending, retries, and rate-limit backoff.

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const payload = {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    }
  const { error: enqueueError } = fddSendId
    ? await supabase.rpc('enqueue_fdd_email', { _send_id: fddSendId, _payload: payload })
    : await supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', payload })

  if (enqueueError) {
    console.error('Failed to enqueue email', {
      code: enqueueError.code,
      message: enqueueError.message,
      templateName,
      recipient_redacted: redactEmail(effectiveRecipient),
    })

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })

    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Transactional email enqueued', { templateName, recipient_redacted: redactEmail(effectiveRecipient) })

  return new Response(
    JSON.stringify({ success: true, queued: true, messageId }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
