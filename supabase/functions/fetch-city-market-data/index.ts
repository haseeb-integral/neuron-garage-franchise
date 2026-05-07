import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

type CompetitorRow = {
  name: string
  type: string | null
  pricing: string | null
  capacity: number | null
  source: string
  source_url: string | null
  raw_data: Record<string, unknown>
  scraped_at: string
}

type SignalRow = {
  signal_key: string
  label: string
  value: string
  delta: string | null
  delta_type: string | null
  source: string
  source_url?: string | null
  raw_data?: Record<string, unknown>
  confidence: number
}

function normalizeActorId(actorId: string) {
  return actorId.includes('/') ? actorId.replace('/', '~') : actorId
}

function competitorText(item: Record<string, unknown>) {
  return `${item.title ?? ''} ${item.name ?? ''} ${item.categoryName ?? ''} ${Array.isArray(item.categories) ? (item.categories as unknown[]).join(' ') : item.categories ?? ''} ${item.description ?? ''}`.toLowerCase()
}

const INCLUDE_KEYWORDS = ['coding','code','robotics','robot','stem','maker','technology','computer','tutoring','math','camp','enrichment','science','kids','children','after school','after-school','learning center']
const EXCLUDE_KEYWORDS = ['sports store','sporting goods','golf','pga','soccer','baseball','basketball','fitness','gym','retail','academy sports','coaching center','apparel']

function isRelevantCompetitor(item: Record<string, unknown>) {
  const text = competitorText(item)
  if (EXCLUDE_KEYWORDS.some((k) => text.includes(k))) return false
  return INCLUDE_KEYWORDS.some((k) => text.includes(k))
}

function inferCompetitorType(item: Record<string, unknown>) {
  const text = competitorText(item)
  if (text.includes('coding') || text.includes('robot') || text.includes('stem')) return 'STEM / Coding Program'
  if (text.includes('math')) return 'Math / STEM Tutoring'
  if (text.includes('camp')) return 'Summer Camp'
  if (text.includes('school') || text.includes('learning center')) return 'School / Enrichment'
  return 'Youth Enrichment'
}

function mapApifyItem(item: Record<string, unknown>, now: string): CompetitorRow | null {
  const name = String(item.title ?? item.name ?? item.placeName ?? '').trim()
  if (!name) return null
  return {
    name,
    type: inferCompetitorType(item),
    pricing: null,
    capacity: null,
    source: 'apify',
    source_url: String(item.url ?? item.placeUrl ?? item.website ?? item.websiteUrl ?? '') || null,
    raw_data: item,
    scraped_at: now,
  }
}

function sampleCompetitors(city: string, now: string): CompetitorRow[] {
  return [
    {
      name: `Code Ninjas ${city} (sample)`,
      type: 'Coding Camp',
      pricing: '$299/week',
      capacity: 40,
      source: 'poc',
      source_url: null,
      raw_data: { mode: 'poc', query: `coding camp ${city}` },
      scraped_at: now,
    },
    {
      name: `Mathnasium ${city} (sample)`,
      type: 'STEM Tutoring',
      pricing: '$250/month',
      capacity: 30,
      source: 'poc',
      source_url: null,
      raw_data: { mode: 'poc', query: `math tutoring ${city}` },
      scraped_at: now,
    },
  ]
}

function buildSignals(city: string, mode: string, competitorCount: number, firecrawlCount: number): SignalRow[] {
  return [
    {
      signal_key: 'competitor_count',
      label: 'Competitor Count',
      value: String(competitorCount),
      delta: competitorCount > 0 ? 'Fetched from live/source-backed search' : 'No live competitors found',
      delta_type: competitorCount > 0 ? 'up' : 'neutral',
      source: mode,
      raw_data: { mode, city, competitorCount },
      confidence: competitorCount > 0 ? 0.75 : 0.35,
    },
    {
      signal_key: 'source_pages_found',
      label: 'Source Pages Found',
      value: String(firecrawlCount),
      delta: firecrawlCount > 0 ? 'Firecrawl search returned source pages' : 'No Firecrawl pages yet',
      delta_type: firecrawlCount > 0 ? 'up' : 'neutral',
      source: mode,
      raw_data: { mode, city, firecrawlCount },
      confidence: firecrawlCount > 0 ? 0.65 : 0.35,
    },
    {
      signal_key: 'data_readiness',
      label: 'Data Readiness',
      value: mode === 'live_api' ? 'Live API Connected' : 'POC Sample',
      delta: mode === 'live_api' ? 'Apify/Firecrawl path is active' : 'Waiting for API secrets',
      delta_type: mode === 'live_api' ? 'up' : 'neutral',
      source: mode,
      raw_data: { mode, city },
      confidence: mode === 'live_api' ? 0.7 : 0.5,
    },
  ]
}

function buildScores(competitorCount: number, firecrawlCount: number) {
  const hasLiveData = competitorCount > 0 || firecrawlCount > 0
  return [
    { category: 'summer_camp_demand', score: hasLiveData ? 78 : 82 },
    { category: 'school_density', score: hasLiveData ? 74 : 75 },
    { category: 'child_population', score: 78 },
    { category: 'dual_income_families', score: 82 },
    { category: 'stem_jobs', score: hasLiveData ? 76 : 70 },
    { category: 'competition_score', score: Math.max(55, Math.min(90, 78 - competitorCount * 2)) },
  ]
}

async function fetchApifyCompetitors(city: string, state: string, now: string) {
  const token = Deno.env.get('APIFY_API_TOKEN')
  if (!token) return { rows: [] as CompetitorRow[], error: null as string | null, rawCount: 0, afterFilter: 0, excludedCount: 0 }

  const actorId = normalizeActorId(Deno.env.get('APIFY_GOOGLE_MAPS_ACTOR_ID') ?? 'compass/google-maps-scraper')
  const queries = [
    `coding camp ${city} ${state}`,
    `STEM camp ${city} ${state}`,
    `robotics camp ${city} ${state}`,
    `math tutoring ${city} ${state}`,
  ]

  const payload = {
    searchStringsArray: queries,
    maxCrawledPlacesPerSearch: 5,
    language: 'en',
    locationQuery: `${city}, ${state}`,
    includeReviews: false,
    includeImages: false,
  }

  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=90`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => [])
    if (!res.ok) return { rows: [] as CompetitorRow[], error: `Apify ${res.status}: ${JSON.stringify(data).slice(0, 400)}`, rawCount: 0, afterFilter: 0, excludedCount: 0 }
    const items = Array.isArray(data) ? data : []
    const relevant = items.filter((it) => isRelevantCompetitor(it as Record<string, unknown>))
    const excludedCount = items.length - relevant.length
    const seen = new Set<string>()
    const rows = relevant
      .map((item) => mapApifyItem(item as Record<string, unknown>, now))
      .filter((row): row is CompetitorRow => Boolean(row))
      .filter((row) => {
        const key = row.name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 20)
    return { rows, error: null as string | null, rawCount: items.length, afterFilter: relevant.length, excludedCount }
  } catch (e) {
    return { rows: [] as CompetitorRow[], error: (e as Error).message, rawCount: 0, afterFilter: 0, excludedCount: 0 }
  }
}

async function fetchFirecrawlSignals(city: string, state: string) {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return { count: 0, error: null as string | null, raw: null as unknown }

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query: `summer camps STEM robotics enrichment elementary school ${city} ${state}`,
        limit: 5,
        scrapeOptions: { formats: ['markdown'] },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { count: 0, error: `Firecrawl ${res.status}: ${JSON.stringify(data).slice(0, 400)}`, raw: data }
    const results = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return { count: results.length, error: null as string | null, raw: data }
  } catch (e) {
    return { count: 0, error: (e as Error).message, raw: null as unknown }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)

    const body = await req.json().catch(() => ({}))
    const city = String(body?.city ?? '').trim()
    const state = String(body?.state ?? '').trim()
    const errors: Record<string, string> = {}
    if (city.length < 1 || city.length > 100) errors.city = 'city must be 1–100 chars'
    if (state.length < 2 || state.length > 50) errors.state = 'state must be 2–50 chars'
    if (Object.keys(errors).length) return json({ error: errors }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    const startedAt = new Date().toISOString()

    const apify = await fetchApifyCompetitors(city, state, startedAt)
    const firecrawl = await fetchFirecrawlSignals(city, state)
    const hasAnyLiveSecret = Boolean(Deno.env.get('APIFY_API_TOKEN') || Deno.env.get('FIRECRAWL_API_KEY'))
    const mode = hasAnyLiveSecret ? 'live_api' : 'poc'
    const competitors = apify.rows.length > 0 ? apify.rows : sampleCompetitors(city, startedAt)
    const competitorCount = competitors.length
    const compositeScore = Math.max(45, Math.min(95, 72 + Math.min(12, firecrawl.count * 2) - Math.min(10, Math.max(0, competitorCount - 4))))

    const { data: cityRow, error: cityErr } = await admin
      .from('cities')
      .upsert(
        {
          city,
          state,
          market_type: 'Suburb',
          tier: compositeScore >= 85 ? 'A' : compositeScore >= 75 ? 'B' : compositeScore >= 65 ? 'C' : 'D',
          composite_score: compositeScore,
          population: 100000,
          competitor_count: competitorCount,
          last_scraped_at: startedAt,
          notes: mode === 'live_api' ? 'Live API POC data' : 'POC sample data',
        },
        { onConflict: 'city,state' },
      )
      .select('id')
      .single()

    if (cityErr || !cityRow) return json({ error: 'Failed to upsert city', detail: cityErr?.message }, 500)
    const cityId = cityRow.id as string

    await admin.from('city_market_signals').delete().eq('city_id', cityId)
    await admin.from('city_category_scores').delete().eq('city_id', cityId)
    await admin.from('city_competitors').delete().eq('city_id', cityId).in('source', ['poc', 'apify', 'firecrawl'])

    const signals = buildSignals(city, mode, competitorCount, firecrawl.count)
    const scores = buildScores(competitorCount, firecrawl.count)

    const { error: signalsErr } = await admin
      .from('city_market_signals')
      .insert(signals.map((row) => ({ ...row, city_id: cityId })))
    if (signalsErr) return json({ error: 'Failed to insert signals', detail: signalsErr.message }, 500)

    const { error: scoresErr } = await admin
      .from('city_category_scores')
      .insert(scores.map((row) => ({ ...row, city_id: cityId })))
    if (scoresErr) return json({ error: 'Failed to insert scores', detail: scoresErr.message }, 500)

    const { error: compErr } = await admin
      .from('city_competitors')
      .insert(competitors.map((row) => ({ ...row, city_id: cityId })))
    if (compErr) return json({ error: 'Failed to insert competitors', detail: compErr.message }, 500)

    const completedAt = new Date().toISOString()
    const { data: jobRow, error: jobErr } = await admin
      .from('city_fetch_jobs')
      .insert({
        city_id: cityId,
        city,
        state,
        source: mode,
        status: apify.error || firecrawl.error ? 'completed_with_warnings' : 'completed',
        started_at: startedAt,
        completed_at: completedAt,
        request_payload: { city, state, mode },
        response_summary: {
          mode,
          counts: { signals: signals.length, scores: scores.length, competitors: competitors.length, apify_raw: apify.rawCount, firecrawl_results: firecrawl.count },
          warnings: { apify: apify.error, firecrawl: firecrawl.error },
        },
        error_message: [apify.error, firecrawl.error].filter(Boolean).join(' | ') || null,
      })
      .select('id')
      .single()

    if (jobErr) return json({ error: 'Failed to insert job', detail: jobErr.message }, 500)

    return json({
      ok: true,
      mode,
      city_id: cityId,
      inserted: { signals: signals.length, scores: scores.length, competitors: competitors.length, job_id: jobRow?.id },
      warnings: { apify: apify.error, firecrawl: firecrawl.error },
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
