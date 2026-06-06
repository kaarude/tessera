import { describe, expect, it, vi } from "vitest";
import { reconcileSessionVersion } from "@/lib/auth";

/**
 * Tests for the sessionVersion reconciliation logic that runs inside
 * requireAuth(). Extracted into a pure helper so it can be tested
 * without standing up the full iron-session / Prisma chain.
 *
 * The behavior this guards:
 *   1. Pre-migration sessions (sessionVersion === undefined) issued
 *      for a user who hasn't rotated their password (user at v0)
 *      should be upgraded in place, not destroyed. This prevents
 *      the deploy of the sessionVersion migration from logging
 *      every active user out.
 *   2. Pre-migration sessions for a user who DID rotate their
 *      password before the deploy landed (user at vN>0) are
 *      treated as stale and destroyed — no security downgrade.
 *   3. Post-migration sessions whose version doesn't match the
 *      user's current version are destroyed (the normal
 *      "you logged in elsewhere / password was rotated" path).
 */
describe("reconcileSessionVersion", () => {
  function fakeSession(initial?: number) {
    return {
      sessionVersion: initial,
      destroy: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("upgrades a pre-migration session when the user is still at v0", async () => {
    const session = fakeSession(undefined);
    await reconcileSessionVersion(session, 0);

    expect(session.sessionVersion).toBe(0);
    expect(session.save).toHaveBeenCalled();
    expect(session.destroy).not.toHaveBeenCalled();
  });

  it("destroys a pre-migration session when the user has rotated their password (vN>0)", async () => {
    const session = fakeSession(undefined);
    await expect(reconcileSessionVersion(session, 1)).rejects.toThrow(
      "Unauthorized",
    );
    expect(session.destroy).toHaveBeenCalled();
    expect(session.save).not.toHaveBeenCalled();
  });

  it("destroys a session whose version doesn't match the user's current version", async () => {
    const session = fakeSession(0);
    await expect(reconcileSessionVersion(session, 1)).rejects.toThrow(
      "Unauthorized",
    );
    expect(session.destroy).toHaveBeenCalled();
  });

  it("allows a session whose version matches the user's", async () => {
    const session = fakeSession(0);
    await reconcileSessionVersion(session, 0);

    expect(session.destroy).not.toHaveBeenCalled();
    expect(session.save).not.toHaveBeenCalled();
  });

  it("allows a session at a higher version that matches", async () => {
    const session = fakeSession(5);
    await reconcileSessionVersion(session, 5);

    expect(session.destroy).not.toHaveBeenCalled();
  });

  it("rejects when the user has bumped to a higher version (post-rotation)", async () => {
    // Session says 1, but user is now at 2 (rotated their password
    // after this session was issued).
    const session = fakeSession(1);
    await expect(reconcileSessionVersion(session, 2)).rejects.toThrow(
      "Unauthorized",
    );
    expect(session.destroy).toHaveBeenCalled();
  });
});
