UPDATE public.apify_breaker_state
SET state = 'closed', consecutive_failures = 0, opened_at = NULL,
    next_retry_at = NULL, last_error = NULL, last_actor = NULL
WHERE id = true;