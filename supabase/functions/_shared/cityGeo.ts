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
  'weston|florida':           { metroArea: 'Miami',             county: 'Broward',     marketType: 'Suburb' },
  'wellington|florida':       { metroArea: 'Miami',             county: 'Palm Beach',  marketType: 'Suburb' },
  'coral springs|florida':    { metroArea: 'Miami',             county: 'Broward',     marketType: 'Suburb' },
  'doral|florida':            { metroArea: 'Miami',             county: 'Miami-Dade',  marketType: 'Suburb' },
  'boca raton|florida':       { metroArea: 'Miami',             county: 'Palm Beach',  marketType: 'Suburb' },
  'tampa|florida':            { metroArea: 'Tampa',             county: 'Hillsborough',marketType: 'Urban'  },
  'orlando|florida':          { metroArea: 'Orlando',           county: 'Orange',      marketType: 'Urban'  },
  'naples|florida':           { metroArea: 'Naples',            county: 'Collier',     marketType: 'Suburb' },
  'jacksonville|florida':     { metroArea: 'Jacksonville',      county: 'Duval',       marketType: 'Urban'  },
  'st. petersburg|florida':   { metroArea: 'Tampa',             county: 'Pinellas',    marketType: 'Urban'  },
  // Arizona (extra)
  'peoria|arizona':           { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Suburb' },
  'mesa|arizona':             { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Urban'  },
  'glendale|arizona':         { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Suburb' },
  'queen creek|arizona':      { metroArea: 'Phoenix',           county: 'Maricopa',    marketType: 'Exurb'  },
  // Colorado (extra)
  'boulder|colorado':         { metroArea: 'Denver',            county: 'Boulder',     marketType: 'Suburb' },
  'fort collins|colorado':    { metroArea: 'Fort Collins',      county: 'Larimer',     marketType: 'Suburb' },
  'centennial|colorado':      { metroArea: 'Denver',            county: 'Arapahoe',    marketType: 'Suburb' },
  'lone tree|colorado':       { metroArea: 'Denver',            county: 'Douglas',     marketType: 'Suburb' },
  'broomfield|colorado':      { metroArea: 'Denver',            county: 'Broomfield',  marketType: 'Suburb' },
  // North Carolina (extra)
  'raleigh|north carolina':   { metroArea: 'Raleigh',           county: 'Wake',        marketType: 'Urban'  },
  'charlotte|north carolina': { metroArea: 'Charlotte',         county: 'Mecklenburg', marketType: 'Urban'  },
  'huntersville|north carolina': { metroArea: 'Charlotte',      county: 'Mecklenburg', marketType: 'Suburb' },
  'matthews|north carolina':  { metroArea: 'Charlotte',         county: 'Mecklenburg', marketType: 'Suburb' },
  'waxhaw|north carolina':    { metroArea: 'Charlotte',         county: 'Union',       marketType: 'Exurb'  },
  'davidson|north carolina':  { metroArea: 'Charlotte',         county: 'Mecklenburg', marketType: 'Suburb' },
  'chapel hill|north carolina': { metroArea: 'Raleigh',         county: 'Orange',      marketType: 'Suburb' },
  // Virginia (extra)
  'fairfax|virginia':         { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Suburb' },
  'leesburg|virginia':        { metroArea: 'Washington DC',     county: 'Loudoun',     marketType: 'Exurb'  },
  'arlington|virginia':       { metroArea: 'Washington DC',     county: 'Arlington',   marketType: 'Urban'  },
  'alexandria|virginia':      { metroArea: 'Washington DC',     county: 'Alexandria',  marketType: 'Urban'  },
  'vienna|virginia':          { metroArea: 'Washington DC',     county: 'Fairfax',     marketType: 'Suburb' },
  // Tennessee
  'nashville|tennessee':      { metroArea: 'Nashville',         county: 'Davidson',    marketType: 'Urban'  },
  'franklin|tennessee':       { metroArea: 'Nashville',         county: 'Williamson',  marketType: 'Suburb' },
  'brentwood|tennessee':      { metroArea: 'Nashville',         county: 'Williamson',  marketType: 'Suburb' },
  'murfreesboro|tennessee':   { metroArea: 'Nashville',         county: 'Rutherford',  marketType: 'Suburb' },
  'germantown|tennessee':     { metroArea: 'Memphis',           county: 'Shelby',      marketType: 'Suburb' },
  'collierville|tennessee':   { metroArea: 'Memphis',           county: 'Shelby',      marketType: 'Suburb' },
  // Massachusetts
  'newton|massachusetts':     { metroArea: 'Boston',            county: 'Middlesex',   marketType: 'Suburb' },
  'lexington|massachusetts':  { metroArea: 'Boston',            county: 'Middlesex',   marketType: 'Suburb' },
  'wellesley|massachusetts':  { metroArea: 'Boston',            county: 'Norfolk',     marketType: 'Suburb' },
  'needham|massachusetts':    { metroArea: 'Boston',            county: 'Norfolk',     marketType: 'Suburb' },
  'brookline|massachusetts':  { metroArea: 'Boston',            county: 'Norfolk',     marketType: 'Suburb' },
  'cambridge|massachusetts':  { metroArea: 'Boston',            county: 'Middlesex',   marketType: 'Urban'  },
  // New Jersey
  'princeton|new jersey':     { metroArea: 'New York',          county: 'Mercer',      marketType: 'Suburb' },
  'westfield|new jersey':     { metroArea: 'New York',          county: 'Union',       marketType: 'Suburb' },
  'summit|new jersey':        { metroArea: 'New York',          county: 'Union',       marketType: 'Suburb' },
  'montclair|new jersey':     { metroArea: 'New York',          county: 'Essex',       marketType: 'Suburb' },
  'ridgewood|new jersey':     { metroArea: 'New York',          county: 'Bergen',      marketType: 'Suburb' },
  // New York
  'scarsdale|new york':       { metroArea: 'New York',          county: 'Westchester', marketType: 'Suburb' },
  'rye|new york':             { metroArea: 'New York',          county: 'Westchester', marketType: 'Suburb' },
  'bronxville|new york':      { metroArea: 'New York',          county: 'Westchester', marketType: 'Suburb' },
  'great neck|new york':      { metroArea: 'New York',          county: 'Nassau',      marketType: 'Suburb' },
  'syosset|new york':         { metroArea: 'New York',          county: 'Nassau',      marketType: 'Suburb' },
  // Pennsylvania
  'wayne|pennsylvania':       { metroArea: 'Philadelphia',      county: 'Delaware',    marketType: 'Suburb' },
  'newtown|pennsylvania':     { metroArea: 'Philadelphia',      county: 'Bucks',       marketType: 'Suburb' },
  'doylestown|pennsylvania':  { metroArea: 'Philadelphia',      county: 'Bucks',       marketType: 'Suburb' },
  'pittsburgh|pennsylvania':  { metroArea: 'Pittsburgh',        county: 'Allegheny',   marketType: 'Urban'  },
  // Illinois
  'naperville|illinois':      { metroArea: 'Chicago',           county: 'DuPage',      marketType: 'Suburb' },
  'wheaton|illinois':         { metroArea: 'Chicago',           county: 'DuPage',      marketType: 'Suburb' },
  'hinsdale|illinois':        { metroArea: 'Chicago',           county: 'DuPage',      marketType: 'Suburb' },
  'evanston|illinois':        { metroArea: 'Chicago',           county: 'Cook',        marketType: 'Suburb' },
  'wilmette|illinois':        { metroArea: 'Chicago',           county: 'Cook',        marketType: 'Suburb' },
  'oak park|illinois':        { metroArea: 'Chicago',           county: 'Cook',        marketType: 'Suburb' },
  'lake forest|illinois':     { metroArea: 'Chicago',           county: 'Lake',        marketType: 'Suburb' },
  // Minnesota
  'edina|minnesota':          { metroArea: 'Minneapolis',       county: 'Hennepin',    marketType: 'Suburb' },
  'minnetonka|minnesota':     { metroArea: 'Minneapolis',       county: 'Hennepin',    marketType: 'Suburb' },
  'eden prairie|minnesota':   { metroArea: 'Minneapolis',       county: 'Hennepin',    marketType: 'Suburb' },
  'woodbury|minnesota':       { metroArea: 'Minneapolis',       county: 'Washington',  marketType: 'Suburb' },
  // Washington
  'bellevue|washington':      { metroArea: 'Seattle',           county: 'King',        marketType: 'Urban'  },
  'redmond|washington':       { metroArea: 'Seattle',           county: 'King',        marketType: 'Suburb' },
  'sammamish|washington':     { metroArea: 'Seattle',           county: 'King',        marketType: 'Suburb' },
  'issaquah|washington':      { metroArea: 'Seattle',           county: 'King',        marketType: 'Suburb' },
  'kirkland|washington':      { metroArea: 'Seattle',           county: 'King',        marketType: 'Suburb' },
  'mercer island|washington': { metroArea: 'Seattle',           county: 'King',        marketType: 'Suburb' },
  // Oregon
  'lake oswego|oregon':       { metroArea: 'Portland',          county: 'Clackamas',   marketType: 'Suburb' },
  'beaverton|oregon':         { metroArea: 'Portland',          county: 'Washington',  marketType: 'Suburb' },
  'bend|oregon':              { metroArea: 'Bend',              county: 'Deschutes',   marketType: 'Suburb' },
  // California
  'palo alto|california':     { metroArea: 'San Francisco',     county: 'Santa Clara', marketType: 'Suburb' },
  'cupertino|california':     { metroArea: 'San Francisco',     county: 'Santa Clara', marketType: 'Suburb' },
  'san jose|california':      { metroArea: 'San Francisco',     county: 'Santa Clara', marketType: 'Urban'  },
  'mountain view|california': { metroArea: 'San Francisco',     county: 'Santa Clara', marketType: 'Suburb' },
  'pleasanton|california':    { metroArea: 'San Francisco',     county: 'Alameda',     marketType: 'Suburb' },
  'san ramon|california':     { metroArea: 'San Francisco',     county: 'Contra Costa',marketType: 'Suburb' },
  'walnut creek|california':  { metroArea: 'San Francisco',     county: 'Contra Costa',marketType: 'Suburb' },
  'irvine|california':        { metroArea: 'Los Angeles',       county: 'Orange',      marketType: 'Suburb' },
  'newport beach|california': { metroArea: 'Los Angeles',       county: 'Orange',      marketType: 'Suburb' },
  'manhattan beach|california':{ metroArea: 'Los Angeles',      county: 'Los Angeles', marketType: 'Suburb' },
  'pasadena|california':      { metroArea: 'Los Angeles',       county: 'Los Angeles', marketType: 'Urban'  },
  'thousand oaks|california': { metroArea: 'Los Angeles',       county: 'Ventura',     marketType: 'Suburb' },
  'san diego|california':     { metroArea: 'San Diego',         county: 'San Diego',   marketType: 'Urban'  },
  'carlsbad|california':      { metroArea: 'San Diego',         county: 'San Diego',   marketType: 'Suburb' },
  'encinitas|california':     { metroArea: 'San Diego',         county: 'San Diego',   marketType: 'Suburb' },
  // Utah
  'park city|utah':           { metroArea: 'Salt Lake City',    county: 'Summit',      marketType: 'Exurb'  },
  'draper|utah':              { metroArea: 'Salt Lake City',    county: 'Salt Lake',   marketType: 'Suburb' },
  'lehi|utah':                { metroArea: 'Salt Lake City',    county: 'Utah',        marketType: 'Suburb' },
  // Nevada
  'henderson|nevada':         { metroArea: 'Las Vegas',         county: 'Clark',       marketType: 'Suburb' },
  // Ohio
  'dublin|ohio':              { metroArea: 'Columbus',          county: 'Franklin',    marketType: 'Suburb' },
  'westerville|ohio':         { metroArea: 'Columbus',          county: 'Franklin',    marketType: 'Suburb' },
  'upper arlington|ohio':     { metroArea: 'Columbus',          county: 'Franklin',    marketType: 'Suburb' },
  // Michigan
  'troy|michigan':            { metroArea: 'Detroit',           county: 'Oakland',     marketType: 'Suburb' },
  'novi|michigan':            { metroArea: 'Detroit',           county: 'Oakland',     marketType: 'Suburb' },
  'birmingham|michigan':      { metroArea: 'Detroit',           county: 'Oakland',     marketType: 'Suburb' },
  'ann arbor|michigan':       { metroArea: 'Detroit',           county: 'Washtenaw',   marketType: 'Suburb' },
  // Indiana
  'carmel|indiana':           { metroArea: 'Indianapolis',      county: 'Hamilton',    marketType: 'Suburb' },
  'fishers|indiana':          { metroArea: 'Indianapolis',      county: 'Hamilton',    marketType: 'Suburb' },
  'zionsville|indiana':       { metroArea: 'Indianapolis',      county: 'Boone',       marketType: 'Exurb'  },
  // Missouri
  'chesterfield|missouri':    { metroArea: 'St. Louis',         county: 'St. Louis',   marketType: 'Suburb' },
  // Kansas
  'overland park|kansas':     { metroArea: 'Kansas City',       county: 'Johnson',     marketType: 'Suburb' },
  'leawood|kansas':           { metroArea: 'Kansas City',       county: 'Johnson',     marketType: 'Suburb' },
  'olathe|kansas':            { metroArea: 'Kansas City',       county: 'Johnson',     marketType: 'Suburb' },
  // South Carolina
  'mount pleasant|south carolina': { metroArea: 'Charleston',   county: 'Charleston',  marketType: 'Suburb' },
  'greenville|south carolina':{ metroArea: 'Greenville',        county: 'Greenville',  marketType: 'Urban'  },
  'fort mill|south carolina': { metroArea: 'Charlotte',         county: 'York',        marketType: 'Suburb' },
}

export function lookupCityGeo(city: string, state: string): CityGeo | null {
  const key = `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`
  const result = CITY_GEO[key] ?? null
  if (!result) {
    console.warn(`[cityGeo] No mapping found for: "${key}" — metro_area/county will be NULL`)
  }
  return result
}
