import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_PERMISSIONS } from "@/lib/permissions";

/**
 * Tests for the permission-resolution layer. We mock the Prisma client
 * with `vi.mock` so the functions under test see our fake `findUnique`
 * / `findMany` implementations. The real Prisma client would need a
 * live Postgres connection, which is not available in unit tests.
 *
 * The `vi.fn()` instances are hoisted via `vi.hoisted()` so that
 * they're created before the `vi.mock` factory runs (vitest hoists
 * `vi.mock` to the very top of the file, ahead of imports).
 *
 * IMPORTANT: We do not call `vi.clearAllMocks()` in afterEach because
 * that would wipe the `mockResolvedValue` queues, but we keep
 * `mockReset` in beforeEach so each test starts clean.
 */
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    userRole: { findMany: mocks.findMany },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { prisma as _prisma } from "@/lib/prisma";
import {
  getUserPermissions,
  hasPermission,
  requirePermission,
} from "@/lib/permissions-server";

void _prisma;

function setAdmin(isAdmin: boolean) {
  mocks.findUnique.mockResolvedValue({ isAdmin });
}

function setRoles(
  roles: Array<{
    role: {
      teamId: string | null;
      isPlatform: boolean;
      permissions: { permission: string }[];
    };
  }>,
) {
  mocks.findMany.mockResolvedValue(roles);
}

function setNoUser() {
  mocks.findUnique.mockResolvedValue(null);
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.findMany.mockReset();
});

afterEach(() => {
  // No clearAllMocks — see file header.
});

describe("getUserPermissions — admin bypass (the critical security fix)", () => {
  it("returns every defined permission for an admin, ignoring roles", async () => {
    setAdmin(true);
    // Even if findMany returns nothing, admin should still get everything.
    setRoles([]);

    const perms = await getUserPermissions("admin-user");

    expect(perms.size).toBe(ALL_PERMISSIONS.length);
    for (const p of ALL_PERMISSIONS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it("an admin's permissions do not include any 'fake' permission not in ALL_PERMISSIONS", async () => {
    setAdmin(true);
    setRoles([]);

    const perms = await getUserPermissions("admin-user");

    // The set should be exactly ALL_PERMISSIONS, no extras.
    expect(perms.size).toBe(ALL_PERMISSIONS.length);
  });

  it("returns an empty set when the user doesn't exist", async () => {
    setNoUser();
    setRoles([]);

    const perms = await getUserPermissions("ghost");
    expect(perms.size).toBe(0);
  });
});

describe("getUserPermissions — role resolution for non-admins", () => {
  it("unions permissions from team-scoped roles", async () => {
    setAdmin(false);
    setRoles([
      {
        role: {
          teamId: "team-1",
          isPlatform: false,
          permissions: [
            { permission: "notes:create" },
            { permission: "notes:edit_own" },
          ],
        },
      },
    ]);

    const perms = await getUserPermissions("user-1", "team-1");
    expect(perms).toEqual(new Set(["notes:create", "notes:edit_own"]));
  });

  it("unions permissions from platform-scoped roles", async () => {
    setAdmin(false);
    setRoles([
      {
        role: {
          teamId: null,
          isPlatform: true,
          permissions: [{ permission: "users:create" }],
        },
      },
    ]);

    const perms = await getUserPermissions("user-1");
    expect(perms.has("users:create")).toBe(true);
  });

  it("deduplicates permissions granted by multiple roles", async () => {
    setAdmin(false);
    setRoles([
      {
        role: {
          teamId: "team-1",
          isPlatform: false,
          permissions: [{ permission: "notes:create" }],
        },
      },
      {
        role: {
          teamId: "team-1",
          isPlatform: false,
          permissions: [
            { permission: "notes:create" },
            { permission: "notes:edit_own" },
          ],
        },
      },
    ]);

    const perms = await getUserPermissions("user-1", "team-1");
    expect(perms.size).toBe(2);
  });

  it("returns an empty set when the user has no roles", async () => {
    setAdmin(false);
    setRoles([]);

    const perms = await getUserPermissions("user-1", "team-1");
    expect(perms.size).toBe(0);
  });
});

describe("hasPermission", () => {
  it("returns true for an admin for any permission in ALL_PERMISSIONS", async () => {
    setAdmin(true);

    // An admin gets every defined permission, even ones they
    // wouldn't otherwise have.
    for (const p of ALL_PERMISSIONS) {
      expect(await hasPermission("admin", p)).toBe(true);
    }
  });

  it("returns false for an admin asking about a permission name that doesn't exist at all", async () => {
    // hasPermission is membership-based, not "is admin" based. A truly
    // unknown permission (not in ALL_PERMISSIONS) returns false even
    // for an admin. This is the safer behavior — typos in permission
    // names become visible as 403s, not silent allows.
    setAdmin(true);
    expect(await hasPermission("admin", "totally:made:up:permission")).toBe(false);
  });

  it("returns true when a non-admin has the permission", async () => {
    setAdmin(false);
    setRoles([
      {
        role: {
          teamId: null,
          isPlatform: true,
          permissions: [{ permission: "notes:create" }],
        },
      },
    ]);

    expect(await hasPermission("user-1", "notes:create")).toBe(true);
  });

  it("returns false when a non-admin doesn't have the permission", async () => {
    setAdmin(false);
    setRoles([
      {
        role: {
          teamId: null,
          isPlatform: true,
          permissions: [{ permission: "notes:create" }],
        },
      },
    ]);

    expect(await hasPermission("user-1", "notes:delete_others")).toBe(false);
  });

  it("queries Prisma with the right shape (userId + teamId OR platform)", async () => {
    setAdmin(false);
    setRoles([]);

    // hasPermission signature is (userId, permission, teamId)
    await hasPermission("user-xyz", "notes:create", "team-42");

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-xyz",
        OR: [
          { role: { teamId: "team-42" } },
          { role: { isPlatform: true } },
        ],
      },
      include: { role: { include: { permissions: true } } },
    });
  });

  it("queries Prisma with teamId=null when no team is in scope", async () => {
    setAdmin(false);
    setRoles([]);

    await hasPermission("user-xyz", "notes:create");

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-xyz",
        OR: [
          { role: { teamId: null } },
          { role: { isPlatform: true } },
        ],
      },
      include: { role: { include: { permissions: true } } },
    });
  });
});

describe("requirePermission", () => {
  it("returns silently when an admin asks for any defined permission", async () => {
    setAdmin(true);

    // Pick any real permission and verify the call resolves.
    await expect(
      requirePermission("admin", "notes:create"),
    ).resolves.toBeUndefined();
  });

  it("throws a typed Forbidden error when the user lacks the permission", async () => {
    setAdmin(false);
    setRoles([]);

    await expect(
      requirePermission("user-1", "notes:delete_others"),
    ).rejects.toThrow(/Forbidden: notes:delete_others required/);
  });

  it("the thrown error includes the exact permission name", async () => {
    setAdmin(false);
    setRoles([]);

    try {
      await requirePermission("user-1", "audit:view_all");
    } catch (err) {
      expect((err as Error).message).toBe(
        "Forbidden: audit:view_all required",
      );
      return;
    }
    expect.fail("expected requirePermission to throw");
  });
});
