// Shared sprint-metric fetchers used by fetch-city-market-data-sow.
// Computes the 6 sprint metrics the SOW function previously only emitted as
// `missingSignal(...)` placeholders:
//   - young_family_growth_rate (Census ACS B11005, 2022 vs 2017)
//   - dual_income_household_pct (Census ACS B23007)
//   - commute_sprawl_index (Census ACS B08303, 45+ min)
//   - google_search_demand_summer_camp / _day_camp (Apify Google Trends)
//   - waitlist_sold_out_signal_count (Firecrawl scrape over competitor URLs)

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

export type CensusSprintMetrics = {
  young_family_growth_rate_pct: number | null   // % change households w/ kids 2017→2024
  // % Dual-Income Households — share of ALL families with own children under 18
  // that are married-couple families where the husband is in the labor force
  // (employed/AF) AND the wife is in the labor force. Single-parent families
  // remain in the denominator by design. Numerator is B23007_006E ONLY.
  dual_income_household_pct: number | null
  commute_sprawl_index_pct: number | null        // (B08303_011..013) / B08303_001 * 100
  hh_kids_2024: number | null
  hh_kids_2017: number | null
  families_with_kids: number | null              // B23007_002E — all family types w/ own children <18
  dual_income: number | null                     // B23007_006E — married, husband LF employed, wife LF
  commute_total: number | null
  long_commute: number | null
  state_fips: string | null
  place_fips: string | null
  source_url: string | null
}

export async function fetchCensusSprintMetrics(
  city: string,
  state: string,
  precomputedPlaceFips?: string | null,
  precomputedStateFips?: string | null,
): Promise<{ data: CensusSprintMetrics | null; error: string | null }> {
  const key = Deno.env.get('CENSUS_API_KEY')
  if (!key) return { data: null, error: 'CENSUS_API_KEY missing' }
  const abbr = resolveStateAbbr(state)
  if (!abbr) return { data: null, error: `Unknown state: ${state}` }
  const stateFips = precomputedStateFips ?? STATE_FIPS[abbr]

  try {
    let placeFips = precomputedPlaceFips ?? null
    if (!placeFips) {
      const placeListUrl = `https://api.census.gov/data/2024/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}&key=${key}`
      const listRes = await fetch(placeListUrl)
      if (!listRes.ok) return { data: null, error: `Census place list ${listRes.status}` }
      const listData = await listRes.json() as string[][]
      const target = city.toLowerCase().trim()
      for (let i = 1; i < listData.length; i++) {
        const [name, , place] = listData[i]
        const nm = name.toLowerCase()
        if (nm.startsWith(target + ' city,') || nm.startsWith(target + ' town,') || nm.startsWith(target + ' cdp,') || nm.startsWith(target + ' village,') || nm.startsWith(target + ' ')) {
          placeFips = place
          break
        }
      }
      if (!placeFips) return { data: null, error: `Place not found: ${city}, ${abbr}` }
    }

    const vars = [
      'B11005_002E', // 0  households with people under 18 (2024)
      // ---- % Dual-Income Households, ACS B23007 (2024 5-year) ----
      // Denominator — top-level "with own children under 18" across ALL family
      // types (married-couple + single-parent), so single-parent families
      // remain in the denominator by design:
      'B23007_002E', // 1  Total: With own children under 18 years:
      // Numerator — married-couple family with own children under 18 where the
      // husband is in the labor force (employed/AF) AND the wife is in the
      // labor force. This is the "true dual-earner married" cell.
      'B23007_006E', // 2  ...Opposite-sex married-couple family: Husband in LF: Employed/AF: Wife in LF:
      'B08303_001E', // 3  commute total workers
      'B08303_011E', // 4  commute 45-59 min
      'B08303_012E', // 5  commute 60-89 min
      'B08303_013E', // 6  commute 90+ min
    ]
    const dataUrl = `https://api.census.gov/data/2024/acs/acs5?get=${vars.join(',')}&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
    const dataRes = await fetch(dataUrl)
    if (!dataRes.ok) {
      const body = await dataRes.text().catch(() => '')
      return { data: null, error: `Census ACS sprint ${dataRes.status}: ${body.slice(0, 200)}` }
    }
    const arr = await dataRes.json() as string[][]
    const row = arr?.[1]
    if (!row) return { data: null, error: `Census ACS sprint: empty row for place ${placeFips} state ${stateFips}` }
    const num = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null }
    const hhKids2024 = num(row[0])
    const familiesWithKids = num(row[1])       // B23007_002E — denominator
    const dualIncome = num(row[2])             // B23007_006E — numerator (husband LF employed, wife LF)
    const commuteTotal = num(row[3])
    const longCommute = (num(row[4]) ?? 0) + (num(row[5]) ?? 0) + (num(row[6]) ?? 0)
    console.log('[fetchCensusSprintMetrics]', { city, state, placeFips, stateFips, hhKids2024, familiesWithKids, dualIncome, commuteTotal, longCommute })

    let hhKids2017: number | null = null
    try {
      const url2017 = `https://api.census.gov/data/2017/acs/acs5?get=B11005_002E&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
      const r2017 = await fetch(url2017)
      if (r2017.ok) {
        const a2017 = await r2017.json() as string[][]
        hhKids2017 = num(a2017?.[1]?.[0] ?? '')
      }
    } catch (_) { /* non-fatal */ }

    const youngFamiliesGrowth = (hhKids2024 != null && hhKids2017 != null && hhKids2017 > 0)
      ? Math.round(((hhKids2024 - hhKids2017) / hhKids2017) * 1000) / 10
      : null
    // pctDualIncome = (married, husband LF employed, wife LF) / (all families with own children <18)
    // Realistic range nationally is roughly 40–60%. Anything outside 10–75%
    // gets a warning so a hierarchy-level bug can't silently ship again.
    const dualIncomePct = (familiesWithKids != null && familiesWithKids > 0 && dualIncome != null && dualIncome > 0)
      ? Math.round((dualIncome / familiesWithKids) * 1000) / 10
      : null
    if (dualIncomePct != null && (dualIncomePct > 75 || dualIncomePct < 10)) {
      console.warn('[fetchCensusSprintMetrics] dual_income_household_pct out of expected 10–75 band', {
        city, state, dualIncomePct, dualIncome, familiesWithKids,
      })
    }
    const commuteSprawlPct = (commuteTotal != null && commuteTotal > 0)
      ? Math.round((longCommute / commuteTotal) * 1000) / 10
      : null

    return {
      data: {
        young_family_growth_rate_pct: youngFamiliesGrowth,
        dual_income_household_pct: dualIncomePct,
        commute_sprawl_index_pct: commuteSprawlPct,
        hh_kids_2024: hhKids2024,
        hh_kids_2017: hhKids2017,
        families_with_kids: familiesWithKids,
        dual_income: dualIncome,
        commute_total: commuteTotal,
        long_commute: longCommute,
        state_fips: stateFips,
        place_fips: placeFips,
        source_url: `https://api.census.gov/data/2024/acs/acs5?get=NAME&for=place:${placeFips}&in=state:${stateFips}`,
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
}

// ---- Google Trends via Apify (emastra/google-trends-scraper) ----
function normalizeActorId(actorId: string) {
  return actorId.includes('/') ? actorId.replace('/', '~') : actorId
}

export async function fetchGoogleTrends(city: string, state: string) {
  const token = Deno.env.get('APIFY_API_TOKEN')
  if (!token) return { city_camp: null as number | null, generic_camp: null as number | null, error: null as string | null }
  const actorId = normalizeActorId('emastra/google-trends-scraper')
  const cityKw = `summer camp ${city}`
  const genericKw = 'summer day camp'
  // emastra/google-trends-scraper rejects 'today 12-m'; the actor's schema
  // requires one of the short codes (e.g. 'today 1-m', 'today 3-m').
  // Use 'today 3-m' for stable seasonal signal without the 400.
  const payload = { searchTerms: [cityKw, genericKw], geo: 'US', timeRange: 'today 3-m', category: 0 }
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=120`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => [])
    if (!res.ok) return { city_camp: null, generic_camp: null, error: `Apify Trends ${res.status}: ${JSON.stringify(data).slice(0, 200)}` }
    const items: any[] = Array.isArray(data) ? data : []
    const avgFor = (term: string): number | null => {
      const matches = items.filter((it) => {
        const t = (it?.searchTerm ?? it?.keyword ?? it?.term ?? '').toString().toLowerCase()
        return t === term.toLowerCase()
      })
      if (matches.length === 0) return null
      const values: number[] = []
      for (const m of matches) {
        const series = m?.interestOverTime ?? m?.data ?? m?.timelineData ?? []
        if (Array.isArray(series)) {
          for (const pt of series) {
            const v = Number(pt?.value ?? pt?.interest ?? pt?.score)
            if (Number.isFinite(v)) values.push(v)
          }
        } else if (typeof m?.value === 'number') {
          values.push(m.value)
        }
      }
      if (values.length === 0) return null
      return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
    }
    return { city_camp: avgFor(cityKw), generic_camp: avgFor(genericKw), error: null as string | null }
  } catch (e) {
    return { city_camp: null, generic_camp: null, error: (e as Error).message }
  }
}

// ---- Firecrawl competitor signals scraper (cap 5 URLs) ----
// Single Firecrawl pass per URL extracts:
//   - waitlist / sold-out flags
//   - weekly tuition prices ($x/week, $x per week)
//   - hours-per-week (only used if a weekly price exists on same page → hourly)
//   - national brand mentions (KidStrong, Bricks4Kidz, etc.)
//   - school-hosted flags ("school hosts", "hosted at ... school", "elementary school camp")
// Per spec: hourly is only emitted as live when BOTH price AND hours found.

export type CompetitorSignals = {
  scanned: number
  // waitlist / sold-out
  waitlist: number
  soldout: number
  // pricing
  weekly_prices: number[]      // every $x/week match across pages
  premium_prices: number[]     // weekly prices > $400
  hourly_rates: number[]       // only when same page had price + hours
  // landscape
  brand_count: number          // distinct national brands found across pages
  brands_found: string[]
  school_hosted_pages: number  // pages that triggered school-hosted flag
  error: string | null
}

const NATIONAL_BRANDS = [
  'KidStrong', 'Bricks 4 Kidz', 'Bricks4Kidz', 'Mad Science',
  'Code Ninjas', 'iD Tech', 'Galileo', 'Camp Invention', 'Snapology',
]

// ---- Firecrawl URL discovery: find actual camp pricing pages for a city ----
// Uses Firecrawl /v2/search (web search) with pricing-intent queries, then
// filters out junk hosts (google maps, social, directories) so we only feed
// real camp/program pages into the scraper. Returns up to `limit` URLs.
const URL_HOST_BLOCKLIST = [
  'google.com', 'maps.google.', 'goo.gl', 'g.page',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
  'yelp.com', 'tripadvisor.', 'reddit.com', 'youtube.com',
  'eventbrite.com', 'meetup.com', 'pinterest.',
  'wikipedia.org', 'linkedin.com',
]
function isUsefulCampUrl(u: string): boolean {
  try {
    const url = new URL(u)
    const host = url.hostname.toLowerCase()
    if (URL_HOST_BLOCKLIST.some((b) => host.includes(b))) return false
    return /^https?:$/.test(url.protocol)
  } catch { return false }
}

export async function findCampPricingUrls(
  city: string,
  state: string,
  limit = 8,
): Promise<{ urls: string[]; source: 'firecrawl_search' | 'none'; error: string | null }> {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return { urls: [], source: 'none', error: 'FIRECRAWL_API_KEY not set' }
  const queries = [
    `summer camp tuition price ${city} ${state}`,
    `kids STEM camp registration cost ${city} ${state}`,
    `summer day camp weekly rate ${city} ${state}`,
  ]
  const found = new Set<string>()
  const errs: string[] = []
  for (const q of queries) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v2/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: q, limit: 10 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { errs.push(`Firecrawl search ${res.status}: ${q}`); continue }
      // v2 search response: { success, data: { web: [{ url, title, description }] } } or { data: [...] }
      const results: any[] =
        (Array.isArray(data?.data?.web) && data.data.web) ||
        (Array.isArray(data?.data) && data.data) ||
        (Array.isArray(data?.web) && data.web) ||
        []
      for (const r of results) {
        const u = (r?.url ?? r?.link ?? '') as string
        if (u && isUsefulCampUrl(u)) found.add(u)
        if (found.size >= limit) break
      }
      if (found.size >= limit) break
    } catch (e) { errs.push((e as Error).message) }
  }
  return {
    urls: Array.from(found).slice(0, limit),
    source: found.size > 0 ? 'firecrawl_search' : 'none',
    error: errs.length ? errs.join(' | ') : null,
  }
}

export async function fetchCompetitorWaitlistSignals(urls: string[]): Promise<CompetitorSignals> {
  const empty: CompetitorSignals = {
    scanned: 0, waitlist: 0, soldout: 0,
    weekly_prices: [], premium_prices: [], hourly_rates: [],
    brand_count: 0, brands_found: [], school_hosted_pages: 0, error: null,
  }
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return empty
  const targets = urls.filter((u) => /^https?:\/\//.test(u)).slice(0, 5)
  if (targets.length === 0) return empty

  const WAITLIST_RE = /waitlist|wait list|join the wait|notify me when/i
  const SOLDOUT_RE = /sold out|fully booked|registration closed|session full|class full|enrollment closed/i
  // Weekly price patterns: $250/week, $250 / week, $250 per week, $1,200/wk
  const WEEKLY_PRICE_RE = /\$\s?(\d{2,4}(?:,\d{3})?)\s*(?:\/|per)\s*(?:week|wk)\b/gi
  // Hours patterns: "30 hours/week", "30 hours per week", "full day" (=8h), "half day" (=4h)
  const HOURS_RE = /(\d{1,2})\s*hours?\s*(?:\/|per)\s*week\b/i
  const FULL_DAY_RE = /full[- ]day\b/i
  const HALF_DAY_RE = /half[- ]day\b/i
  // School-hosted flags
  const SCHOOL_RE = /school hosts|hosted at [a-z][\w .'-]*?\b(?:elementary|school)\b|elementary school camp|hosted by [a-z][\w .'-]*?\b(?:isd|school district|elementary)\b/i

  const brandsSet = new Set<string>()
  const out: CompetitorSignals = { ...empty, scanned: targets.length, weekly_prices: [], premium_prices: [], hourly_rates: [], brands_found: [] }
  const errs: string[] = []

  await Promise.all(targets.map(async (url) => {
    try {
      const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { errs.push(`Firecrawl ${res.status} ${url}`); return }
      const md: string = (data?.data?.markdown ?? data?.markdown ?? '') as string
      if (!md) return
      if (WAITLIST_RE.test(md)) out.waitlist++
      if (SOLDOUT_RE.test(md)) out.soldout++

      // Pricing extraction — two passes:
      //  1. strict $X/week, $X per week, $X weekly, $X/wk
      //  2. proximity: any "$NNN" within 40 chars of week|wk|weekly|tuition|per session
      const pagePrices: number[] = []
      const seenPositions = new Set<number>()
      const STRICT_RE = /\$\s?(\d{2,4}(?:,\d{3})?)\s*(?:\/|per|-)?\s*(?:week|wk|weekly)\b/gi
      let m: RegExpExecArray | null
      STRICT_RE.lastIndex = 0
      while ((m = STRICT_RE.exec(md)) !== null) {
        const n = Number(m[1].replace(/,/g, ''))
        if (Number.isFinite(n) && n >= 50 && n <= 5000) {
          pagePrices.push(n)
          seenPositions.add(m.index)
        }
      }
      // Proximity pass: find any "$NNN[NN]" then check ±40 chars for week/tuition/session
      const PRICE_RE = /\$\s?(\d{2,4}(?:,\d{3})?)/g
      const CONTEXT_RE = /(week|wk|weekly|tuition|per session|per camper|registration)/i
      let pm: RegExpExecArray | null
      PRICE_RE.lastIndex = 0
      while ((pm = PRICE_RE.exec(md)) !== null) {
        if (seenPositions.has(pm.index)) continue
        const n = Number(pm[1].replace(/,/g, ''))
        if (!Number.isFinite(n) || n < 100 || n > 5000) continue
        const start = Math.max(0, pm.index - 40)
        const end = Math.min(md.length, pm.index + pm[0].length + 40)
        if (CONTEXT_RE.test(md.slice(start, end))) {
          pagePrices.push(n)
        }
      }
      for (const p of pagePrices) {
        out.weekly_prices.push(p)
        if (p > 400) out.premium_prices.push(p)
      }

      // Hours — only used if same page had at least one price
      if (pagePrices.length > 0) {
        let hours: number | null = null
        const hm = HOURS_RE.exec(md)
        if (hm) {
          const h = Number(hm[1])
          if (Number.isFinite(h) && h >= 1 && h <= 80) hours = h
        } else if (FULL_DAY_RE.test(md)) {
          hours = 40 // 5 × 8h
        } else if (HALF_DAY_RE.test(md)) {
          hours = 20 // 5 × 4h
        }
        if (hours != null && hours > 0) {
          for (const p of pagePrices) {
            const rate = p / hours
            if (Number.isFinite(rate) && rate >= 1 && rate <= 200) out.hourly_rates.push(rate)
          }
        }
      }

      // Brand detection
      for (const brand of NATIONAL_BRANDS) {
        const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i')
        if (re.test(md)) brandsSet.add(brand.replace(/\s+/g, ''))
      }

      // School-hosted
      if (SCHOOL_RE.test(md)) out.school_hosted_pages++
    } catch (e) { errs.push((e as Error).message) }
  }))

  out.brands_found = Array.from(brandsSet).sort()
  out.brand_count = out.brands_found.length
  out.error = errs.length ? errs.join(' | ') : null
  return out
}

// ---- NOAA / Open-Meteo climate fetcher (Archive API) ----
// Returns 5-year-averaged summer climate metrics for the given centroid.
// Per spec: if no usable station within 50 miles, return status 'missing' (never throw, never null+error).
// Open-Meteo's gridded reanalysis (ERA5) covers the entire US at ~10km resolution,
// so the 50-mile fallback is enforced via coordinate sanity (must be within US bbox)
// and via verifying the API actually returns daily series. If empty -> missing.
export type NoaaClimateMetrics = {
  summer_weather_index: number | null    // 0-100 comfort score
  avg_peak_summer_temperature_f: number | null
  days_above_100f_per_year: number | null
  outdoor_camp_days_per_year: number | null
  years_sampled: number
  source_url: string | null
  status: 'live' | 'missing'
}

export async function fetchNoaaClimateMetrics(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Promise<{ data: NoaaClimateMetrics; error: string | null }> {
  const empty: NoaaClimateMetrics = {
    summer_weather_index: null,
    avg_peak_summer_temperature_f: null,
    days_above_100f_per_year: null,
    outdoor_camp_days_per_year: null,
    years_sampled: 0,
    source_url: null,
    status: 'missing',
  }
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { data: empty, error: 'No city centroid available (no coordinates within 50 miles).' }
  }
  // Continental US bbox + Alaska/Hawaii rough bounds. Outside → no station within 50 miles.
  const inUS = (lat >= 18 && lat <= 72 && lng >= -180 && lng <= -65)
  if (!inUS) return { data: empty, error: `Coordinates ${lat},${lng} outside US — no station within 50 miles.` }

  const now = new Date()
  const endYear = now.getFullYear() - 1 // last full year
  const startYear = endYear - 4         // 5-year window
  const startDate = `${startYear}-06-01`
  const endDate = `${endYear}-08-31`
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { data: empty, error: `Open-Meteo ${res.status}: ${body.slice(0, 160)}` }
    }
    const body = await res.json() as any
    const dates: string[] = body?.daily?.time ?? []
    const tmax: number[] = body?.daily?.temperature_2m_max ?? []
    const tmin: number[] = body?.daily?.temperature_2m_min ?? []
    const precip: number[] = body?.daily?.precipitation_sum ?? []
    if (!dates.length || !tmax.length) return { data: empty, error: 'Open-Meteo returned no daily series.' }

    // Filter to summer months only (Jun/Jul/Aug)
    let summerDays = 0, hot100 = 0, outdoorOk = 0
    let sumMax = 0, sumComfortPenalty = 0
    for (let i = 0; i < dates.length; i++) {
      const m = Number(dates[i].slice(5, 7))
      if (m < 6 || m > 8) continue
      const hi = tmax[i], lo = tmin[i], pr = precip[i] ?? 0
      if (!Number.isFinite(hi)) continue
      summerDays++
      sumMax += hi
      if (hi >= 100) hot100++
      if (hi <= 95 && pr < 0.25) outdoorOk++
      // Comfort penalty: each degree above 85 or below 65 hurts; rain hurts.
      const overheat = Math.max(0, hi - 85)
      const cold = Math.max(0, 65 - (Number.isFinite(lo) ? lo : hi))
      const wet = pr >= 0.25 ? 5 : 0
      sumComfortPenalty += overheat * 1.5 + cold * 1 + wet
    }
    if (summerDays === 0) return { data: empty, error: 'Open-Meteo returned no summer days in window.' }
    const yearsSampled = endYear - startYear + 1
    const avgPeak = Math.round((sumMax / summerDays) * 10) / 10
    const hot100PerYear = Math.round((hot100 / yearsSampled) * 10) / 10
    const outdoorPerYear = Math.round((outdoorOk / yearsSampled) * 10) / 10
    // Comfort index 0-100: lower penalty = higher score. Empirically penalty/day in [0..30].
    const avgPenalty = sumComfortPenalty / summerDays
    const comfort = Math.max(0, Math.min(100, Math.round(100 - avgPenalty * 4)))

    return {
      data: {
        summer_weather_index: comfort,
        avg_peak_summer_temperature_f: avgPeak,
        days_above_100f_per_year: hot100PerYear,
        outdoor_camp_days_per_year: outdoorPerYear,
        years_sampled: yearsSampled,
        source_url: 'https://open-meteo.com/en/docs/historical-weather-api',
        status: 'live',
      },
      error: null,
    }
  } catch (e) {
    return { data: empty, error: (e as Error).message }
  }
}

// ---- BEA Regional Price Parity (state-level, table SARPP) ----
// Uses BEA Regional API (free, requires UserID = BEA_API_KEY).
// Returns the "All items" RPP for the given state. National = 100.
const BEA_STATE_FIPS_TO_GEO: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [abbr, fips] of Object.entries(STATE_FIPS)) map[abbr] = `${fips}000`
  return map
})()

export async function fetchBeaRpp(state: string): Promise<{
  data: { rpp_all_items: number | null; year: number | null; geo_fips: string | null; source_url: string | null } | null
  error: string | null
}> {
  const key = Deno.env.get('BEA_API_KEY')
  if (!key) return { data: null, error: 'BEA_API_KEY missing' }
  const abbr = resolveStateAbbr(state)
  if (!abbr) return { data: null, error: `Unknown state: ${state}` }
  const geoFips = BEA_STATE_FIPS_TO_GEO[abbr]
  if (!geoFips) return { data: null, error: `No BEA geo for ${abbr}` }
  const url = `https://apps.bea.gov/api/data?UserID=${key}&method=GetData&datasetname=Regional` +
    `&TableName=SARPP&LineCode=1&GeoFips=${geoFips}&Year=LAST5&ResultFormat=JSON`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { data: null, error: `BEA HTTP ${res.status}: ${body.slice(0, 160)}` }
    }
    const body = await res.json() as any
    const results = body?.BEAAPI?.Results
    if (results?.Error) return { data: null, error: `BEA error: ${JSON.stringify(results.Error).slice(0, 160)}` }
    const data: any[] = results?.Data ?? []
    if (!data.length) return { data: null, error: 'BEA returned no data rows.' }
    // Pick the most recent year
    const sorted = [...data].sort((a, b) => Number(b.TimePeriod) - Number(a.TimePeriod))
    const latest = sorted[0]
    const value = Number(String(latest?.DataValue ?? '').replace(/,/g, ''))
    if (!Number.isFinite(value)) return { data: null, error: `BEA non-numeric value: ${latest?.DataValue}` }
    return {
      data: {
        rpp_all_items: Math.round(value * 10) / 10,
        year: Number(latest.TimePeriod) || null,
        geo_fips: geoFips,
        source_url: `https://apps.bea.gov/itable/?ReqID=70&step=1`,
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
}

// ─────────── NCES CCD: elementary teacher staffing ───────────
// Pulls a single state-wide CCD elementary directory page (Urban Institute
// returns the full state in one response — query-param filters like
// city_location/lea_name are silently ignored upstream, so we filter locally).
//
// Outputs three metrics for the city:
//   - public_elementary_teacher_count        (sum teachers_fte across public, non-charter elementary)
//   - student_teacher_ratio_elementary       (enrollment / FTE, 1 decimal)
//   - private_charter_montessori_teacher_count
//       Currently only includes CHARTER FTE from CCD.
//       (Urban Institute does not expose a PSS endpoint; private + Montessori
//       breakdown is deferred. We still mark this 'live' when any CCD data is
//       returned for the city — value may be 0 if no charter elementaries.)
//
// Returns status 'missing' when:
//   - state is unknown / not in 50-state map
//   - upstream API errors / timeout
//   - no rows matched the city locally

export type NcesElementaryStaffing = {
  status: 'live' | 'missing'
  public_elementary_teacher_count: number | null
  public_elementary_enrollment: number | null
  student_teacher_ratio_elementary: number | null
  private_charter_montessori_teacher_count: number | null
  charter_school_count: number | null
  schools_matched: number
  year: number
  source_url: string | null
  error: string | null
}

const CCD_YEAR = 2022
const CCD_BASE = `https://educationdata.urban.org/api/v1/schools/ccd/directory/${CCD_YEAR}/`

const normalizeCcdCity = (s: string) =>
  s.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()

export async function fetchNcesElementaryStaffing(
  city: string,
  state: string,
): Promise<NcesElementaryStaffing> {
  const missing = (error: string | null): NcesElementaryStaffing => ({
    status: 'missing',
    public_elementary_teacher_count: null,
    public_elementary_enrollment: null,
    student_teacher_ratio_elementary: null,
    private_charter_montessori_teacher_count: null,
    charter_school_count: null,
    schools_matched: 0,
    year: CCD_YEAR,
    source_url: null,
    error,
  })

  const abbr = resolveStateAbbr(state)
  if (!abbr) return missing(`Unknown state: ${state}`)
  const fips = STATE_FIPS[abbr]
  if (!fips) return missing(`No FIPS for ${abbr}`)

  const url = `${CCD_BASE}?fips=${fips}&school_level=1`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  let body: any
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return missing(`CCD HTTP ${res.status}`)
    body = await res.json()
  } catch (e) {
    return missing(`CCD fetch failed: ${(e as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }

  const rows: any[] = Array.isArray(body?.results) ? body.results : []
  if (!rows.length) return missing('CCD returned no rows')

  const target = normalizeCcdCity(city)
  let publicFte = 0
  let publicEnroll = 0
  let charterFte = 0
  let charterCount = 0
  let matched = 0
  for (const r of rows) {
    const c = r?.city_location ? normalizeCcdCity(String(r.city_location)) : ''
    if (c !== target) continue
    matched += 1
    const fte = typeof r.teachers_fte === 'number' && r.teachers_fte > 0 ? r.teachers_fte : 0
    const enr = typeof r.enrollment === 'number' && r.enrollment > 0 ? r.enrollment : 0
    if (r.charter === 1) {
      charterFte += fte
      charterCount += 1
    } else {
      publicFte += fte
    }
    publicEnroll += enr
  }

  if (matched === 0) return missing(`No CCD elementary schools matched city "${city}"`)

  const ratio = publicFte > 0 ? Math.round((publicEnroll / publicFte) * 10) / 10 : null

  return {
    status: 'live',
    public_elementary_teacher_count: publicFte > 0 ? Math.round(publicFte) : 0,
    public_elementary_enrollment: publicEnroll,
    student_teacher_ratio_elementary: ratio,
    private_charter_montessori_teacher_count: Math.round(charterFte),
    charter_school_count: charterCount,
    schools_matched: matched,
    year: CCD_YEAR,
    source_url: url,
    error: null,
  }
}

// =============================================================================
// Day 4: BLS OEWS wages — metro→state→national fallback per SOC.
// Single batched HTTP request (≤1 BLS call per city refresh).
// =============================================================================

// OEWS metro area codes are the 5-digit CBSA, zero-padded to 7.
// Keyed by lowercased substring match against city's metro_area string.
const OEWS_MSA_CODES: Record<string, { code: string; label: string }> = {
  'dallas-fort worth':       { code: '0019100', label: 'Dallas-Fort Worth-Arlington, TX' },
  'dallas':                  { code: '0019100', label: 'Dallas-Fort Worth-Arlington, TX' },
  'houston':                 { code: '0026420', label: 'Houston-The Woodlands-Sugar Land, TX' },
  'austin':                  { code: '0012420', label: 'Austin-Round Rock-Georgetown, TX' },
  'san antonio':             { code: '0041700', label: 'San Antonio-New Braunfels, TX' },
  'new york':                { code: '0035620', label: 'New York-Newark-Jersey City, NY-NJ-PA' },
  'los angeles':             { code: '0031080', label: 'Los Angeles-Long Beach-Anaheim, CA' },
  'chicago':                 { code: '0016980', label: 'Chicago-Naperville-Elgin, IL-IN-WI' },
  'phoenix':                 { code: '0038060', label: 'Phoenix-Mesa-Chandler, AZ' },
  'philadelphia':            { code: '0037980', label: 'Philadelphia-Camden-Wilmington, PA-NJ-DE-MD' },
  'atlanta':                 { code: '0012060', label: 'Atlanta-Sandy Springs-Alpharetta, GA' },
  'boston':                  { code: '0014460', label: 'Boston-Cambridge-Newton, MA-NH' },
  'miami':                   { code: '0033100', label: 'Miami-Fort Lauderdale-Pompano Beach, FL' },
  'washington':              { code: '0047900', label: 'Washington-Arlington-Alexandria, DC-VA-MD-WV' },
  'seattle':                 { code: '0042660', label: 'Seattle-Tacoma-Bellevue, WA' },
  'denver':                  { code: '0019740', label: 'Denver-Aurora-Lakewood, CO' },
  'minneapolis':             { code: '0033460', label: 'Minneapolis-St. Paul-Bloomington, MN-WI' },
  'tampa':                   { code: '0045300', label: 'Tampa-St. Petersburg-Clearwater, FL' },
  'orlando':                 { code: '0036740', label: 'Orlando-Kissimmee-Sanford, FL' },
  'detroit':                 { code: '0019820', label: 'Detroit-Warren-Dearborn, MI' },
  'st. louis':               { code: '0041180', label: 'St. Louis, MO-IL' },
  'st louis':                { code: '0041180', label: 'St. Louis, MO-IL' },
  'charlotte':               { code: '0016740', label: 'Charlotte-Concord-Gastonia, NC-SC' },
  'raleigh':                 { code: '0039580', label: 'Raleigh-Cary, NC' },
  'portland':                { code: '0038900', label: 'Portland-Vancouver-Hillsboro, OR-WA' },
  'san diego':               { code: '0041740', label: 'San Diego-Chula Vista-Carlsbad, CA' },
  'san francisco':           { code: '0041860', label: 'San Francisco-Oakland-Berkeley, CA' },
  'san jose':                { code: '0041940', label: 'San Jose-Sunnyvale-Santa Clara, CA' },
  'sacramento':              { code: '0040900', label: 'Sacramento-Roseville-Folsom, CA' },
  'nashville':               { code: '0034980', label: 'Nashville-Davidson--Murfreesboro--Franklin, TN' },
  'columbus':                { code: '0018140', label: 'Columbus, OH' },
  'indianapolis':            { code: '0026900', label: 'Indianapolis-Carmel-Anderson, IN' },
  'pittsburgh':              { code: '0038300', label: 'Pittsburgh, PA' },
  'kansas city':             { code: '0028140', label: 'Kansas City, MO-KS' },
  'las vegas':               { code: '0029820', label: 'Las Vegas-Henderson-Paradise, NV' },
  'salt lake city':          { code: '0041620', label: 'Salt Lake City, UT' },
  'cincinnati':              { code: '0017140', label: 'Cincinnati, OH-KY-IN' },
  'cleveland':               { code: '0017460', label: 'Cleveland-Elyria, OH' },
  'baltimore':               { code: '0012580', label: 'Baltimore-Columbia-Towson, MD' },
}

function resolveMsa(metroArea: string | null | undefined, city: string, state: string): { code: string; label: string } | null {
  const candidates = [metroArea, `${city}, ${state}`, city].filter(Boolean) as string[]
  for (const c of candidates) {
    const lc = c.toLowerCase()
    for (const key of Object.keys(OEWS_MSA_CODES)) {
      if (lc.includes(key)) return OEWS_MSA_CODES[key]
    }
  }
  return null
}

export type BlsOewsTier = 'metro' | 'state' | 'national'
export type BlsOewsMetric = {
  value: number | null
  tier: BlsOewsTier | null
  area_code: string | null
  area_label: string | null
  series_id: string | null
}
export type BlsOewsResult = {
  teacher_annual: BlsOewsMetric           // SOC 25-2021, datatype 04 (annual mean)
  childcare_hourly: BlsOewsMetric         // SOC 39-9011, datatype 03 (hourly mean)
  source_url: string | null
  error: string | null
}

const EMPTY_METRIC: BlsOewsMetric = { value: null, tier: null, area_code: null, area_label: null, series_id: null }

export async function fetchBlsOewsWages(
  stateAbbr: string | null,
  metroArea: string | null,
  city: string,
  state: string,
): Promise<BlsOewsResult> {
  const key = Deno.env.get('BLS_API_KEY')
  if (!key) return { teacher_annual: EMPTY_METRIC, childcare_hourly: EMPTY_METRIC, source_url: null, error: 'BLS_API_KEY missing' }

  const abbr = stateAbbr ?? resolveStateAbbr(state)
  const stateFips = abbr ? STATE_FIPS[abbr] ?? null : null
  const msa = resolveMsa(metroArea, city, state)

  const SOC = { teacher: '252021', childcare: '399011' } as const
  const DT  = { teacher: '04',     childcare: '03'     } as const  // annual / hourly mean

  type SeriesPlan = { id: string; tier: BlsOewsTier; area_code: string; area_label: string; soc: 'teacher' | 'childcare' }
  const plans: SeriesPlan[] = []
  const push = (soc: 'teacher' | 'childcare', tier: BlsOewsTier, area_code: string, area_label: string) => {
    const id = `OEU${tier === 'metro' ? 'M' : tier === 'state' ? 'S' : 'N'}${area_code}000000${SOC[soc]}${DT[soc]}`
    plans.push({ id, tier, area_code, area_label, soc })
  }
  for (const soc of ['teacher', 'childcare'] as const) {
    if (msa) push(soc, 'metro', msa.code, msa.label)
    if (stateFips) push(soc, 'state', stateFips.padEnd(7, '0'), `${abbr} statewide`)
    push(soc, 'national', '0000000', 'United States')
  }

  if (plans.length === 0) {
    return { teacher_annual: EMPTY_METRIC, childcare_hourly: EMPTY_METRIC, source_url: null, error: 'No series IDs constructible (missing state + metro)' }
  }

  try {
    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesid: plans.map(p => p.id), registrationkey: key }),
    })
    if (!res.ok) return { teacher_annual: EMPTY_METRIC, childcare_hourly: EMPTY_METRIC, source_url: null, error: `BLS HTTP ${res.status}` }
    const body = await res.json().catch(() => ({}))
    if (body?.status !== 'REQUEST_SUCCEEDED') {
      return { teacher_annual: EMPTY_METRIC, childcare_hourly: EMPTY_METRIC, source_url: null, error: `BLS ${body?.status ?? 'unknown'}: ${(body?.message ?? []).join(' | ')}` }
    }
    const series: any[] = Array.isArray(body?.Results?.series) ? body.Results.series : []
    const valueOf = (sid: string): number | null => {
      const s = series.find((x: any) => x?.seriesID === sid)
      const n = Number(s?.data?.[0]?.value)
      return Number.isFinite(n) && n > 0 ? n : null
    }

    // Pick best tier per SOC: metro > state > national.
    const pick = (soc: 'teacher' | 'childcare'): BlsOewsMetric => {
      const ranked = plans.filter(p => p.soc === soc)  // already in metro→state→national order
      for (const p of ranked) {
        const v = valueOf(p.id)
        if (v != null) return { value: v, tier: p.tier, area_code: p.area_code, area_label: p.area_label, series_id: p.id }
      }
      return EMPTY_METRIC
    }

    const teacher_annual = pick('teacher')
    const childcare_hourly = pick('childcare')
    const ref = teacher_annual.series_id ?? childcare_hourly.series_id
    return {
      teacher_annual,
      childcare_hourly,
      source_url: ref ? `https://beta.bls.gov/dataViewer/view/timeseries/${ref}` : null,
      error: null,
    }
  } catch (e) {
    return { teacher_annual: EMPTY_METRIC, childcare_hourly: EMPTY_METRIC, source_url: null, error: (e as Error).message }
  }
}

// ─────────── Affluent Families with Children (B19131) ───────────
// New Demand pillar sub-metric. See src/lib/affluentFamilies.ts for the
// client-side snap helper; this fetcher owns the server-side pull.
//
// Approach: fetch table B19131 with group() to get ALL columns for the city
// in one call. Then fetch the group's variable labels (metadata) once and
// use them to (a) identify columns that represent families WITH OWN
// CHILDREN UNDER 18 PRESENT and (b) extract the income bracket lower bound
// from each column label. Sum estimates across the qualifying columns whose
// bracket lower bound >= the snapped threshold.
//
// Nullable-safe: any failure returns { data: null, error }. The DB columns
// stay null for that city and the frontend scoring falls back to the old
// 4-metric Demand math automatically.

// PLACEHOLDER — must match src/lib/affluentFamilies.ts. Kept as a local copy
// because edge functions cannot import from `src/`.
const AFFLUENCE_THRESHOLD_BASE_EDGE = 150000
const B19131_BRACKET_BOUNDARIES_EDGE: number[] = [
  10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000,
  50000, 60000, 75000, 100000, 125000, 150000, 200000,
]

function snapToBracketEdge(effectiveThreshold: number): number {
  let best = B19131_BRACKET_BOUNDARIES_EDGE[0]
  let bestDist = Math.abs(effectiveThreshold - best)
  for (const b of B19131_BRACKET_BOUNDARIES_EDGE) {
    const d = Math.abs(effectiveThreshold - b)
    if (d < bestDist || (d === bestDist && b < best)) { best = b; bestDist = d }
  }
  return best
}

// Parse an ACS B19131 variable label into (has_own_children_under_18, bracket_lower_bound_dollars).
// Labels look like: "Estimate!!Total:!!Married-couple family:!!With own children under 18 years:!!$75,000 to $99,999"
// or                "Estimate!!Total:!!Married-couple family:!!No own children under 18 years:!!$200,000 or more"
function parseB19131Label(label: string): { hasOwnKids: boolean; bracketLower: number | null } {
  const l = label.toLowerCase()
  // Census phrasing is "With own children of the householder under 18 years".
  // Older years used "With own children under 18 years". Accept both, and
  // explicitly exclude the "No own children..." branch.
  const hasOwnKids = /with own children (?:of the householder )?under 18/.test(l)
    && !/no own children/.test(l)
  // Match dollar bracket at the end of the label.
  const m = label.match(/\$([\d,]+)(?:\s+to\s+\$[\d,]+)?(?:\s+or\s+more)?\s*$/i)
  if (!m) return { hasOwnKids, bracketLower: null }
  const lower = Number(m[1].replace(/,/g, ''))
  return { hasOwnKids, bracketLower: Number.isFinite(lower) ? lower : null }
}

// Cache the B19131 variable labels for the process lifetime — they don't change per city.
let _b19131VarCache: Record<string, string> | null = null
async function fetchB19131VariableLabels(year: number): Promise<Record<string, string>> {
  if (_b19131VarCache) return _b19131VarCache
  const url = `https://api.census.gov/data/${year}/acs/acs5/groups/B19131.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Census B19131 metadata HTTP ${res.status}`)
  const body = await res.json() as { variables: Record<string, { label: string }> }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(body.variables ?? {})) out[k] = v?.label ?? ''
  _b19131VarCache = out
  return out
}

export type AffluentFamiliesMetric = {
  affluent_families_count: number | null
  affluent_families_share: number | null       // 0..1
  affluent_families_snapped_bracket: number | null
  affluent_families_effective_threshold: number | null
  families_with_own_children_total: number | null
  rpp_used: number | null                       // null → threshold unadjusted
  source_url: string | null
  error: string | null
}

export async function fetchB19131AffluentFamilies(
  city: string,
  state: string,
  rpp: number | null,
  precomputedPlaceFips?: string | null,
  precomputedStateFips?: string | null,
  year = 2024,
): Promise<AffluentFamiliesMetric> {
  const empty: AffluentFamiliesMetric = {
    affluent_families_count: null,
    affluent_families_share: null,
    affluent_families_snapped_bracket: null,
    affluent_families_effective_threshold: null,
    families_with_own_children_total: null,
    rpp_used: rpp ?? null,
    source_url: null,
    error: null,
  }

  const key = Deno.env.get('CENSUS_API_KEY')
  if (!key) return { ...empty, error: 'CENSUS_API_KEY missing' }
  const abbr = resolveStateAbbr(state)
  if (!abbr) return { ...empty, error: `Unknown state: ${state}` }
  const stateFips = precomputedStateFips ?? STATE_FIPS[abbr]

  // Compute effective threshold + snap.
  const effective = rpp && Number.isFinite(rpp)
    ? Math.round(AFFLUENCE_THRESHOLD_BASE_EDGE * (rpp / 100))
    : AFFLUENCE_THRESHOLD_BASE_EDGE
  const snapped = snapToBracketEdge(effective)

  try {
    // Resolve place FIPS if not passed in.
    let placeFips = precomputedPlaceFips ?? null
    if (!placeFips) {
      const placeListUrl = `https://api.census.gov/data/${year}/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}&key=${key}`
      const listRes = await fetch(placeListUrl)
      if (!listRes.ok) return { ...empty, error: `Census place list ${listRes.status}` }
      const listData = await listRes.json() as string[][]
      const target = city.toLowerCase().trim()
      const header = listData[0]
      const placeIdx = header.indexOf('place')
      const nameIdx = header.indexOf('NAME')
      // Match strategies (in order):
      //   1. Whole-word prefix: name starts with `<target>` followed by a
      //      non-alphanumeric separator (space, comma, hyphen, slash). This
      //      catches "Indianapolis city (balance)", "Nashville-Davidson metropolitan…",
      //      "Louisville/Jefferson County…", "Schaumburg village", "Urban Honolulu CDP", etc.
      //   2. Parenthetical alias: name contains "(<target>)" — for renamed
      //      places like "San Buenaventura (Ventura) city".
      const sepRe = /[\s,\-\/]/
      let fallbackFips: string | null = null
      for (let i = 1; i < listData.length; i++) {
        const row = listData[i]
        const nm = row[nameIdx].toLowerCase()
        if (nm.startsWith(target)) {
          const nextCh = nm.charAt(target.length)
          if (nextCh === '' || sepRe.test(nextCh)) {
            placeFips = row[placeIdx]; break
          }
        }
        if (!fallbackFips && nm.includes(`(${target})`)) {
          fallbackFips = row[placeIdx]
        }
      }
      if (!placeFips && fallbackFips) placeFips = fallbackFips
      if (!placeFips) return { ...empty, error: `Place not found for ${city}, ${abbr}` }
    }

    // Pull ALL B19131 columns for this place with group().
    const dataUrl = `https://api.census.gov/data/${year}/acs/acs5?get=group(B19131)&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
    const [labels, dataRes] = await Promise.all([
      fetchB19131VariableLabels(year),
      fetch(dataUrl),
    ])
    if (!dataRes.ok) return { ...empty, error: `Census B19131 HTTP ${dataRes.status}` }
    const rows = await dataRes.json() as string[][]
    if (!rows || rows.length < 2) return { ...empty, error: 'Census B19131 returned no rows' }
    const header = rows[0]
    const values = rows[1]

    let totalFamiliesWithKids = 0
    let affluentCount = 0
    let anyColumnMatched = false

    for (let i = 0; i < header.length; i++) {
      const varId = header[i]
      // Only sum leaf estimate columns.
      if (!/^B19131_\d+E$/.test(varId)) continue
      const label = labels[varId]
      if (!label) continue
      const parsed = parseB19131Label(label)
      // The bracket-level rows (leaves) have a numeric bracket_lower.
      // Rollup rows like "With own children under 18 years:" have no bracket
      // and would otherwise double-count — skip them.
      if (parsed.bracketLower === null) continue
      if (!parsed.hasOwnKids) continue
      const est = Number(values[i])
      if (!Number.isFinite(est)) continue
      anyColumnMatched = true
      totalFamiliesWithKids += est
      if (parsed.bracketLower >= snapped) affluentCount += est
    }

    if (!anyColumnMatched) return { ...empty, error: 'No B19131 columns matched — label parser may need updating' }

    const share = totalFamiliesWithKids > 0 ? affluentCount / totalFamiliesWithKids : null

    return {
      affluent_families_count: Math.round(affluentCount),
      affluent_families_share: share === null ? null : Math.round(share * 10000) / 10000,
      affluent_families_snapped_bracket: snapped,
      affluent_families_effective_threshold: effective,
      families_with_own_children_total: Math.round(totalFamiliesWithKids),
      rpp_used: rpp ?? null,
      source_url: `https://api.census.gov/data/${year}/acs/acs5/groups/B19131.html`,
      error: null,
    }
  } catch (e) {
    return { ...empty, error: (e as Error).message }
  }
}
