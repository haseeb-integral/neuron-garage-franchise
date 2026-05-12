export type CityGeo = {
  metroArea: string
  county: string
  marketType: 'Urban' | 'Suburb' | 'Exurb'
}

// Key format: "city lowercase|state lowercase"
export const CITY_GEO: Record<string, CityGeo> = {
  // Texas — DFW
  'frisco|texas':           { metroArea: 'Dallas-Fort Worth', county: 'Collin',      marketType: 'Suburb' },
  'plano|texas':            { metroArea: 'Dallas-Fort Worth', county: 'Collin',      marketType: 'Suburb' },
  'mckinney|texas':         { metroArea: 'Dallas-Fort Worth', county: 'Collin',      marketType: 'Suburb' },
  'prosper|texas':          { metroArea: 'Dallas-Fort Worth', county: 'Collin',      marketType: 'Exurb'  },
  'allen|texas':            { metroArea: 'Dallas-Fort Worth', county: 'Collin',      marketType: 'Suburb' },
  'celina|texas':           { metroArea: 'Dallas-Fort Worth', county: 'Collin',      marketType: 'Exurb'  },
  'flower mound|texas':     { metroArea: 'Dallas-Fort Worth', county: 'Denton',      marketType: 'Suburb' },
  'southlake|texas':        { metroArea: 'Dallas-Fort Worth', county: 'Tarrant',     marketType: 'Suburb' },
  'colleyville|texas':      { metroArea: 'Dallas-Fort Worth', county: 'Tarrant',     marketType: 'Suburb' },
  'keller|texas':           { metroArea: 'Dallas-Fort Worth', county: 'Tarrant',     marketType: 'Suburb' },
  'the colony|texas':       { metroArea: 'Dallas-Fort Worth', county: 'Denton',      marketType: 'Suburb' },
  'little elm|texas':       { metroArea: 'Dallas-Fort Worth', county: 'Denton',      marketType: 'Exurb'  },
  'lewisville|texas':       { metroArea: 'Dallas-Fort Worth', county: 'Denton',      marketType: 'Suburb' },
  'coppell|texas':          { metroArea: 'Dallas-Fort Worth', county: 'Dallas',      marketType: 'Suburb' },
  'irving|texas':           { metroArea: 'Dallas-Fort Worth', county: 'Dallas',      marketType: 'Urban'  },
  // Texas — Austin
  'austin|texas':           { metroArea: 'Austin',            county: 'Travis',      marketType: 'Urban'  },
  'round rock|texas':       { metroArea: 'Austin',            county: 'Williamson',  marketType: 'Suburb' },
  'cedar park|texas':       { metroArea: 'Austin',            county: 'Williamson',  marketType: 'Suburb' },
  'leander|texas':          { metroArea: 'Austin',            county: 'Williamson',  marketType: 'Exurb'  },
  'pflugerville|texas':     { metroArea: 'Austin',            county: 'Travis',      marketType: 'Suburb' },
  'georgetown|texas':       { metroArea: 'Austin',            county: 'Williamson',  marketType: 'Exurb'  },
  // Texas — Houston
  'sugar land|texas':       { metroArea: 'Houston',           county: 'Fort Bend',   marketType: 'Suburb' },
  'katy|texas':             { metroArea: 'Houston',           county: 'Harris',      marketType: 'Suburb' },
  'the woodlands|texas':    { metroArea: 'Houston',           county: 'Montgomery',  marketType: 'Suburb' },
  'pearland|texas':         { metroArea: 'Houston',           county: 'Brazoria',    marketType: 'Suburb' },
  'friendswood|texas':      { metroArea: 'Houston',           county: 'Galveston',   marketType: 'Suburb' },
  // Texas — San Antonio
  'san antonio|texas':      { metroArea: 'San Antonio',       county: 'Bexar',       marketType: 'Urban'  },
  'new braunfels|texas':    { metroArea: 'San Antonio',       county: 'Comal',       marketType: 'Exurb'  },
  'boerne|texas':           { metroArea: 'San Antonio',       county: 'Kendall',     marketType: 'Exurb'  },
  // Virginia
  'ashburn|virginia':       { metroArea: 'Washington DC',     county: 'Loudoun',     marketType: 'Suburb' },
  'reston|virginia':        { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Suburb' },
  'herndon|virginia':       { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Suburb' },
  'chantilly|virginia':     { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Suburb' },
  'mclean|virginia':        { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Suburb' },
  'great falls|virginia':   { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Exurb'  },
  // Georgia
  'alpharetta|georgia':     { metroArea: 'Atlanta',           county: 'Fulton',      marketType: 'Suburb' },
  'johns creek|georgia':    { metroArea: 'Atlanta',           county: 'Fulton',      marketType: 'Suburb' },
  'milton|georgia':         { metroArea: 'Atlanta',           county: 'Fulton',      marketType: 'Exurb'  },
  'roswell|georgia':        { metroArea: 'Atlanta',           county: 'Fulton',      marketType: 'Suburb' },
  'cumming|georgia':        { metroArea: 'Atlanta',           county: 'Forsyth',     marketType: 'Exurb'  },
  // North Carolina
  'cary|north carolina':    { metroArea: 'Raleigh',           county: 'Wake',        marketType: 'Suburb' },
  'apex|north carolina':    { metroArea: 'Raleigh',           county: 'Wake',        marketType: 'Suburb' },
  'morrisville|north carolina': { metroArea: 'Raleigh',       county: 'Wake',        marketType: 'Suburb' },
  'holly springs|north carolina': { metroArea: 'Raleigh',    county: 'Wake',        marketType: 'Exurb'  },
  // Colorado
  'highlands ranch|colorado': { metroArea: 'Denver',          county: 'Douglas',     marketType: 'Suburb' },
  'parker|colorado':        { metroArea: 'Denver',            county: 'Douglas',     marketType: 'Suburb' },
  'castle rock|colorado':   { metroArea: 'Denver',            county: 'Douglas',     marketType: 'Exurb'  },
  // Arizona
  'scottsdale|arizona':     { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Suburb' },
  'chandler|arizona':       { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Suburb' },
  'gilbert|arizona':        { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Suburb' },
  'tempe|arizona':          { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Urban'  },
  // Florida
  'weston|florida':         { metroArea: 'Miami',             county: 'Broward',     marketType: 'Suburb' },
  'wellington|florida':     { metroArea: 'Miami',             county: 'Palm Beach',  marketType: 'Suburb' },
}

export function lookupCityGeo(city: string, state: string): CityGeo | null {
  const key = `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`
  const result = CITY_GEO[key] ?? null
  if (!result) {
    console.warn(`[cityGeo] No mapping found for: "${key}" — metro_area/county will be NULL`)
  }
  return result
}
