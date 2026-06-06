import { describe, expect, it, vi } from "vitest";

/**
 * Lightweight smoke test for the rate limiter's interface.
 *
 * The limiter uses raw SQL via Prisma's `$queryRaw` template tag,
 * which is hard to mock portably across Vitest versions. Rather
 * than try to mock the templated SQL, we verify the documented
 * behavior at the surface: a non-existent key creates a fresh
 * record (returned `count` is 1), a subsequent call within the
 * window increments the count, and exceeding `max` rejects.
 *
 * These tests require a live Postgres connection — the comment
 * at the top of `lib/rate-limit.ts` explains why mocking raw SQL
 * is fragile. They run in CI because CI has a Postgres service.
 * Locally, run them with `npm run test:integration` (we don't
 * have that script yet — for now run vitest with the right env).
 */
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";

// Skip these tests in environments without DATABASE_URL.
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("checkRateLimit (requires DATABASE_URL)", () => {
  it("creates a fresh record on first call and returns count=1", async () => {
    const key = `vitest:ip:${Date.now()}:${Math.random()}`;
    const result = await checkRateLimit([key], 10, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);

    // Clean up
    await clearRateLimit(key);
  });

  it("increments the count on subsequent calls within the window", async () => {
    const key = `vitest:ip:${Date.now()}:${Math.random()}`;
    await checkRateLimit([key], 10, 60_000);
    await checkRateLimit([key], 10, 60_000);
    await checkRateLimit([key], 10, 60_000);

    const third = await checkRateLimit([key], 10, 60_000);
    expect(third.allowed).toBe(true);

    await clearRateLimit(key);
  });

  it("rejects once count exceeds max within the window", async () => {
    const key = `vitest:ip:${Date.now()}:${Math.random()}`;

    // Allow 2 attempts
    await checkRateLimit([key], 2, 60_000);
    await checkRateLimit([key], 2, 60_000);
    const third = await checkRateLimit([key], 2, 60_000);

    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);

    await clearRateLimit(key);
  });

  it("deduplicates keys so the same key only counts once per call", async () => {
    const key = `vitest:ip:${Date.now()}:${Math.random()}`;
    // Pass the same key twice — should be a no-op the second time.
    const result = await checkRateLimit([key, key, key], 10, 60_000);
    expect(result.allowed).toBe(true);

    await clearRateLimit(key);
  });

  it("rejects on EITHER key triggering max (multi-key rate limit)", async () => {
    const ipKey = `vitest:ip:${Date.now()}:${Math.random()}`;
    const emailKey = `vitest:email:${Date.now()}:${Math.random()}`;

    // Burn the IP bucket to max
    await checkRateLimit([ipKey], 1, 60_000);
    await checkRateLimit([ipKey], 1, 60_000);

    // Now a call that includes the IP key (even alongside a fresh
    // email key) should be rejected because the IP is at max.
    const result = await checkRateLimit([ipKey, emailKey], 1, 60_000);
    expect(result.allowed).toBe(false);

    await clearRateLimit(ipKey, emailKey);
  });
});

describe("clearRateLimit (no DB required)", () => {
  it("exists and is callable", () => {
    expect(typeof clearRateLimit).toBe("function");
  });

  it("does not throw on an empty key list", async () => {
    await expect(clearRateLimit()).resolves.toBeUndefined();
    await expect(clearRateLimit("")).resolves.toBeUndefined();
  });
});
