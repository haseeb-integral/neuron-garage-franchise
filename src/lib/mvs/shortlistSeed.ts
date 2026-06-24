/**
 * Market Validation shortlist seed list.
 *
 * Only the cities themselves — names + state. No fake pricing, no fake
 * composite, no fake sub-scores. Every score column on the Market Validation
 * page is rendered live from the pipeline. Cities that have not been run yet
 * show "—" with a "Not yet scored" pill until their pipeline run finishes.
 */

export interface ShortlistRow {
  id: string;
  city: string;
  state: string;
}

export const SHORTLIST_SEED: ShortlistRow[] = [
  { id: "new-york-ny",     city: "New York",     state: "NY" },
  { id: "houston-tx",      city: "Houston",      state: "TX" },
  { id: "chicago-il",      city: "Chicago",      state: "IL" },
  { id: "boston-ma",       city: "Boston",       state: "MA" },
  { id: "san-antonio-tx",  city: "San Antonio",  state: "TX" },
  { id: "philadelphia-pa", city: "Philadelphia", state: "PA" },
  { id: "los-angeles-ca",  city: "Los Angeles",  state: "CA" },
  { id: "indianapolis-in", city: "Indianapolis", state: "IN" },
  { id: "austin-tx",       city: "Austin",       state: "TX" },
];
