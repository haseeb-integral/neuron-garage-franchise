import { test, expect } from "@playwright/test";

test.describe("City Scoring – search & ranking", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/city-scoring");
    // Wait for at least one ranked market row or the empty/error state.
    await expect(
      page.getByRole("heading", { name: /city scoring|ranked markets/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar nav lands on City Scoring", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /city scoring/i }).click();
    await expect(page).toHaveURL(/\/city-scoring$/);
  });

  test("typing in city search filters the ranked list", async ({ page }) => {
    const search = page.getByPlaceholder(/search city.*suburb.*metro/i).first();
    await expect(search).toBeVisible();

    // Capture initial count of ranked rows (best-effort selector).
    const rows = page.locator('[data-testid="ranked-market-row"], [role="row"]');
    const initialCount = await rows.count();

    await search.fill("Austin");
    // Allow debounced filter to apply.
    await page.waitForTimeout(600);

    // Expect either: rows filtered down, or at least one row containing "Austin".
    const filtered = await rows.count();
    expect(filtered).toBeLessThanOrEqual(initialCount);
    if (filtered > 0) {
      await expect(rows.first()).toContainText(/austin/i);
    }
  });

  test("clearing search restores results", async ({ page }) => {
    const search = page.getByPlaceholder(/search city.*suburb.*metro/i).first();
    await search.fill("Austin");
    await page.waitForTimeout(400);
    await search.fill("");
    await page.waitForTimeout(400);

    const rows = page.locator('[data-testid="ranked-market-row"], [role="row"]');
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
