# E2E tests (Playwright)

End-to-end smoke + search coverage for the three main flows:

- `city-scoring.spec.ts` — City Scoring search & ranked list filter
- `teacher-prospects.spec.ts` — Teacher Prospects search & table filter
- `candidate-pipeline.spec.ts` — Pipeline board + global search

## Setup (one-time)

1. Install the Chromium browser binary:
   ```bash
   bun run test:e2e:install
   ```
2. Create a real test user in your backend (or reuse an existing one).
3. Export the credentials before running:
   ```bash
   export E2E_EMAIL="qa@example.com"
   export E2E_PASSWORD="••••••••"
   # Optional — defaults to http://localhost:8080 with auto-started `bun run dev`
   export E2E_BASE_URL="https://<your-preview>.lovable.app"
   ```

## Run

```bash
bun run test:e2e          # headless
bun run test:e2e:ui       # Playwright UI mode
```

The first run logs in via `/auth` and stores the session in
`e2e/.auth/user.json` (gitignored). Subsequent specs reuse it, so login
only happens once per `globalSetup`.

## CI

In CI, set `E2E_BASE_URL` to your deployed preview URL and provide
`E2E_EMAIL` / `E2E_PASSWORD` as secrets. The config auto-enables
retries, single worker, and the GitHub reporter when `CI=1`.

## Notes / known limitations

- These specs are **search-focused smoke tests**, not full regression
  coverage. They assert that pages load, search inputs are wired, and
  filters narrow results.
- Selectors prefer `getByRole` / `getByPlaceholder`. If you later add
  `data-testid` attributes (e.g. `ranked-market-row`, `teacher-row`),
  the assertions tighten automatically.
- The runner does **not** execute inside the Lovable sandbox — run it
  locally or in your CI environment.
