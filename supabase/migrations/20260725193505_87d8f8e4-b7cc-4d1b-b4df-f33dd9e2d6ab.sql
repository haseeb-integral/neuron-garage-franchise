UPDATE public.apify_breaker_state
SET state = 'open',
    consecutive_failures = 3,
    opened_at = now(),
    next_retry_at = now() + interval '10 minutes',
    last_error = 'HTTP 429 (smoke test — safe to ignore)',
    last_actor = 'smoke-test'
WHERE id = true;