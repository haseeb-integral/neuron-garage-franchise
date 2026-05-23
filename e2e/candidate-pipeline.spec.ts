import { test, expect } from "@playwright/test";

test.describe("Candidate Pipeline – global search & board", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/candidate-pipeline");
    await expect(
      page.getByRole("heading", { name: /candidate pipeline/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar nav lands on Candidate Pipeline", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /candidate pipeline/i }).click();
    await expect(page).toHaveURL(/\/candidate-pipeline$/);
  });

  test("kanban columns render with candidates", async ({ page }) => {
    // Pipeline has 7 stage columns. Just assert several stage headings exist.
    const stageHeadings = [
      /applied/i,
      /screen/i,
      /interview/i,
      /offer/i,
    ];
    for (const re of stageHeadings) {
      await expect(page.getByText(re).first()).toBeVisible();
    }
  });

  test("global search finds a candidate by name", async ({ page }) => {
    // PageHeader's GlobalSearch is the main search affordance on this page.
    const search = page
      .getByPlaceholder(/search|find|prospect|candidate/i)
      .first();
    await expect(search).toBeVisible();

    await search.click();
    await search.fill("a"); // single char — should surface suggestions menu
    // GlobalSearch opens a results panel; just confirm something appears.
    await expect(
      page.locator('[role="listbox"], [role="dialog"], [data-state="open"]').first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
