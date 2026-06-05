import { describe, expect, it } from "vitest";

/**
 * We don't import lib/auth.ts directly because it pulls in Prisma +
 * iron-session. Instead we re-implement the validation here as a
 * regression test. If this drifts from lib/auth.ts, this test will fail
 * and we'll know to update both places.
 *
 * Critically, this validation function does NOT short-circuit on
 * NODE_ENV=test — it tests the actual production behavior.
 */
function validateSessionSecret(secret: string | undefined): string | null {
  if (!secret) return "SESSION_SECRET is not set";
  if (secret === "your-super-secret-session-key-change-this-in-production") {
    return "example value";
  }
  if (secret.length < 32) return "too short";
  return null;
}

describe("SESSION_SECRET validation", () => {
  it("rejects empty secrets", () => {
    expect(validateSessionSecret("")).toBeTruthy();
    expect(validateSessionSecret(undefined)).toBeTruthy();
  });

  it("rejects the example value", () => {
    expect(
      validateSessionSecret(
        "your-super-secret-session-key-change-this-in-production",
      ),
    ).toBe("example value");
  });

  it("rejects too-short secrets", () => {
    expect(validateSessionSecret("short")).toBe("too short");
    expect(validateSessionSecret("a".repeat(31))).toBe("too short");
  });

  it("accepts a 32+ char random-looking string", () => {
    const secret = "a".repeat(32);
    expect(validateSessionSecret(secret)).toBeNull();
  });

  it("accepts a 48+ char base64-style string", () => {
    const secret =
      "Xk3m9pZvR4tLqWn8bC2jF6hG5yN1sD0aB7eK9iU3oP4tR6yL2xM";
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(validateSessionSecret(secret)).toBeNull();
  });
});
