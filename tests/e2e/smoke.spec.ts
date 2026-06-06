import { expect, test } from "@playwright/test";

/**
 * Smoke test: log in, create a note, confirm it appears in the list.
 *
 * Requires a running dev environment with the database seeded via
 * `TESSERA_SEED_PASSWORD=... npm run seed` (deterministic password
 * + mustChangePassword=false). The env var is the only contract
 * between the seed and the test; the test itself does not parse
 * the random seed output.
 *
 * If `TESSERA_TEST_ADMIN_PASSWORD` is unset, the test skips —
 * this keeps `npm run test:e2e` safe to run in any environment.
 *
 * NOT enabled in CI by default. Run locally with:
 *   TESSERA_SEED_PASSWORD=admin123 TESSERA_TEST_ADMIN_PASSWORD=admin123 \
 *     docker compose up -d db minio
 *   TESSERA_SEED_PASSWORD=admin123 TESSERA_TEST_ADMIN_PASSWORD=admin123 \
 *     npx prisma migrate deploy
 *   TESSERA_SEED_PASSWORD=admin123 TESSERA_TEST_ADMIN_PASSWORD=admin123 \
 *     npm run seed
 *   TESSERA_TEST_ADMIN_PASSWORD=admin123 npm run test:e2e
 */
const ADMIN_EMAIL = "admin@tessera.app";
const ADMIN_PASSWORD = process.env.TESSERA_TEST_ADMIN_PASSWORD;

test("login → create note", async ({ page }) => {
  test.skip(
    !ADMIN_PASSWORD,
    "TESSERA_TEST_ADMIN_PASSWORD not set — skipping E2E. See header comment for setup instructions.",
  );

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Tessera" })).toBeVisible();

  await page.getByLabel("Email").fill(ADMIN_EMAIL!);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();

  // With TESSERA_SEED_PASSWORD set, mustChangePassword is OFF and
  // the user lands directly on the dashboard.
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Welcome back",
  );

  // Navigate to notes
  await page.getByRole("link", { name: "Notes" }).first().click();
  await page.waitForURL("**/notes");

  // Create a note with a unique title so repeated runs don't collide
  const noteTitle = `Smoke test ${Date.now()}`;
  await page.getByRole("button", { name: "New Note" }).click();
  await page.getByLabel("Note title").fill(noteTitle);
  await page
    .getByLabel("Note content")
    .fill("# Hello\n\nThis is a smoke test note.");
  await page.getByRole("button", { name: "Create" }).click();

  // Wait for toast success and modal to close
  await expect(page.getByText("Note created")).toBeVisible({ timeout: 5_000 });

  // Wait for the note to appear in the list (query invalidation + refetch)
  // The note is created as private (no team selected), so it should appear in the list
  await expect(page.getByText(noteTitle)).toBeVisible({ timeout: 15_000 });

  // Open it and confirm the editor actually loaded with our title
  await page.getByText(noteTitle).click();
  await page.waitForURL(/\/notes\/.+/);
  await expect(page.getByLabel("Note title")).toHaveValue(noteTitle);
});
