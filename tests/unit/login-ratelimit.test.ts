import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

/**
 * Tests for the rate-limit key construction in the login route.
 * The bug being prevented: when TRUST_PROXY is unset, getClientIp
 * returns "". If we passed an empty "ip:" key to the rate limiter,
 * every request from every user would share the same bucket and a
 * single user failing login would throttle everyone.
 *
 * We mock the route's collaborators (prisma, iron-session, audit,
 * rate-limit) and call the exported POST handler directly. Then we
 * assert what keys the rate limiter received.
 */
const mocks = vi.hoisted(() => ({
  prismaUserFindUnique: vi.fn(),
  checkRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  getSession: vi.fn(),
  save: vi.fn(),
  destroy: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.prismaUserFindUnique } },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  clearRateLimit: mocks.clearRateLimit,
}));

const sessionObj = {
  userId: undefined as string | undefined,
  email: undefined as string | undefined,
  name: undefined as string | undefined,
  isAdmin: undefined as boolean | undefined,
  sessionVersion: undefined as number | undefined,
  passwordChangeOnly: undefined as boolean | undefined,
  save: mocks.save,
  destroy: mocks.destroy,
};
mocks.getSession.mockResolvedValue(sessionObj);

vi.mock("@/lib/auth", () => ({
  getSession: mocks.getSession,
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

// Dynamic import AFTER all mocks are wired up.
const { POST } = await import("@/app/api/auth/login/route");

beforeEach(() => {
  // Reset all mocks
  mocks.prismaUserFindUnique.mockReset();
  mocks.checkRateLimit.mockReset();
  mocks.clearRateLimit.mockReset();
  mocks.save.mockReset();
  mocks.destroy.mockReset();
  mocks.logAudit.mockReset();
  mocks.getSession.mockClear();

  // Default: rate limit allows, no user found (we only test the keys
  // passed to checkRateLimit before the user lookup)
  mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });

  // Default: user lookup returns null (so we can short-circuit at the
  // rate-limit step). The keys assertion happens before the user
  // lookup, so this is fine.
  mocks.prismaUserFindUnique.mockResolvedValue(null);

  // Reset the session object's persisted state
  for (const k of Object.keys(sessionObj)) {
    if (k !== "save" && k !== "destroy") {
      delete (sessionObj as Record<string, unknown>)[k];
    }
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TRUST_PROXY;
});

function makeLoginRequest(body: unknown, ipHeader?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ipHeader) {
    headers["x-forwarded-for"] = ipHeader;
    headers["x-real-ip"] = ipHeader;
  }
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("login route — rate-limit key construction", () => {
  it("includes the IP key only when TRUST_PROXY=1 and a header is present", async () => {
    process.env.TRUST_PROXY = "1";
    await POST(makeLoginRequest({ email: "u@example.com", password: "x" }, "1.2.3.4"));

    expect(mocks.checkRateLimit).toHaveBeenCalledWith([
      "email:u@example.com",
      "ip:1.2.3.4",
    ]);
  });

  it("skips the IP key entirely when TRUST_PROXY=1 but no header is present", async () => {
    process.env.TRUST_PROXY = "1";
    await POST(makeLoginRequest({ email: "u@example.com", password: "x" }));

    const keys = mocks.checkRateLimit.mock.calls[0]?.[0] as string[];
    expect(keys).toEqual(["email:u@example.com"]);
    expect(keys.some((k) => k.startsWith("ip:"))).toBe(false);
  });

  it("skips the IP key when TRUST_PROXY is unset (default — the bug fix)", async () => {
    // TRUST_PROXY is not set.
    await POST(makeLoginRequest({ email: "u@example.com", password: "x" }, "1.2.3.4"));

    const keys = mocks.checkRateLimit.mock.calls[0]?.[0] as string[];
    expect(keys).toEqual(["email:u@example.com"]);
    // Critical: the IP key must NOT be present, otherwise every request
    // would share the same empty-IP bucket.
    expect(keys.some((k) => k.startsWith("ip:"))).toBe(false);
  });

  it("skips the IP key when TRUST_PROXY is some other value (not '1')", async () => {
    process.env.TRUST_PROXY = "true"; // truthy but not "1"
    await POST(makeLoginRequest({ email: "u@example.com", password: "x" }, "1.2.3.4"));

    const keys = mocks.checkRateLimit.mock.calls[0]?.[0] as string[];
    expect(keys).toEqual(["email:u@example.com"]);
  });

  it("returns 429 when the rate limit rejects", async () => {
    process.env.TRUST_PROXY = "1";
    mocks.checkRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const res = await POST(
      makeLoginRequest({ email: "u@example.com", password: "x" }, "1.2.3.4"),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});
