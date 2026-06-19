I agree with the criticism. Two separate problems need fixing:

1. **QA page usability**
   - Move the existing “Back to Market Validation” link from the bottom to the top/header area so it is visible immediately.
   - Keep the bottom back link too if useful, but the top return path is the important fix.

2. **Bad source/evidence URLs**
   - The extractor currently scrapes only the provider root URL first, so Philly Art Center rows all point to `https://phillyartcenter.com/` and the screenshot is just the homepage.
   - Fix `mvs-extract-weeks` so before extracting weeks it discovers/selects the best camp/registration page URL from the provider website, prioritizing URLs/titles/text containing terms like `summer camp`, `camps`, `registration`, `sawyer`, `enroll`, `weekly`, `kids`, `ages`.
   - For Philly Art Center, this should prefer a page like `/camps/summer-camps/` over the homepage when that page contains the camp schedule, ages, by-the-week dates, registration language, and pricing/policy sections.
   - Store that exact selected page as `mvs_weeks.source_url` and capture the screenshot from that exact page, not the homepage.

3. **QA page evidence display**
   - Show the exact source URL more clearly as “Evidence page” instead of generic “Source”.
   - Keep screenshot preview tied to the exact evidence page.
   - Add a small “Open evidence page” action beside the screenshot/source so reviewers can verify quickly.

4. **Important limitation**
   - Existing bad rows already saved with homepage URLs will not magically change from a UI-only fix.
   - After updating the extractor, Philly/Philadelphia extraction must be rerun so the queue rows get refreshed with the correct source URL and screenshot.

5. **Verification after build**
   - Open `/market-validation`, click “Review QA queue”.
   - Confirm the QA page has an obvious top “Back to Market Validation” control.
   - Confirm Philly Art Center QA rows point to the camp page, not the homepage, after rerunning extraction.
   - Confirm screenshots show the camp information section/page, not only the homepage hero.