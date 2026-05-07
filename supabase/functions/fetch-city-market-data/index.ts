import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

type Item = Record<string, unknown>

function normalizeActorId(actorId: string) {
  return actorId.includes('/') ? actorId.replace('/', '~') : actorId
}

function itemText(item: Item) {
  return `${item.title ?? ''} ${item.name ?? ''} ${item.categoryName ?? ''} ${
    Array.isArray(item.categories) ? (item.categories as unknown[]).join(' ') : item.categories ?? ''
  } ${item.description ?? ''}`.toLowerCase()
}

// ---- Bucket classifiers ----
const COMPETITOR_INCLUDE = ['coding','code','robotics','robot','stem','maker','technology','computer','tutoring','math','enrichment','science','after school','after-school','learning center','tutor','academy of','academic']
const COMPETITOR_EXCLUDE = ['sports store','sporting goods','golf','pga','soccer','baseball','basketball','fitness','gym','retail','academy sports','coaching center','apparel','dance','music school','martial arts']

function isCompetitor(item: Item) {
  const t = itemText(item)
  if (COMPETITOR_EXCLUDE.some((k) => t.includes(k))) return false
  return COMPETITOR_INCLUDE.some((k) => t.includes(k))
}
function isElementarySchool(item: Item) {
  const t = itemText(item)
  return /elementary|grade school|primary school/.test(t) && !/preschool|pre-school/.test(t)
}
function isPrivateSchool(item: Item) {
  const t = itemText(item)
  return /private school|montessori|christian school|catholic school|prep school|day school/.test(t)
}
function isPreschool(item: Item) {
  const t = itemText(item)
  return /preschool|pre-school|kindergarten|early learning|daycare/.test(t)
}
function isStemEnrichment(item: Item) {
  const t = itemText(item)
  return /stem|robotic|coding|code|maker|technology camp/.test(t)
}
function isRentalVenue(item: Item) {
  const t = itemText(item)
  return /church|community center|recreation center|rec center|ymca|library|civic center/.test(t)
}
function isParentMindset(item: Item) {
  const t = itemText(item)
  return /montessori|children's museum|childrens museum|library|robotics club|maker space|makerspace|museum/.test(t)
}

function inferCompetitorType(item: Item) {
  const t = itemText(item)
  if (t.includes('robot') || t.includes('coding') || t.includes('stem')) return 'STEM / Coding Program'
  if (t.includes('math')) return 'Math / STEM Tutoring'
  if (t.includes('camp')) return 'Summer Camp'
  if (t.includes('learning center') || t.includes('tutor')) return 'Tutoring / Enrichment'
  return 'Youth Enrichment'
}

type CompetitorRow = {
  name: string; type: string | null; pricing: string | null; capacity: number | null;
  source: string; source_url: string | null; raw_data: Item; scraped_at: string;
}

function mapCompetitor(item: Item, now: string): CompetitorRow | null {
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
    { name: `Code Ninjas ${city} (sample)`, type: 'Coding Camp', pricing: '$299/week', capacity: 40, source: 'poc', source_url: null, raw_data: { mode: 'poc' }, scraped_at: now },
    { name: `Mathnasium ${city} (sample)`, type: 'STEM Tutoring', pricing: '$250/month', capacity: 30, source: 'poc', source_url: null, raw_data: { mode: 'poc' }, scraped_at: now },
  ]
}

// ---- Apify multi-search ----
type ApifyResult = {
  rawCount: number
  items: Item[]
  error: string | null
}

async function runApifySearch(actorId: string, token: string, city: string, state: string, queries: string[]): Promise<ApifyResult> {
  const payload = {
    searchStringsArray: queries,
    maxCrawledPlacesPerSearch: 5,
    language: 'en',
    locationQuery: `${city}, ${state}`,
    includeReviews: false,
    includeImages: false,
  }
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=180`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => [])
    if (!res.ok) return { rawCount: 0, items: [], error: `Apify ${res.status}: ${JSON.stringify(data).slice(0, 300)}` }
    const items = Array.isArray(data) ? data : []
    return { rawCount: items.length, items, error: null }
  } catch (e) {
    return { rawCount: 0, items: [], error: (e as Error).message }
  }
}

const QUERY_GROUPS = {
  schools: (c: string, s: string) => [`elementary schools ${c} ${s}`, `private elementary schools ${c} ${s}`, `preschools ${c} ${s}`, `school district ${c} ${s}`],
  pricing: (c: string, s: string) => [`private school ${c} ${s}`, `premium summer camp ${c} ${s}`],
  competitors: (c: string, s: string) => [`coding camp ${c} ${s}`, `STEM camp ${c} ${s}`, `robotics camp ${c} ${s}`, `math tutoring ${c} ${s}`, `summer camp ${c} ${s}`],
  rentals: (c: string, s: string) => [`church ${c} ${s}`, `community center ${c} ${s}`, `recreation center ${c} ${s}`],
  parent: (c: string, s: string) => [`Montessori school ${c} ${s}`, `children museum ${c} ${s}`, `library ${c} ${s}`, `maker space ${c} ${s}`],
}

async function fetchAllApify(city: string, state: string) {
  const token = Deno.env.get('APIFY_API_TOKEN')
  if (!token) return null
  const actorId = normalizeActorId(Deno.env.get('APIFY_GOOGLE_MAPS_ACTOR_ID') ?? 'compass/crawler-google-places')

  // Sequential to avoid Apify concurrent memory limits
  const groups: ApifyResult[] = []
  for (const fn of [QUERY_GROUPS.schools, QUERY_GROUPS.pricing, QUERY_GROUPS.competitors, QUERY_GROUPS.rentals, QUERY_GROUPS.parent]) {
    groups.push(await runApifySearch(actorId, token, city, state, fn(city, state)))
  }
  const errors = groups.map((g) => g.error).filter(Boolean) as string[]
  const all: Item[] = []
  const seen = new Set<string>()
  for (const g of groups) {
    for (const it of g.items) {
      const key = String(it.title ?? it.name ?? '').toLowerCase().trim() + '|' + String(it.address ?? it.placeId ?? '').toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      all.push(it)
    }
  }
  return {
    rawCount: groups.reduce((s, g) => s + g.rawCount, 0),
    deduped: all,
    error: errors.length ? errors.join(' | ') : null,
  }
}

async function fetchFirecrawlSignals(city: string, state: string) {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return { count: 0, error: null as string | null }
  try {
    const queries = [
      `summer camps STEM robotics enrichment ${city} ${state}`,
      `elementary schools school district ${city} ${state}`,
      `Montessori children museum library programs ${city} ${state}`,
      `church community center rental ${city} ${state}`,
    ]
    const results = await Promise.all(queries.map(async (q) => {
      const res = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: q, limit: 3 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { count: 0, error: `Firecrawl ${res.status}` }
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      return { count: arr.length, error: null as string | null }
    }))
    const total = results.reduce((s, r) => s + r.count, 0)
    const err = results.map((r) => r.error).filter(Boolean).join(' | ') || null
    return { count: total, error: err }
  } catch (e) {
    return { count: 0, error: (e as Error).message }
  }
}

function clamp(n: number, lo = 40, hi = 98) { return Math.max(lo, Math.min(hi, Math.round(n))) }

// ---- Census ACS 5-year ----
type CensusData = {
  total_population: number | null
  median_household_income: number | null
  children_under_18: number | null
  children_pct: number | null
  bachelors_plus_pct: number | null
  income_100k_plus_pct: number | null
  income_150k_plus_pct: number | null
  state_fips: string | null
  place_fips: string | null
  source_url: string | null
}

const STATE_FIPS: Record<string, string> = {
  AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',DC:'11',FL:'12',GA:'13',HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',SC:'45',SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56',PR:'72'
}
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',colorado:'CO',connecticut:'CT',delaware:'DE','district of columbia':'DC',florida:'FL',georgia:'GA',hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',kentucky:'KY',louisiana:'LA',maine:'ME',maryland:'MD',massachusetts:'MA',michigan:'MI',minnesota:'MN',mississippi:'MS',missouri:'MO',montana:'MT',nebraska:'NE',nevada:'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',ohio:'OH',oklahoma:'OK',oregon:'OR',pennsylvania:'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',virginia:'VA',washington:'WA','west virginia':'WV',wisconsin:'WI',wyoming:'WY'
}

function resolveStateAbbr(state: string): string | null {
  const s = state.trim()
  if (s.length === 2) return s.toUpperCase() in STATE_FIPS ? s.toUpperCase() : null
  return STATE_NAME_TO_ABBR[s.toLowerCase()] ?? null
}

async function fetchCensus(city: string, state: string): Promise<{ data: CensusData | null; error: string | null }> {
  const key = Deno.env.get('CENSUS_API_KEY')
  if (!key) return { data: null, error: 'CENSUS_API_KEY missing' }
  const abbr = resolveStateAbbr(state)
  if (!abbr) return { data: null, error: `Unknown state: ${state}` }
  const stateFips = STATE_FIPS[abbr]

  try {
    // 1. Find place FIPS by name match within state
    const placeListUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}&key=${key}`
    const listRes = await fetch(placeListUrl)
    if (!listRes.ok) return { data: null, error: `Census place list ${listRes.status}` }
    const listData = await listRes.json() as string[][]
    const target = city.toLowerCase().trim()
    let placeFips: string | null = null
    let matchedName: string | null = null
    // header is row 0
    for (let i = 1; i < listData.length; i++) {
      const [name, , place] = listData[i]
      const nm = name.toLowerCase()
      // matches "Frisco city, Texas" or "Frisco town, Texas"
      if (nm.startsWith(target + ' city,') || nm.startsWith(target + ' town,') || nm.startsWith(target + ' cdp,') || nm.startsWith(target + ' village,')) {
        placeFips = place; matchedName = name; break
      }
    }
    if (!placeFips) {
      // looser match
      for (let i = 1; i < listData.length; i++) {
        const [name, , place] = listData[i]
        if (name.toLowerCase().startsWith(target + ' ')) { placeFips = place; matchedName = name; break }
      }
    }
    if (!placeFips) return { data: null, error: `Place not found: ${city}, ${abbr}` }

    // 2. Fetch ACS variables
    const vars = [
      'B01003_001E', // total pop
      'B19013_001E', // median household income
      'B09001_001E', // population under 18
      'B15003_001E', // total 25+
      'B15003_022E', // bachelor's
      'B15003_023E', // master's
      'B15003_024E', // professional
      'B15003_025E', // doctorate
      'B19001_001E', // total households
      'B19001_014E', // 100-125k
      'B19001_015E', // 125-150k
      'B19001_016E', // 150-200k
      'B19001_017E', // 200k+
    ]
    const dataUrl = `https://api.census.gov/data/2022/acs/acs5?get=${vars.join(',')}&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
    const dataRes = await fetch(dataUrl)
    if (!dataRes.ok) return { data: null, error: `Census ACS ${dataRes.status}` }
    const arr = await dataRes.json() as string[][]
    const row = arr[1]
    const num = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null }
    const totalPop = num(row[0])
    const medianIncome = num(row[1])
    const under18 = num(row[2])
    const total25 = num(row[3])
    const bachPlus = (num(row[4]) ?? 0) + (num(row[5]) ?? 0) + (num(row[6]) ?? 0) + (num(row[7]) ?? 0)
    const totalHH = num(row[8])
    const hh100_125 = num(row[9]) ?? 0
    const hh125_150 = num(row[10]) ?? 0
    const hh150_200 = num(row[11]) ?? 0
    const hh200p = num(row[12]) ?? 0
    const income100plus = hh100_125 + hh125_150 + hh150_200 + hh200p
    const income150plus = hh150_200 + hh200p

    return {
      data: {
        total_population: totalPop,
        median_household_income: medianIncome,
        children_under_18: under18,
        children_pct: totalPop && under18 ? Math.round((under18 / totalPop) * 1000) / 10 : null,
        bachelors_plus_pct: total25 && total25 > 0 ? Math.round((bachPlus / total25) * 1000) / 10 : null,
        income_100k_plus_pct: totalHH && totalHH > 0 ? Math.round((income100plus / totalHH) * 1000) / 10 : null,
        income_150k_plus_pct: totalHH && totalHH > 0 ? Math.round((income150plus / totalHH) * 1000) / 10 : null,
        state_fips: stateFips,
        place_fips: placeFips,
        source_url: `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=place:${placeFips}&in=state:${stateFips}`,
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
}

function computeCategoryScores(b: {
  elementary: number; private_: number; preschool: number;
  competitors: number; stem: number; rentals: number; parent: number; firecrawl: number;
  census: CensusData | null;
}) {
  const c = b.census
  // Census-driven boosts (bounded contributions)
  // Demand: population scale + children share
  let demandBoost = 0
  if (c?.total_population) demandBoost += Math.min(15, Math.log10(Math.max(1, c.total_population)) * 2.5)
  if (c?.children_pct) demandBoost += Math.min(10, (c.children_pct - 18) * 0.8) // 18% baseline
  // Pricing power: median income + premium income share
  let priceBoost = 0
  if (c?.median_household_income) priceBoost += Math.min(20, (c.median_household_income - 60000) / 4000)
  if (c?.income_100k_plus_pct) priceBoost += Math.min(10, (c.income_100k_plus_pct - 25) * 0.4)
  if (c?.income_150k_plus_pct) priceBoost += Math.min(8, (c.income_150k_plus_pct - 10) * 0.5)
  // Parent mindset: education + children
  let mindsetBoost = 0
  if (c?.bachelors_plus_pct) mindsetBoost += Math.min(20, (c.bachelors_plus_pct - 30) * 0.6)
  if (c?.children_pct) mindsetBoost += Math.min(6, (c.children_pct - 18) * 0.4)

  return {
    demand: clamp(50 + b.elementary * 3 + b.preschool * 1.5 + b.firecrawl * 1 + demandBoost),
    pricing_power: clamp(45 + b.private_ * 4 + b.parent * 1 + priceBoost),
    competitive_landscape: clamp(95 - b.competitors * 3 - b.stem * 1.5),
    franchisee_supply: clamp(55 + b.elementary * 3 + b.private_ * 2),
    ease_of_operations: clamp(55 + b.rentals * 4),
    parent_mindset: clamp(50 + b.parent * 3 + b.private_ * 1.5 + b.firecrawl * 0.5 + mindsetBoost),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
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

    const apify = await fetchAllApify(city, state)
    const firecrawl = await fetchFirecrawlSignals(city, state)
    const census = await fetchCensus(city, state)
    const censusData = census.data
    const censusError = census.error
    const hasAnyLiveSecret = Boolean(Deno.env.get('APIFY_API_TOKEN') || Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('CENSUS_API_KEY'))
    const mode = hasAnyLiveSecret ? 'live_api' : 'poc'

    const allItems = apify?.deduped ?? []
    const apifyRaw = apify?.rawCount ?? 0
    const apifyError = apify?.error ?? null

    // Bucket counts
    const competitorItems = allItems.filter(isCompetitor)
    const elementaryItems = allItems.filter(isElementarySchool)
    const privateItems = allItems.filter(isPrivateSchool)
    const preschoolItems = allItems.filter(isPreschool)
    const stemItems = allItems.filter(isStemEnrichment)
    const rentalItems = allItems.filter(isRentalVenue)
    const parentItems = allItems.filter(isParentMindset)

    // Dedupe competitors by name
    const seen = new Set<string>()
    const competitors: CompetitorRow[] = competitorItems
      .map((it) => mapCompetitor(it, startedAt))
      .filter((r): r is CompetitorRow => Boolean(r))
      .filter((r) => { const k = r.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
      .slice(0, 30)

    const finalCompetitors = competitors.length > 0 ? competitors : sampleCompetitors(city, startedAt)
    const excludedCount = Math.max(0, allItems.length - (competitorItems.length + elementaryItems.length + privateItems.length + preschoolItems.length + stemItems.length + rentalItems.length + parentItems.length))

    const scoreInputs = {
      elementary: elementaryItems.length,
      private_: privateItems.length,
      preschool: preschoolItems.length,
      competitors: finalCompetitors.length,
      stem: stemItems.length,
      rentals: rentalItems.length,
      parent: parentItems.length,
      firecrawl: firecrawl.count,
      census: censusData,
    }
    const cat = computeCategoryScores(scoreInputs)
    const categoryWeights = { demand: 0.25, pricing_power: 0.20, competitive_landscape: 0.20, franchisee_supply: 0.15, ease_of_operations: 0.10, parent_mindset: 0.10 }
    const compositeScore = Math.round(
      cat.demand * categoryWeights.demand + cat.pricing_power * categoryWeights.pricing_power +
      cat.competitive_landscape * categoryWeights.competitive_landscape + cat.franchisee_supply * categoryWeights.franchisee_supply +
      cat.ease_of_operations * categoryWeights.ease_of_operations + cat.parent_mindset * categoryWeights.parent_mindset
    )
    const tier = compositeScore >= 85 ? 'A' : compositeScore >= 75 ? 'B' : compositeScore >= 65 ? 'C' : 'D'

    const cityNotes = censusData
      ? `Live API + Census ACS 2022 (place ${censusData.place_fips})`
      : (mode === 'live_api' ? 'Live API multi-category POC' : 'POC sample data')
    const { data: cityRow, error: cityErr } = await admin.from('cities').upsert({
      city, state, market_type: 'Suburb', tier, composite_score: compositeScore,
      population: censusData?.total_population ?? 100000,
      median_income: censusData?.median_household_income ?? null,
      children_pct: censusData?.children_pct ?? null,
      competitor_count: finalCompetitors.length,
      last_scraped_at: startedAt,
      notes: cityNotes,
    }, { onConflict: 'city,state' }).select('id').single()
    if (cityErr || !cityRow) return json({ error: 'Failed to upsert city', detail: cityErr?.message }, 500)
    const cityId = cityRow.id as string

    await admin.from('city_market_signals').delete().eq('city_id', cityId)
    await admin.from('city_category_scores').delete().eq('city_id', cityId)
    await admin.from('city_competitors').delete().eq('city_id', cityId).in('source', ['poc', 'apify', 'firecrawl'])

    const signals = [
      { signal_key: 'elementary_school_count', label: 'Elementary Schools', value: String(elementaryItems.length), delta: null, delta_type: 'neutral', source: mode, confidence: 0.6 },
      { signal_key: 'private_school_count', label: 'Private Schools', value: String(privateItems.length), delta: null, delta_type: 'neutral', source: mode, confidence: 0.6 },
      { signal_key: 'competitor_count', label: 'Direct Competitors', value: String(finalCompetitors.length), delta: null, delta_type: finalCompetitors.length > 0 ? 'up' : 'neutral', source: mode, confidence: 0.7 },
      { signal_key: 'stem_enrichment_count', label: 'STEM Enrichment Programs', value: String(stemItems.length), delta: null, delta_type: 'neutral', source: mode, confidence: 0.6 },
      { signal_key: 'montessori_count', label: 'Montessori / Premium Schools', value: String(privateItems.filter((p) => itemText(p).includes('montessori')).length), delta: null, delta_type: 'neutral', source: mode, confidence: 0.5 },
      { signal_key: 'rental_venue_count', label: 'Rental Venues (church/community/rec)', value: String(rentalItems.length), delta: null, delta_type: 'neutral', source: mode, confidence: 0.5 },
      { signal_key: 'parent_mindset_places', label: 'Parent-Mindset Places', value: String(parentItems.length), delta: null, delta_type: 'neutral', source: mode, confidence: 0.5 },
      { signal_key: 'firecrawl_source_pages', label: 'Source Pages Found', value: String(firecrawl.count), delta: null, delta_type: firecrawl.count > 0 ? 'up' : 'neutral', source: mode, confidence: 0.5 },
      { signal_key: 'data_readiness', label: 'Data Readiness', value: mode === 'live_api' ? 'Live API Connected' : 'POC Sample', delta: null, delta_type: mode === 'live_api' ? 'up' : 'neutral', source: mode, confidence: 0.7 },
    ]
    const { error: sErr } = await admin.from('city_market_signals').insert(signals.map((r) => ({ ...r, city_id: cityId, raw_data: { mode } })))
    if (sErr) return json({ error: 'Failed to insert signals', detail: sErr.message }, 500)

    const scores = [
      { category: 'demand', score: cat.demand },
      { category: 'pricing_power', score: cat.pricing_power },
      { category: 'competitive_landscape', score: cat.competitive_landscape },
      { category: 'franchisee_supply', score: cat.franchisee_supply },
      { category: 'ease_of_operations', score: cat.ease_of_operations },
      { category: 'parent_mindset', score: cat.parent_mindset },
    ]
    const { error: csErr } = await admin.from('city_category_scores').insert(scores.map((r) => ({ ...r, city_id: cityId })))
    if (csErr) return json({ error: 'Failed to insert scores', detail: csErr.message }, 500)

    const { error: cErr } = await admin.from('city_competitors').insert(finalCompetitors.map((r) => ({ ...r, city_id: cityId })))
    if (cErr) return json({ error: 'Failed to insert competitors', detail: cErr.message }, 500)

    const completedAt = new Date().toISOString()
    const responseSummary = {
      mode,
      counts: {
        apify_raw: apifyRaw,
        apify_after_filter: competitorItems.length,
        excluded_count: excludedCount,
        firecrawl_results: firecrawl.count,
        elementary_schools: elementaryItems.length,
        private_schools: privateItems.length,
        preschools: preschoolItems.length,
        competitors: finalCompetitors.length,
        stem_enrichment: stemItems.length,
        rental_venues: rentalItems.length,
        parent_mindset_places: parentItems.length,
      },
      category_scores: cat,
      composite_score: compositeScore,
      warnings: { apify: apifyError, firecrawl: firecrawl.error },
    }

    const { data: jobRow, error: jobErr } = await admin.from('city_fetch_jobs').insert({
      city_id: cityId, city, state, source: mode,
      status: apifyError || firecrawl.error ? 'completed_with_warnings' : 'completed',
      started_at: startedAt, completed_at: completedAt,
      request_payload: { city, state, mode },
      response_summary: responseSummary,
      error_message: [apifyError, firecrawl.error].filter(Boolean).join(' | ') || null,
    }).select('id').single()
    if (jobErr) return json({ error: 'Failed to insert job', detail: jobErr.message }, 500)

    return json({
      ok: true, mode, city_id: cityId,
      composite_score: compositeScore, tier,
      category_scores: cat,
      inserted: { signals: signals.length, scores: scores.length, competitors: finalCompetitors.length, job_id: jobRow?.id },
      counts: responseSummary.counts,
      warnings: { apify: apifyError, firecrawl: firecrawl.error },
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
