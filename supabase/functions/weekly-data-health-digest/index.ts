import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Triggered weekly by pg_cron (or manually for testing).
// Aggregates the last 7 days of db_health_history and dispatches a
// branded data-health-digest email to each fixed recipient.

const RECIPIENTS = [
  { email: 'brett@integraldigital.com', name: 'Brett' },
  { email: 'sam.reed@neurongarage.com', name: 'Sam' },
]

const DOMAIN_LABELS: Record<string, string> = {
  us_cities_scored: 'City Scores',
  us_cities_geo: 'City Geo',
  teacher_prospects: 'Teacher Prospects',
  public_schools: 'Public Schools',
  candidates: 'Candidates',
}

type Status = 'green' | 'yellow' | 'red'

function worseStatus(a: Status, b: Status): Status {
  const rank: Record<Status, number> = { green: 0, yellow: 1, red: 2 }
  return rank[a] >= rank[b] ? a : b
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Pull the last 7 days of snapshots
  const { data: history, error: historyErr } = await supabase
    .from('db_health_history')
    .select('domain, metric, status, value, ts')
    .gte('ts', since)
    .order('ts', { ascending: false })

  if (historyErr) {
    console.error('Failed to load db_health_history', historyErr)
    return new Response(JSON.stringify({ error: 'history_query_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Latest row per domain (for row_count) — these are the table-level entries
  const latestPerDomain = new Map<string, any>()
  const rulesLatest = new Map<string, any>()
  let snapshotCount = 0

  for (const row of history ?? []) {
    if (row.metric === 'row_count' && !latestPerDomain.has(row.domain)) {
      latestPerDomain.set(row.domain, row)
    }
    if (row.domain === 'rules' && !rulesLatest.has(row.metric)) {
      rulesLatest.set(row.metric, row)
    }
    snapshotCount++
  }

  const domains = Array.from(latestPerDomain.values()).map((r) => {
    const count = Number(r?.value?.count ?? 0)
    return {
      domain: r.domain,
      label: DOMAIN_LABELS[r.domain] ?? r.domain,
      rowCount: count,
      status: (r.status as Status) ?? 'green',
      note:
        r.status === 'red'
          ? 'Below minimum expected rows'
          : r.status === 'yellow'
          ? 'Below expected baseline'
          : undefined,
    }
  })

  const rules = Array.from(rulesLatest.entries()).map(([name, r]) => ({
    name,
    status: (r.status as Status) ?? 'green',
    violations: Number(r?.value?.violations ?? 0),
  }))

  // Open incidents
  const { count: openIncidents } = await supabase
    .from('db_health_incidents')
    .select('*', { count: 'exact', head: true })
    .is('closed_at', null)

  // Overall status = worst of all
  let overall: Status = 'green'
  for (const d of domains) overall = worseStatus(overall, d.status)
  for (const r of rules) overall = worseStatus(overall, r.status)

  // Period label, e.g. "Nov 18 – Nov 25, 2026"
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const now = new Date()
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const periodLabel = `${fmt(startDate)} – ${fmt(now)}, ${now.getFullYear()}`
  const generatedAt = now.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  })

  const weekKey = startDate.toISOString().slice(0, 10) // YYYY-MM-DD

  const results: Array<{ email: string; ok: boolean; error?: string }> = []

  for (const recipient of RECIPIENTS) {
    try {
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/send-transactional-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateName: 'data-health-digest',
            recipientEmail: recipient.email,
            idempotencyKey: `data-health-digest-${weekKey}-${recipient.email}`,
            templateData: {
              recipientName: recipient.name,
              periodLabel,
              overallStatus: overall,
              openIncidents: openIncidents ?? 0,
              totalSnapshots: snapshotCount,
              generatedAt,
              domains,
              rules,
            },
          }),
        }
      )
      const body = await resp.text()
      if (!resp.ok) {
        console.error('send-transactional-email failed', {
          email: recipient.email,
          status: resp.status,
          body,
        })
        results.push({ email: recipient.email, ok: false, error: `${resp.status}: ${body}` })
      } else {
        results.push({ email: recipient.email, ok: true })
      }
    } catch (e) {
      console.error('dispatch error', e)
      results.push({
        email: recipient.email,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      periodLabel,
      overall,
      openIncidents: openIncidents ?? 0,
      totalSnapshots: snapshotCount,
      domains: domains.length,
      rules: rules.length,
      results,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
