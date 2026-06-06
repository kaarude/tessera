import { expect, test } from "@playwright/test";

/**
 * Smoke test: log in, create a note, confirm it appears in the list.
 *
 * This test requires:
 *   - `docker compose up -d db minio` (or a running dev environment)
 *   - `npm run seed` (uses the random admin password printed by the
 *     seed — read it from .seed-credentials or pass via env)
 *
 * For CI, the recommended path is to skip E2E and rely on the
 * vitest unit suite. The Playwright config starts a dev server
 * automatically; just run `npm run test:e2e`.
 *
 * To run with a known password, set:
 *   TESSERA_TEST_ADMIN_PASSWORD=...  npm run test:e2e
 */
const ADMIN_EMAIL = "admin@tessera.app";
const ADMIN_PASSWORD = process.env.TESSERA_TEST_ADMIN_PASSWORD;

test("login → create note", async ({ page }) => {
  test.skip(
    !ADMIN_PASSWORD,
    "TESSERA_TEST_ADMIN_PASSWORD not set — skipping E2E. Run `npm run seed` and set the env var to enable.",
  );

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Tessera" })).toBeVisible();

  await page.getByLabel("Email").fill(ADMIN_EMAIL!);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Welcome back",
  );

  // Navigate to notes
  await page.getByRole("link", { name: "Notes" }).first().click();
  await page.waitForURL("**/notes");

  // Create a note
  const noteTitle = `Smoke test ${Date.now()}`;
  await page.getByRole("button", { name: "New Note" }).click();
  await page.getByLabel("Note title").fill(noteTitle);
  await page
    .getByLabel("Note content")
    .fill("# Hello\n\nThis is a smoke test note.");
  await page.getByRole("button", { name: "Create" }).click();

  // The new note should appear in the list
  await expect(page.getByText(noteTitle)).toBeVisible({ timeout: 5_000 });

  // Open it
  await page.getByText(noteTitle).click();
  await page.waitForURL(/\/notes\/.+/);

  // The title field should reflect the note we just created
  await expect(page.getByLabel("Note title")).toHaveValue(noteTitle);
});
