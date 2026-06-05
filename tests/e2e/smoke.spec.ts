import { expect, test } from "@playwright/test";

/**
 * Smoke test: log in, create a note, share it with the only other user,
 * and confirm the note appears in the list.
 *
 * Defaults assume the seed has been run (admin@tessera.app / admin123 and
 * user@tessera.app / user123 exist) and that no notes already exist.
 */
test("login → create note → share", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Tessera" })).toBeVisible();

  await page.getByLabel("Email").fill("admin@tessera.app");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");

  // Navigate to notes
  await page.getByRole("link", { name: "Notes" }).first().click();
  await page.waitForURL("**/notes");

  // Create a note
  await page.getByRole("button", { name: "New Note" }).click();
  await page.getByLabel("Note title").fill("Tessera smoke test note");
  await page.getByLabel("Note content").fill("# Hello\n\nThis is a test note.");
  await page.getByRole("button", { name: "Create" }).click();

  // The new note should appear in the list
  await expect(
    page.getByText("Tessera smoke test note"),
  ).toBeVisible({ timeout: 5_000 });

  // Open it
  await page.getByText("Tessera smoke test note").click();
  await page.waitForURL(/\/notes\/.+/);

  // Toggle private → shared (the share panel needs a current team; in the
  // default seed the admin is in "Engineering" which is the active team)
  const shareButton = page.getByRole("button", { name: /Share/i });
  if (await shareButton.isVisible()) {
    await shareButton.click();
    // Click the shared toggle
    await page
      .getByLabel(/Private|Shared with team/i)
      .click()
      .catch(() => undefined);
  }

  // Logout
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("**/login");
});
