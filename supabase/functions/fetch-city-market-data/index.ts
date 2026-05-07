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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // --- Auth: validate caller JWT ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return json({ error: 'Invalid session' }, 401)
    }

    // --- Validate body ---
    const body = await req.json().catch(() => ({}))
    const city = String(body?.city ?? '').trim()
    const state = String(body?.state ?? '').trim()
    const errors: Record<string, string> = {}
    if (city.length < 1 || city.length > 100) errors.city = 'city must be 1–100 chars'
    if (state.length < 2 || state.length > 50) errors.state = 'state must be 2–50 chars'
    if (Object.keys(errors).length) return json({ error: errors }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    })

    const startedAt = new Date().toISOString()

    // 1) Upsert cities (UNIQUE on city, state)
    const { data: cityRow, error: cityErr } = await admin
      .from('cities')
      .upsert(
        {
          city,
          state,
          market_type: 'Suburb',
          tier: 'C',
          composite_score: 72,
          population: 100000,
          last_scraped_at: startedAt,
          notes: 'POC sample data',
        },
        { onConflict: 'city,state' },
      )
      .select('id')
      .single()

    if (cityErr || !cityRow) {
      return json({ error: 'Failed to upsert city', detail: cityErr?.message }, 500)
    }
    const cityId = cityRow.id as string

    // 2) Clear prior POC sample rows for this city (keeps re-runs idempotent)
    await admin.from('city_market_signals').delete().eq('city_id', cityId)
    await admin.from('city_category_scores').delete().eq('city_id', cityId)
    await admin.from('city_competitors').delete().eq('city_id', cityId).eq('source', 'poc')

    // 3) Sample market signals
    const signals = [
      {
        city_id: cityId,
        signal_key: 'population_growth',
        label: 'Population Growth (5y)',
        value: '+12.4%',
        delta: '+2.1%',
        delta_type: 'up',
        source: 'poc',
        confidence: 0.5,
      },
      {
        city_id: cityId,
        signal_key: 'median_income_trend',
        label: 'Median Income Trend',
        value: '$95,200',
        delta: '+3.8%',
        delta_type: 'up',
        source: 'poc',
        confidence: 0.5,
      },
      {
        city_id: cityId,
        signal_key: 'school_enrollment',
        label: 'Elementary Enrollment',
        value: '18,400',
        delta: '+1.2%',
        delta_type: 'up',
        source: 'poc',
        confidence: 0.5,
      },
    ]
    const { error: signalsErr } = await admin.from('city_market_signals').insert(signals)
    if (signalsErr) return json({ error: 'Failed to insert signals', detail: signalsErr.message }, 500)

    // 4) Sample category scores
    const scores = [
      { city_id: cityId, category: 'summer_camp_demand', score: 82 },
      { city_id: cityId, category: 'school_density', score: 75 },
      { city_id: cityId, category: 'child_population', score: 78 },
      { city_id: cityId, category: 'dual_income_families', score: 85 },
      { city_id: cityId, category: 'stem_jobs', score: 70 },
      { city_id: cityId, category: 'competition_score', score: 68 },
    ]
    const { error: scoresErr } = await admin.from('city_category_scores').insert(scores)
    if (scoresErr) return json({ error: 'Failed to insert scores', detail: scoresErr.message }, 500)

    // 5) Sample competitors
    const competitors = [
      {
        city_id: cityId,
        name: 'Code Ninjas (sample)',
        type: 'Coding Camp',
        pricing: '$299/week',
        capacity: 40,
        source: 'poc',
        scraped_at: startedAt,
      },
      {
        city_id: cityId,
        name: 'Mathnasium (sample)',
        type: 'STEM Tutoring',
        pricing: '$250/month',
        capacity: 30,
        source: 'poc',
        scraped_at: startedAt,
      },
    ]
    const { error: compErr } = await admin.from('city_competitors').insert(competitors)
    if (compErr) return json({ error: 'Failed to insert competitors', detail: compErr.message }, 500)

    // 6) Insert fetch job
    const completedAt = new Date().toISOString()
    const { data: jobRow, error: jobErr } = await admin
      .from('city_fetch_jobs')
      .insert({
        city_id: cityId,
        city,
        state,
        source: 'poc',
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt,
        request_payload: { city, state },
        response_summary: {
          mode: 'poc',
          counts: { signals: signals.length, scores: scores.length, competitors: competitors.length },
        },
      })
      .select('id')
      .single()

    if (jobErr) return json({ error: 'Failed to insert job', detail: jobErr.message }, 500)

    return json({
      ok: true,
      mode: 'poc',
      city_id: cityId,
      inserted: {
        signals: signals.length,
        scores: scores.length,
        competitors: competitors.length,
        job_id: jobRow?.id,
      },
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
