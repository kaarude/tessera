import { defineConfig, devices } from "@playwright/test";

/**
 * Tessera Playwright config. The default `webServer` block starts the
 * Next.js dev server with the required env vars so a single
 * `npm run test:e2e` will:
 *
 *   1. start a Postgres + MinIO via the test fixtures (see below)
 *   2. apply migrations
 *   3. seed
 *   4. launch the dev server
 *   5. run the tests
 *
 * For CI, the `e2e` job in .github/workflows/ci.yml uses a similar setup
 * against the bundled Postgres service.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // single-user test, easier to reason about
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NODE_ENV: "test",
          DATABASE_URL:
            process.env.DATABASE_URL ??
            "postgresql://tessera:tessera@localhost:5432/tessera?schema=public",
          SESSION_SECRET:
            process.env.SESSION_SECRET ??
            "ci-test-secret-do-not-use-in-production-32bytes",
          S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:9000",
          S3_REGION: "us-east-1",
          S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "minio",
          S3_SECRET_ACCESS_KEY:
            process.env.S3_SECRET_ACCESS_KEY ?? "minio12345",
          S3_BUCKET: process.env.S3_BUCKET ?? "tessera",
          S3_FORCE_PATH_STYLE: "true",
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        },
      },
});
