import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the audit-log writer. We mock the Prisma client because
 * the real one needs a live Postgres connection. The function under
 * test is pure: it takes a record and writes a row.
 */
const mocks = vi.hoisted(() => ({
  auditLogCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: mocks.auditLogCreate,
    },
  },
}));

import { logAudit } from "@/lib/audit";

beforeEach(() => {
  mocks.auditLogCreate.mockReset();
  mocks.auditLogCreate.mockResolvedValue({ id: "audit-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logAudit", () => {
  it("writes a row with the actor, action, entity, and teamId", async () => {
    await logAudit({
      actorId: "user-1",
      action: "create",
      entityType: "note",
      entityId: "note-1",
      teamId: "team-1",
    });

    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        action: "create",
        entityType: "note",
        entityId: "note-1",
        teamId: "team-1",
        groupId: undefined,
        metadata: {},
        beforeData: {},
        afterData: {},
      },
    });
  });

  it("passes groupId through when provided", async () => {
    await logAudit({
      actorId: "user-1",
      action: "update",
      entityType: "task",
      entityId: "task-1",
      teamId: "team-1",
      groupId: "group-1",
    });

    expect(mocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groupId: "group-1" }),
      }),
    );
  });

  it("omits teamId and groupId when not provided (Prisma will store NULL)", async () => {
    await logAudit({
      actorId: "user-1",
      action: "login",
      entityType: "user",
      entityId: "user-1",
    });

    const call = mocks.auditLogCreate.mock.calls[0]?.[0];
    expect(call.data.teamId).toBeUndefined();
    expect(call.data.groupId).toBeUndefined();
  });

  it("serializes metadata to JSON", async () => {
    await logAudit({
      actorId: "user-1",
      action: "create",
      entityType: "note",
      entityId: "note-1",
      metadata: { title: "Hello", tags: ["a", "b"], nested: { x: 1 } },
    });

    const call = mocks.auditLogCreate.mock.calls[0]?.[0];
    expect(call.data.metadata).toEqual({
      title: "Hello",
      tags: ["a", "b"],
      nested: { x: 1 },
    });
  });

  it("stores beforeData and afterData as-is (Prisma InputJsonValue)", async () => {
    await logAudit({
      actorId: "user-1",
      action: "update",
      entityType: "note",
      entityId: "note-1",
      beforeData: { title: "old" },
      afterData: { title: "new" },
    });

    const call = mocks.auditLogCreate.mock.calls[0]?.[0];
    expect(call.data.beforeData).toEqual({ title: "old" });
    expect(call.data.afterData).toEqual({ title: "new" });
  });

  it("returns whatever Prisma returns (used for chaining)", async () => {
    const expected = { id: "audit-xyz", createdAt: new Date() };
    mocks.auditLogCreate.mockResolvedValueOnce(expected);

    const result = await logAudit({
      actorId: "u",
      action: "create",
      entityType: "thing",
      entityId: "thing-1",
    });

    expect(result).toEqual(expected);
  });

  it("does not log anything by itself (no console output, no side effects)", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await logAudit({
      actorId: "u",
      action: "create",
      entityType: "thing",
      entityId: "thing-1",
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
