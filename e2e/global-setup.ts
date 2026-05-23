import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Logs in once via the Auth page and persists the session to
 * `e2e/.auth/user.json`. Every spec reuses this storage state.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use.baseURL ?? process.env.E2E_BASE_URL ?? "http://localhost:8080";
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD must be set. Create a real user in your backend first."
    );
  }

  const authDir = path.resolve("e2e/.auth");
  fs.mkdirSync(authDir, { recursive: true });
  const storageStatePath = path.join(authDir, "user.json");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/auth`);
  // The Auth page renders Sign In by default. Fill credentials and submit.
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait until we land on an authenticated route (any path that isn't /auth).
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30_000 });

  await context.storageState({ path: storageStatePath });
  await browser.close();
}
