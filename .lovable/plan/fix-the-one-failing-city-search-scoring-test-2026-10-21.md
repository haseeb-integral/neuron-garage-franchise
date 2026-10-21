# Fix the one failing City Search scoring test

## What is broken (in plain words)

Nothing in the app is broken. Only the **test** is out of date.

- The test checks how the "Demand" score is worked out for a city.
- When the test was written, Demand had **4 items**: number of children 5–12, family income, two-income homes, and parent education.
- Later, a **5th item** was added to Demand: "Affluent Families with Children" (turned on by a feature switch).
- The test still gives values for only the old 4 items. It then says "every item must be used." The new 5th item has no value, so the app correctly skips it. That makes the test's last line fail.
- The score itself is right. The test's other checks on the score pass (it lands between 45 and 55 as expected).
- The app skipping an item with no value is on purpose. Another test ("drops null metrics...") checks that exact rule, and it passes.

So the real scoring code is working as designed. The test just did not get updated when the 5th item was added.

## The fix

Update only the test so it knows about the 5th item:

- Give "Affluent Families with Children" a middle value (50 out of 0–100) and a weight in the test, like the other 4 items.
- Keep every other check exactly the same, including "every item must be used" and "score between 45 and 55."

## What will NOT be touched

- No scoring code, no weights, no City Search pages, no database.
- No change to what any user sees. Brett's "one calibrated number everywhere" rule is not affected.
- Only one file changes: the test file.

## Risks and how they are handled

- **Risk: hiding a real bug by loosening the test.** Handled by not loosening anything. All checks stay strict. We only add the missing 5th item.
- **Risk: the feature switch is off somewhere.** If the switch is off, the 5th item is not in Demand, and the extra value in the test is simply ignored. The test passes either way.
- **Risk: breaking other tests.** Handled by running all automatic tests after the change. Expected result: 149 of 149 pass.

## Phases

- Phase 1 (1 turn): update the test, run the scoring tests, then run all tests and report.

## What to test

- Nothing to click. I will run the tests and show you the result.

## Technical details

- File: `src/lib/clientSubWeightScoring.test.ts`, test "normalizes raw values and returns a 0-100 score using sub-weight shares".
- Cause: `METRICS_BY_CATEGORY.demand` now includes `affluent_families_score` (enabled when `FEATURE_AFFLUENT_FAMILIES` is on). The fixture passes no raw value, so `normalizeSowMetric` returns null, `used=false`, and `contributions.every(c => c.used)` fails.
- Change: add `affluent_families_score: 50` to the raw values and a sub-weight (e.g. 30) to the weights object. Mid value 50 keeps the expected score near 50.
