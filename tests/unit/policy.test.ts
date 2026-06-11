import { describe, expect, it } from "vitest";
import {
  canAccessNote,
  canChangePassword,
  canEditCalendarEntry,
  canEditTask,
  canManageNote,
  hasPolicyPermission,
  requireTeamAccess,
  toPolicyUser,
  validateNoteShareTarget,
  validateTaskScope,
  type PolicyUser,
} from "@/lib/policy";

const member: PolicyUser = {
  id: "user-1",
  isAdmin: false,
  teamIds: new Set(["team-1"]),
  permissions: new Set([
    "notes:view_shared",
    "notes:edit_own",
    "tasks:edit_own",
    "calendar:edit_own",
  ]),
};

const admin: PolicyUser = {
  id: "admin-1",
  isAdmin: true,
  teamIds: new Set<string>(),
  permissions: new Set<string>(),
};

describe("hasPolicyPermission", () => {
  it("lets admins pass without an explicit permission", () => {
    expect(hasPolicyPermission(admin, "anything:goes")).toBe(true);
  });
  it("requires the permission for non-admins", () => {
    expect(hasPolicyPermission(member, "notes:view_shared")).toBe(true);
    expect(hasPolicyPermission(member, "notes:delete_others")).toBe(false);
  });
});

describe("requireTeamAccess", () => {
  it("throws for non-members", () => {
    expect(() => requireTeamAccess(member, "team-2")).toThrow(/Forbidden/);
  });
  it("accepts members", () => {
    expect(() => requireTeamAccess(member, "team-1")).not.toThrow();
  });
  it("accepts admins for any team", () => {
    expect(() => requireTeamAccess(admin, "team-99")).not.toThrow();
  });
});

describe("canManageNote", () => {
  it("lets owners manage their own note", () => {
    expect(canManageNote(member, { ownerId: "user-1" })).toBe(true);
  });
  it("blocks non-owner non-admin", () => {
    expect(canManageNote(member, { ownerId: "user-2" })).toBe(false);
  });
  it("lets admins manage any note", () => {
    expect(canManageNote(admin, { ownerId: "user-2" })).toBe(true);
  });
});

describe("canChangePassword", () => {
  it("lets a user change their own password without forceReset", () => {
    expect(canChangePassword(member, "user-1", false)).toBe(true);
  });
  it("blocks a non-admin from resetting another user", () => {
    expect(canChangePassword(member, "user-2", false)).toBe(false);
    expect(canChangePassword(member, "user-2", true)).toBe(false);
  });
  it("lets an admin force-reset another user", () => {
    expect(canChangePassword(admin, "user-2", true)).toBe(true);
  });
  it("blocks an admin from non-force-resetting another user", () => {
    expect(canChangePassword(admin, "user-2", false)).toBe(false);
  });
});

describe("canAccessNote", () => {
  it("lets the owner read their own note", () => {
    expect(
      canAccessNote(member, {
        ownerId: "user-1",
        teamId: "team-1",
        isPrivate: true,
        shares: [],
      }),
    ).toBe(true);
  });
  it("blocks non-members from another team's public note", () => {
    expect(
      canAccessNote(member, {
        ownerId: "user-2",
        teamId: "team-2",
        isPrivate: false,
        shares: [],
      }),
    ).toBe(false);
  });
  it("lets team members read a non-private team note in their team", () => {
    expect(
      canAccessNote(member, {
        ownerId: "user-2",
        teamId: "team-1",
        isPrivate: false,
        shares: [],
      }),
    ).toBe(true);
  });
  it("blocks public team notes without notes:view_shared", () => {
    const stranger: PolicyUser = {
      id: "u",
      isAdmin: false,
      teamIds: new Set(["team-1"]),
      permissions: new Set(),
    };
    expect(
      canAccessNote(stranger, {
        ownerId: "user-2",
        teamId: "team-1",
        isPrivate: false,
        shares: [],
      }),
    ).toBe(false);
  });
  it("lets directly-shared users read a private note", () => {
    expect(
      canAccessNote(member, {
        ownerId: "user-2",
        teamId: null,
        isPrivate: true,
        shares: [{ userId: "user-1", teamId: null }],
      }),
    ).toBe(true);
  });
  it("lets admins read any note", () => {
    expect(
      canAccessNote(admin, {
        ownerId: "user-2",
        teamId: "team-2",
        isPrivate: true,
        shares: [],
      }),
    ).toBe(true);
  });
});

describe("canEditTask", () => {
  const task = { createdById: "user-1", assigneeId: "user-2", teamId: "team-1" };

  it("lets the creator edit non-protected fields", () => {
    expect(canEditTask(member, task, ["title"])).toBe(true);
  });
  it("blocks reassignment without tasks:reassign_users", () => {
    expect(canEditTask(member, task, ["assigneeId"])).toBe(false);
  });
  it("blocks editing tasks in another team", () => {
    expect(canEditTask(member, { ...task, teamId: "team-2" }, ["title"])).toBe(false);
  });
  it("lets admins edit anything", () => {
    expect(canEditTask(admin, task, ["title", "assigneeId", "teamId"])).toBe(true);
  });
});

describe("canEditCalendarEntry", () => {
  it("lets the owner edit their entry with calendar:edit_own", () => {
    expect(canEditCalendarEntry(member, { userId: "user-1", teamId: "team-1" })).toBe(true);
  });
  it("blocks editing another user's entry without calendar:edit_others", () => {
    expect(canEditCalendarEntry(member, { userId: "user-2", teamId: "team-1" })).toBe(false);
  });
  it("lets admins edit any entry", () => {
    expect(canEditCalendarEntry(admin, { userId: "user-2", teamId: "team-99" })).toBe(true);
  });
});

describe("validateNoteShareTarget", () => {
  it("rejects no target", () => {
    expect(() => validateNoteShareTarget(null, null)).toThrow(/exactly one/i);
  });
  it("rejects both targets", () => {
    expect(() => validateNoteShareTarget("team-1", "user-1")).toThrow(/exactly one/i);
  });
  it("accepts a team-only share", () => {
    expect(() => validateNoteShareTarget("team-1", null)).not.toThrow();
  });
  it("accepts a user-only share", () => {
    expect(() => validateNoteShareTarget(null, "user-1")).not.toThrow();
  });
});

describe("validateTaskScope", () => {
  const ok = {
    teamId: "team-1",
    boardTeamId: "team-1",
    boardId: "board-1",
    columnBoardId: "board-1",
  };

  it("accepts a consistent scope", () => {
    expect(() => validateTaskScope(ok)).not.toThrow();
  });
  it("rejects a board in a different team", () => {
    expect(() => validateTaskScope({ ...ok, boardTeamId: "team-2" })).toThrow(/same team/i);
  });
  it("rejects a column from a different board", () => {
    expect(() => validateTaskScope({ ...ok, columnBoardId: "board-2" })).toThrow(/same board/i);
  });
});

describe("toPolicyUser", () => {
  it("builds a PolicyUser from a SessionUser-like shape", () => {
    const sessionUser = {
      id: "u1",
      isAdmin: false,
      memberships: [{ teamId: "t1" }, { teamId: "t2" }],
      userRoles: [
        {
          role: {
            teamId: "t1",
            isPlatform: false,
            permissions: [{ permission: "notes:create" }],
          },
        },
      ],
    };
    const policy = toPolicyUser(sessionUser, "t1");
    expect(policy.id).toBe("u1");
    expect(policy.isAdmin).toBe(false);
    expect(policy.teamIds).toEqual(new Set(["t1", "t2"]));
    expect(policy.permissions.has("notes:create")).toBe(true);
  });

  it("applies platform-level roles regardless of team", () => {
    const sessionUser = {
      id: "u1",
      isAdmin: false,
      memberships: [{ teamId: "t1" }],
      userRoles: [
        {
          role: {
            teamId: null,
            isPlatform: true,
            permissions: [{ permission: "users:create" }],
          },
        },
      ],
    };
    const policy = toPolicyUser(sessionUser, "t1");
    expect(policy.permissions.has("users:create")).toBe(true);
  });
});
