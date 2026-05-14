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
  young_family_growth_rate_pct: number | null   // % change households w/ kids 2017→2022
  dual_income_household_pct: number | null       // B23007_004 / B23007_003 * 100
  commute_sprawl_index_pct: number | null        // (B08303_011..013) / B08303_001 * 100
  hh_kids_2022: number | null
  hh_kids_2017: number | null
  married_kids: number | null
  dual_income: number | null
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
      const placeListUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}&key=${key}`
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
      'B11005_002E', // 0  households with people under 18 (2022)
      'B23007_003E', // 1  married-couple families w/ own children under 18
      'B23007_004E', // 2  ...with husband in labor force (proxy for dual-income numerator)
      'B08303_001E', // 3  commute total workers
      'B08303_011E', // 4  commute 45-59 min
      'B08303_012E', // 5  commute 60-89 min
      'B08303_013E', // 6  commute 90+ min
    ]
    const dataUrl = `https://api.census.gov/data/2022/acs/acs5?get=${vars.join(',')}&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
    const dataRes = await fetch(dataUrl)
    if (!dataRes.ok) {
      const body = await dataRes.text().catch(() => '')
      return { data: null, error: `Census ACS sprint ${dataRes.status}: ${body.slice(0, 200)}` }
    }
    const arr = await dataRes.json() as string[][]
    const row = arr?.[1]
    if (!row) return { data: null, error: `Census ACS sprint: empty row for place ${placeFips} state ${stateFips}` }
    const num = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null }
    const hhKids2022 = num(row[0])
    const marriedKids = num(row[1])
    const dualIncome = num(row[2])
    const commuteTotal = num(row[3])
    const longCommute = (num(row[4]) ?? 0) + (num(row[5]) ?? 0) + (num(row[6]) ?? 0)
    console.log('[fetchCensusSprintMetrics]', { city, state, placeFips, stateFips, hhKids2022, marriedKids, dualIncome, commuteTotal, longCommute })

    let hhKids2017: number | null = null
    try {
      const url2017 = `https://api.census.gov/data/2017/acs/acs5?get=B11005_002E&for=place:${placeFips}&in=state:${stateFips}&key=${key}`
      const r2017 = await fetch(url2017)
      if (r2017.ok) {
        const a2017 = await r2017.json() as string[][]
        hhKids2017 = num(a2017?.[1]?.[0] ?? '')
      }
    } catch (_) { /* non-fatal */ }

    const youngFamiliesGrowth = (hhKids2022 != null && hhKids2017 != null && hhKids2017 > 0)
      ? Math.round(((hhKids2022 - hhKids2017) / hhKids2017) * 1000) / 10
      : null
    const dualIncomePct = (marriedKids != null && marriedKids > 0 && dualIncome != null)
      ? Math.round((dualIncome / marriedKids) * 1000) / 10
      : null
    const commuteSprawlPct = (commuteTotal != null && commuteTotal > 0)
      ? Math.round((longCommute / commuteTotal) * 1000) / 10
      : null

    return {
      data: {
        young_family_growth_rate_pct: youngFamiliesGrowth,
        dual_income_household_pct: dualIncomePct,
        commute_sprawl_index_pct: commuteSprawlPct,
        hh_kids_2022: hhKids2022,
        hh_kids_2017: hhKids2017,
        married_kids: marriedKids,
        dual_income: dualIncome,
        commute_total: commuteTotal,
        long_commute: longCommute,
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

// ---- Firecrawl waitlist / sold-out signal scraper (cap 5 URLs) ----
export async function fetchCompetitorWaitlistSignals(urls: string[]) {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return { waitlist: 0, soldout: 0, scanned: 0, error: null as string | null }
  const targets = urls.filter((u) => /^https?:\/\//.test(u)).slice(0, 5)
  if (targets.length === 0) return { waitlist: 0, soldout: 0, scanned: 0, error: null }
  const WAITLIST_RE = /waitlist|wait list|join the wait|notify me when/i
  const SOLDOUT_RE = /sold out|fully booked|registration closed|session full|class full|enrollment closed/i
  let waitlist = 0, soldout = 0
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
      if (WAITLIST_RE.test(md)) waitlist++
      if (SOLDOUT_RE.test(md)) soldout++
    } catch (e) { errs.push((e as Error).message) }
  }))
  return { waitlist, soldout, scanned: targets.length, error: errs.length ? errs.join(' | ') : null }
}
