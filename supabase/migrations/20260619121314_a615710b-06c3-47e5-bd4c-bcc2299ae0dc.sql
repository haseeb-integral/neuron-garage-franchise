ALTER TABLE public.mvs_providers
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS source_listing_url text;

COMMENT ON COLUMN public.mvs_providers.url IS 'DEPRECATED. Use website_url for the provider homepage and source_listing_url for the discovery page.';

ALTER TABLE public.mvs_weeks
  ADD COLUMN IF NOT EXISTS source_url text;

-- Salvage what we can from the existing url column:
-- Google Maps + Yelp URLs are useful as source_listing_url.
-- Google-search fallback URLs (the broken backfill from earlier this session) are not, so leave them out.
UPDATE public.mvs_providers
SET source_listing_url = url
WHERE source_listing_url IS NULL
  AND url IS NOT NULL
  AND url NOT LIKE 'https://www.google.com/search%';

-- Null out the bad google-search fallback URLs so the week extractor stops scraping a search results page.
UPDATE public.mvs_providers
SET url = NULL
WHERE url LIKE 'https://www.google.com/search%';