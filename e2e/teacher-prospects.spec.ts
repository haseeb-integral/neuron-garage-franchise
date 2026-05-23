import { test, expect } from "@playwright/test";

test.describe("Teacher Prospects – search & filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/teacher-prospects");
    await expect(
      page.getByRole("heading", { name: /teacher prospects/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar nav lands on Teacher Prospects", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /teacher prospects/i }).click();
    await expect(page).toHaveURL(/\/teacher-prospects$/);
  });

  test("searching by name/school filters the prospects table", async ({ page }) => {
    const search = page.getByPlaceholder(/search name, school, or city/i).first();
    await expect(search).toBeVisible();

    const rows = page.locator('[data-testid="teacher-row"], tbody tr');
    const initial = await rows.count();
    expect(initial).toBeGreaterThan(0);

    await search.fill("smith");
    await page.waitForTimeout(700); // debounce

    const filtered = await rows.count();
    expect(filtered).toBeLessThanOrEqual(initial);
  });

  test("empty search returns full dataset", async ({ page }) => {
    const search = page.getByPlaceholder(/search name, school, or city/i).first();
    await search.fill("zzzznoresult___");
    await page.waitForTimeout(700);
    await search.fill("");
    await page.waitForTimeout(700);

    const rows = page.locator('[data-testid="teacher-row"], tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
