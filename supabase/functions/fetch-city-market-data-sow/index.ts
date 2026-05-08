import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { isMetricEnabled } from '../_shared/scoring.ts'

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

type MetricStatus = 'live' | 'proxy' | 'missing' | 'blocked' | 'manual'
type MetricCategory =
  | 'demand'
  | 'pricing_power'
  | 'competitive_landscape'
  | 'franchisee_supply'
  | 'ease_of_operations'
  | 'parent_mindset'

type SignalInput = {
  signal_key: string
  label: string
  value: string | number | null
  source: string
  source_url?: string | null
  confidence: number
  status: MetricStatus
  metric_category: MetricCategory
  used_in_score: boolean
  notes?: string
  raw_data?: Record<string, unknown>
}

const STATE_FIPS: Record<string, string> = {
  AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',DC:'11',FL:'12',GA:'13',HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',SC:'45',SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56'
}
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',colorado:'CO',connecticut:'CT',delaware:'DE','district of columbia':'DC',florida:'FL',georgia:'GA',hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',kentucky:'KY',louisiana:'LA',maine:'ME',maryland:'MD',massachusetts:'MA',michigan:'MI',minnesota:'MN',mississippi:'MS',missouri:'MO',montana:'MT',nebraska:'NE',nevada:'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',ohio:'OH',oklahoma:'OK',oregon:'OR',pennsylvania:'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',virginia:'VA',washington:'WA','west virginia':'WV',wisconsin:'WI',wyoming:'WY'
}

function resolveStateAbbr(state: string): string | null {
  const s = state.trim()
  if (s.length === 2) return s.toUpperCase() in STATE_FIPS ? s.toUpperCase() : null
  return STATE_NAME_TO_ABBR[s.toLowerCase()] ?? null
}

function fmtPct(n: number | null) {
  return n == null ? 'Not available yet' : `${n.toFixed(1).replace(/\.0$/, '')}%`
}
function fmtMoney(n: number | null) {
  return n == null ? 'Not available yet' : `$${Math.round(n).toLocaleString()}`
}
function fmtNum(n: number | null) {
  return n == null ? 'Not available yet' : Math.round(n).toLocaleString()
}
function pct(part: number | null, total: number | null) {
  if (part == null || total == null || total <= 0) return null
  return Math.round((part / total) * 1000) / 10
}
function missingSignal(metric_category: MetricCategory, signal_key: string, label: string, source = 'not_connected', notes?: string): SignalInput {
  return { signal_key, label, value: 'Not available yet', source, confidence: 0, status: 'missing', metric_category, used_in_score: false, notes }
}

async function fetchCensusExpanded(city: string, state: string) {
  const key = Deno.env.get('CENSUS_API_KEY')
  if (!key) return { data: null as any, error: 'CENSUS_API_KEY missing' }
  const abbr = resolveStateAbbr(state)
  if (!abbr) return { data: null as any, error: `Unknown state: ${state}` }
  const stateFips = STATE_FIPS[abbr]
  try {
    const placeListUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}&key=${key}`
    const listRes = await fetch(placeListUrl)
    if (!listRes.ok) return { data: null as any, error: `Census place list ${listRes.status}` }
    const listData = await listRes.json() as string[][]
    const target = city.toLowerCase().trim()
    let placeFips: string | null = null
    let matchedName: string | null = null
    for (let i = 1; i < listData.length; i++) {
      const [name, , place] = listData[i]
      const nm = name.toLowerCase()
      if (nm.startsWith(target + ' city,') || nm.startsWith(target + ' town,') || nm.startsWith(target + ' cdp,') || nm.startsWith(target + ' village,') || nm.startsWith(target + ' ')) {
        placeFips = place
        matchedName = name
        break
      }
    }
    if (!placeFips) return { data: null as any, error: `Place not found: ${city}, ${abbr}` }

    const vars = [
      'B01003_001E',
      'B19013_001E',
      'B01001_004E',
      'B01001_005E',
      'B01001_028E',
      'B01001_029E',
      'B09001_001E',
      'B15003_001E',
      'B15003_022E',
      'B15003_023E',
      'B15003_024E',
      'B15003_025E',
      'B19001_001E',
      'B19001_014E',
      'B19001_015E',
      'B19001_016E',
      'B19001_017E',
      'B11005_002E',
      'B23025_005E',
      'B23025_003E',
    ]
    const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars.join(',')}&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
    const res = await fetch(url)
    if (!res.ok) return { data: null as any, error: `Census ACS ${res.status}` }
    const rows = await res.json() as string[][]
    const row = rows[1]
    const num = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null }
    const totalPopulation = num(row[0])
    const medianIncome = num(row[1])
    const male5_9 = num(row[2]) ?? 0
    const male10_14 = num(row[3]) ?? 0
    const female5_9 = num(row[4]) ?? 0
    const female10_14 = num(row[5]) ?? 0
    const children5_12 = Math.round(male5_9 + female5_9 + ((male10_14 + female10_14) * 0.6))
    const under18 = num(row[6])
    const total25 = num(row[7])
    const bachelorsPlus = (num(row[8]) ?? 0) + (num(row[9]) ?? 0) + (num(row[10]) ?? 0) + (num(row[11]) ?? 0)
    const totalHH = num(row[12])
    const income100plus = (num(row[13]) ?? 0) + (num(row[14]) ?? 0) + (num(row[15]) ?? 0) + (num(row[16]) ?? 0)
    const income150plus = (num(row[15]) ?? 0) + (num(row[16]) ?? 0)
    const householdsWithChildrenProxy = num(row[17])
    const unemployed = num(row[18])
    const laborForce = num(row[19])

    return {
      data: {
        matched_name: matchedName,
        state_fips: stateFips,
        place_fips: placeFips,
        source_url: `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=place:${placeFips}&in=state:${stateFips}`,
        total_population: totalPopulation,
        median_household_income: medianIncome,
        children_5_12_count: children5_12,
        children_5_12_pct: pct(children5_12, totalPopulation),
        children_under_18: under18,
        households_with_children_under_13_proxy: householdsWithChildrenProxy,
        bachelors_plus_pct: pct(bachelorsPlus, total25),
        income_100k_plus_pct: pct(income100plus, totalHH),
        income_150k_plus_pct: pct(income150plus, totalHH),
        unemployment_proxy_pct: pct(unemployed, laborForce),
      },
      error: null,
    }
  } catch (e) {
    return { data: null as any, error: (e as Error).message }
  }
}

async function fetchBlsSignals(stateFips: string | null) {
  const key = Deno.env.get('BLS_API_KEY')
  if (!key) return { data: null as any, error: 'BLS_API_KEY missing' }
  if (!stateFips) return { data: null as any, error: 'state_fips unavailable' }
  const areaCode = stateFips.padEnd(7, '0')
  const mk = (soc: string) => `OEUS${areaCode}000000${soc}04`
  const teacherSeries = mk('252021')
  const childcareSeries = mk('399011')
  const recreationSeries = mk('399032')
  const seriesIds = [teacherSeries, childcareSeries, recreationSeries]
  try {
    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesid: seriesIds, registrationkey: key }),
    })
    if (!res.ok) return { data: null as any, error: `BLS HTTP ${res.status}` }
    const body = await res.json().catch(() => ({}))
    if (body?.status !== 'REQUEST_SUCCEEDED') return { data: null as any, error: `BLS ${body?.status ?? 'unknown'}: ${(body?.message ?? []).join(' | ')}` }
    const series = Array.isArray(body?.Results?.series) ? body.Results.series : []
    const latest = (sid: string) => {
      const s = series.find((x: any) => x?.seriesID === sid)
      const n = Number(s?.data?.[0]?.value)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    return {
      data: {
        area_code: areaCode,
        source_url: `https://beta.bls.gov/dataViewer/view/timeseries/${teacherSeries}`,
        teacher_salary_proxy: latest(teacherSeries),
        childcare_worker_wage_proxy: latest(childcareSeries),
        guide_wage_proxy: latest(recreationSeries),
        series_used: seriesIds,
      },
      error: null,
    }
  } catch (e) {
    return { data: null as any, error: (e as Error).message }
  }
}

function buildSowSignals(args: {
  census: any | null
  bls: any | null
  existingCounts: Record<string, number>
  existingWarnings: Record<string, unknown>
}) {
  const { census, bls, existingCounts } = args
  const signals: SignalInput[] = []
  const add = (s: SignalInput) => signals.push(s)

  add({ signal_key: 'children_5_12_count', label: 'Children Ages 5–12', value: fmtNum(census?.children_5_12_count ?? null), source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.75 : 0, status: census ? 'proxy' : 'missing', metric_category: 'demand', used_in_score: Boolean(census), notes: 'Estimated from ACS 5-year age bands: 5–9 plus 60% of 10–14.' })
  add({ signal_key: 'children_5_12_pct', label: '% Population Ages 5–12', value: fmtPct(census?.children_5_12_pct ?? null), source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.75 : 0, status: census ? 'proxy' : 'missing', metric_category: 'demand', used_in_score: Boolean(census) })
  add({ signal_key: 'households_with_children_under_13', label: 'Households With Children Under 13', value: census?.households_with_children_under_13_proxy ? `${fmtNum(census.households_with_children_under_13_proxy)} proxy` : 'Not available yet', source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.55 : 0, status: census ? 'proxy' : 'missing', metric_category: 'demand', used_in_score: Boolean(census), notes: 'ACS readily provides own children under 18 proxy. Under-13 exact metric requires deeper variable mapping.' })
  add({ signal_key: 'median_household_income', label: 'Median Household Income', value: fmtMoney(census?.median_household_income ?? null), source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.95 : 0, status: census ? 'live' : 'missing', metric_category: 'demand', used_in_score: Boolean(census) })
  add({ signal_key: 'income_100k_plus_pct', label: 'Households Earning $100k+', value: fmtPct(census?.income_100k_plus_pct ?? null), source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.95 : 0, status: census ? 'live' : 'missing', metric_category: 'demand', used_in_score: Boolean(census) })
  add({ signal_key: 'income_150k_plus_pct', label: 'Households Earning $150k+', value: fmtPct(census?.income_150k_plus_pct ?? null), source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.95 : 0, status: census ? 'live' : 'missing', metric_category: 'demand', used_in_score: Boolean(census) })
  add(missingSignal('demand', 'young_family_growth_rate', 'Growth Rate of Young Families', 'census', 'Requires multi-year ACS comparison.'))
  add(missingSignal('demand', 'dual_income_household_pct', '% Dual-Income Households', 'census', 'Requires ACS family employment variable mapping.'))
  add({ signal_key: 'education_bachelors_plus_pct', label: 'Parent Education / Bachelor’s+', value: fmtPct(census?.bachelors_plus_pct ?? null), source: census ? 'census' : 'not_connected', source_url: census?.source_url ?? null, confidence: census ? 0.9 : 0, status: census ? 'live' : 'missing', metric_category: 'demand', used_in_score: Boolean(census) })
  add(missingSignal('demand', 'summer_weather_index', 'Summer Weather Index', 'weather', 'Needs NOAA/Open-Meteo integration.'))
  add(missingSignal('demand', 'avg_peak_summer_temperature', 'Avg Peak Summer Temperature', 'weather', 'Needs NOAA/Open-Meteo integration.'))
  add(missingSignal('demand', 'days_above_100f', 'Number of 100°+ Days', 'weather', 'Needs NOAA/Open-Meteo integration.'))

  add(missingSignal('pricing_power', 'avg_weekly_camp_tuition', 'Average Weekly Camp Tuition', 'firecrawl', 'Requires pricing extraction from competitor websites.'))
  add(missingSignal('pricing_power', 'avg_hourly_camp_pricing', 'Average Hourly Camp Pricing', 'computed', 'Requires weekly tuition and hours of care.'))
  add(missingSignal('pricing_power', 'premium_stem_camp_pricing', 'Premium STEM / Maker / Enrichment Camp Pricing', 'firecrawl', 'Requires STEM/coding camp pricing extraction.'))
  add(missingSignal('pricing_power', 'private_school_tuition_proxy', 'Private Elementary School Tuition Levels', 'firecrawl', 'Requires private school tuition page extraction or state data.'))
  add(missingSignal('pricing_power', 'private_school_student_count', 'Number of Private School Students', 'state_edu', 'Needs state/private school enrollment data.'))
  add({ signal_key: 'childcare_nanny_hourly_rate_proxy', label: 'Childcare / Nanny Hourly Rate Proxy', value: fmtMoney(bls?.childcare_worker_wage_proxy ?? null), source: bls ? 'bls' : 'not_connected', source_url: bls?.source_url ?? null, confidence: bls ? 0.55 : 0, status: bls ? 'proxy' : 'missing', metric_category: 'pricing_power', used_in_score: Boolean(bls), notes: 'Annual childcare worker wage from BLS used as a local wage/cost proxy, not consumer nanny rate.' })
  add(missingSignal('pricing_power', 'household_discretionary_income_proxy', 'Household Discretionary Income Estimate', 'computed', 'Requires income plus cost-of-living/rent proxy.'))

  add({ signal_key: 'summer_camps_per_10k_children', label: 'Summer Camps per 10,000 Children', value: census?.children_5_12_count ? Math.round(((existingCounts.competitors ?? 0) / census.children_5_12_count) * 10000 * 10) / 10 : 'Not available yet', source: census ? 'computed' : 'not_connected', confidence: census ? 0.55 : 0, status: census ? 'proxy' : 'missing', metric_category: 'competitive_landscape', used_in_score: Boolean(census), notes: 'Uses current competitor count divided by estimated children ages 5–12.' })
  add({ signal_key: 'stem_robotics_maker_camp_count', label: 'STEM / Robotics / Maker Camps', value: existingCounts.stem_enrichment ?? 'Not available yet', source: 'apify', confidence: 0.65, status: 'proxy', metric_category: 'competitive_landscape', used_in_score: true })
  add(missingSignal('competitive_landscape', 'school_based_summer_camp_count', 'School-Based Summer Camps', 'firecrawl', 'Needs classifier for camp programs hosted at schools.'))
  add({ signal_key: 'national_brand_presence', label: 'National Brand Presence', value: 'Proxy from competitor names', source: 'apify', confidence: 0.35, status: 'proxy', metric_category: 'competitive_landscape', used_in_score: false, notes: 'Needs explicit national-brand detector list.' })
  add(missingSignal('competitive_landscape', 'google_search_demand_summer_camp', 'Google Search Demand: summer camp [city]', 'google_trends', 'Needs Google Trends actor/source.'))
  add(missingSignal('competitive_landscape', 'google_search_demand_summer_day_camp', 'Google Search Demand: summer day camp in [city]', 'google_trends', 'Needs Google Trends actor/source.'))
  add(missingSignal('competitive_landscape', 'google_search_demand_summer_day_camps_year', 'Google Search Demand: Summer Day Camps [Current Year]', 'google_trends', 'Needs Google Trends actor/source.'))
  add(missingSignal('competitive_landscape', 'waitlist_sold_out_signal_count', 'Waitlist / Sold-Out Signals', 'firecrawl', 'Needs page extraction for waitlist/sold-out language.'))

  add(missingSignal('franchisee_supply', 'public_elementary_teacher_count', 'Public Elementary Teachers', 'state_edu', 'Needs state/NCES district data.'))
  add(missingSignal('franchisee_supply', 'private_charter_montessori_teacher_count', 'Private / Charter / Montessori Teachers', 'state_edu', 'Needs private/charter/Montessori teacher source or estimate.'))
  add({ signal_key: 'elementary_school_count', label: 'Elementary Schools', value: existingCounts.elementary_schools ?? 'Not available yet', source: 'apify', confidence: 0.6, status: 'proxy', metric_category: 'franchisee_supply', used_in_score: true })
  add({ signal_key: 'teacher_salary_proxy', label: 'Average Teacher Salary Proxy', value: fmtMoney(bls?.teacher_salary_proxy ?? null), source: bls ? 'bls' : 'not_connected', source_url: bls?.source_url ?? null, confidence: bls ? 0.7 : 0, status: bls ? 'proxy' : 'missing', metric_category: 'franchisee_supply', used_in_score: Boolean(bls) })
  add(missingSignal('franchisee_supply', 'cost_of_living_index', 'Cost of Living Index', 'zillow_col', 'Needs approved COL/rent source.'))
  add(missingSignal('franchisee_supply', 'summer_income_need_ratio', 'Summer Income Need Ratio', 'computed', 'Requires teacher salary and COL/rent proxy.'))

  add({ signal_key: 'rental_venue_count', label: 'Rental Venues (Schools / Churches / Rec Centers)', value: existingCounts.rental_venues ?? 'Not available yet', source: 'apify', confidence: 0.55, status: 'proxy', metric_category: 'ease_of_operations', used_in_score: true })
  add(missingSignal('ease_of_operations', 'classroom_rental_cost_weekly', 'Typical Classroom Rental Cost per Week', 'firecrawl', 'Needs venue/classroom rental price extraction.'))
  add(missingSignal('ease_of_operations', 'commute_sprawl_index', 'Commute Times / Geographic Sprawl', 'census_maps', 'Needs Census commute and/or maps/geography source.'))
  add(missingSignal('ease_of_operations', 'state_camp_regulation_complexity', 'State Camp Regulation Complexity', 'aca', 'Needs ACA state law/regulation mapping.'))
  add({ signal_key: 'guide_wage_proxy', label: 'Estimated Guide Wage Proxy', value: fmtMoney(bls?.guide_wage_proxy ?? null), source: bls ? 'bls' : 'not_connected', source_url: bls?.source_url ?? null, confidence: bls ? 0.6 : 0, status: bls ? 'proxy' : 'missing', metric_category: 'ease_of_operations', used_in_score: Boolean(bls) })

  add(missingSignal('parent_mindset', 'homeschool_population_proxy', 'Homeschool Population Proxy', 'state_edu', 'Needs state education/homeschool source.'))
  add({ signal_key: 'montessori_school_density', label: 'Elementary Montessori School Density', value: census?.children_5_12_count ? Math.round(((existingCounts.montessori ?? 0) / census.children_5_12_count) * 10000 * 10) / 10 : 'Not available yet', source: census ? 'computed' : 'not_connected', confidence: census ? 0.55 : 0, status: census ? 'proxy' : 'missing', metric_category: 'parent_mindset', used_in_score: Boolean(census) })
  add({ signal_key: 'childrens_museum_signal', label: 'Children’s Museum Signal', value: existingCounts.parent_mindset_places ?? 'Not available yet', source: 'apify', confidence: 0.35, status: 'proxy', metric_category: 'parent_mindset', used_in_score: false, notes: 'Current value is a parent-mindset place count, not museum participation.' })
  add({ signal_key: 'robotics_maker_space_count', label: 'Robotics Clubs / Maker Spaces', value: existingCounts.stem_enrichment ?? 'Not available yet', source: 'apify', confidence: 0.55, status: 'proxy', metric_category: 'parent_mindset', used_in_score: true })
  add(missingSignal('parent_mindset', 'library_children_program_signal', 'Library Program Engagement', 'firecrawl', 'Needs library children-program page extraction.'))
  add(missingSignal('parent_mindset', 'parenting_facebook_group_activity', 'Parenting Facebook Group Activity', 'manual_or_phase2', 'Facebook access restrictions likely require manual or approved API approach.'))
  add(missingSignal('parent_mindset', 'parent_community_activity_proxy', 'Other Parent Communities Activity', 'manual_or_phase2', 'Nextdoor and similar communities are restricted/manual sources.'))

  add({ signal_key: 'sow_metric_coverage_readiness', label: 'SOW Metric Coverage Readiness', value: `${signals.filter(s => s.status === 'live' || s.status === 'proxy').length + 1}/${signals.length + 1} live/proxy`, source: 'computed', confidence: 1, status: 'live', metric_category: 'demand', used_in_score: false, notes: 'Audit row showing live/proxy coverage across Sam SOW metrics.' })

  return signals
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
    if (!city || !state) return json({ error: { city: 'required', state: 'required' } }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    const startedAt = new Date().toISOString()

    const { data: censusData, error: censusError } = await fetchCensusExpanded(city, state)
    const stateFips = censusData?.state_fips ?? (resolveStateAbbr(state) ? STATE_FIPS[resolveStateAbbr(state) as string] : null)
    const { data: blsData, error: blsError } = await fetchBlsSignals(stateFips)

    const { data: cityRow, error: cityErr } = await admin.from('cities').upsert({
      city,
      state,
      market_type: 'Suburb',
      population: censusData?.total_population ?? null,
      median_income: censusData?.median_household_income ?? null,
      children_pct: censusData?.children_5_12_pct ?? null,
      last_scraped_at: startedAt,
      notes: 'SOW metric coverage refresh',
    }, { onConflict: 'city,state' }).select('id').single()
    if (cityErr || !cityRow) return json({ error: 'Failed to upsert city', detail: cityErr?.message }, 500)
    const cityId = cityRow.id as string

    const { data: latestJobRows } = await admin
      .from('city_fetch_jobs')
      .select('*')
      .eq('city_id', cityId)
      .order('created_at', { ascending: false })
      .limit(1)
    const existingCounts = (latestJobRows?.[0]?.response_summary?.counts ?? {}) as Record<string, number>
    const existingWarnings = (latestJobRows?.[0]?.response_summary?.warnings ?? {}) as Record<string, unknown>

    const signals = buildSowSignals({ census: censusData, bls: blsData, existingCounts, existingWarnings })

    await admin.from('city_market_signals').delete().eq('city_id', cityId)
    const rows = signals.map((s) => ({
      city_id: cityId,
      signal_key: s.signal_key,
      label: s.label,
      value: String(s.value ?? 'Not available yet'),
      delta: s.status,
      delta_type: s.status === 'live' ? 'positive' : s.status === 'proxy' ? 'neutral' : 'negative',
      source: s.source,
      source_url: s.source_url ?? null,
      confidence: s.confidence,
      raw_data: {
        ...(s.raw_data ?? {}),
        status: s.status,
        metric_category: s.metric_category,
        used_in_score: s.used_in_score,
        notes: s.notes ?? null,
      },
    }))
    const { error: insertErr } = await admin.from('city_market_signals').insert(rows)
    if (insertErr) return json({ error: 'Failed to insert SOW metric signals', detail: insertErr.message }, 500)

    const completedAt = new Date().toISOString()
    const warnings = { census: censusError, bls: blsError }
    const { data: jobRow } = await admin.from('city_fetch_jobs').insert({
      city_id: cityId,
      city,
      state,
      source: 'sow_metric_coverage',
      status: Object.values(warnings).some(Boolean) ? 'completed_with_warnings' : 'completed',
      started_at: startedAt,
      completed_at: completedAt,
      response_summary: {
        mode: 'sow_full_metric_coverage',
        counts: {
          total_sow_metrics: rows.length,
          live: signals.filter((s) => s.status === 'live').length,
          proxy: signals.filter((s) => s.status === 'proxy').length,
          missing: signals.filter((s) => s.status === 'missing').length,
          blocked: signals.filter((s) => s.status === 'blocked').length,
          manual: signals.filter((s) => s.status === 'manual').length,
        },
        warnings,
      },
    }).select('id').single()

    return json({
      ok: true,
      mode: 'sow_full_metric_coverage',
      city_id: cityId,
      inserted: { signals: rows.length, job_id: jobRow?.id ?? null },
      warnings,
      coverage: {
        live: signals.filter((s) => s.status === 'live').length,
        proxy: signals.filter((s) => s.status === 'proxy').length,
        missing: signals.filter((s) => s.status === 'missing').length,
      },
    })
  } catch (e) {
    return json({ error: 'Unexpected error', detail: (e as Error).message }, 500)
  }
})
