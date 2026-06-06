import { describe, expect, it } from "vitest";
import {
  NoteCreateBody,
  TaskCreateBody,
  TeamCreateBody,
  GroupCreateBody,
  RoleCreateBody,
  UserCreateBody,
  CalendarCreateBody,
  ShareBody,
} from "@/lib/schemas";

/**
 * These tests exercise the request-body Zod schemas in isolation. The
 * actual route handlers wrap them, but if the schemas are wrong every
 * caller is wrong. Each schema is a copy of the one used by the route.
 *
 * The full set lives in lib/schemas.ts; this file is the regression
 * suite for them.
 */

describe("NoteCreateBody", () => {
  it("accepts a minimal note", () => {
    const r = NoteCreateBody.safeParse({ title: "x" });
    expect(r.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const r = NoteCreateBody.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a too-long title", () => {
    const r = NoteCreateBody.safeParse({ title: "x".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed CUID", () => {
    const r = NoteCreateBody.safeParse({ title: "x", teamId: "not-a-cuid" });
    expect(r.success).toBe(false);
  });
});

describe("ShareBody", () => {
  it("requires exactly one share target", () => {
    expect(ShareBody.safeParse({}).success).toBe(false);
    expect(
      ShareBody.safeParse({
        teamId: "ckxxxxxxxxxxxxxxxxxxxxxx",
        userId: "ckxxxxxxxxxxxxxxxxxxxxxy",
      }).success,
    ).toBe(false);
  });
});

describe("TaskCreateBody", () => {
  it("requires teamId/boardId/columnId", () => {
    const r = TaskCreateBody.safeParse({ title: "x" });
    expect(r.success).toBe(false);
  });

  it("accepts a well-formed task", () => {
    const r = TaskCreateBody.safeParse({
      title: "Build it",
      teamId: "ckxxxxxxxxxxxxxxxxxxxxxx",
      boardId: "ckxxxxxxxxxxxxxxxxxxxxxy",
      columnId: "ckxxxxxxxxxxxxxxxxxxxxxz",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid priority", () => {
    const r = TaskCreateBody.safeParse({
      title: "x",
      teamId: "ckxxxxxxxxxxxxxxxxxxxxxx",
      boardId: "ckxxxxxxxxxxxxxxxxxxxxxy",
      columnId: "ckxxxxxxxxxxxxxxxxxxxxxz",
      priority: "urgent",
    });
    expect(r.success).toBe(false);
  });
});

describe("TeamCreateBody", () => {
  it("requires a name", () => {
    const r = TeamCreateBody.safeParse({});
    expect(r.success).toBe(false);
  });

  it("accepts a name + description", () => {
    const r = TeamCreateBody.safeParse({ name: "Eng", description: "x" });
    expect(r.success).toBe(true);
  });
});

describe("GroupCreateBody", () => {
  it("requires name + teamId", () => {
    const r = GroupCreateBody.safeParse({ name: "Frontend" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid teamId", () => {
    const r = GroupCreateBody.safeParse({ name: "x", teamId: "bad" });
    expect(r.success).toBe(false);
  });
});

describe("RoleCreateBody", () => {
  it("rejects unknown permissions", () => {
    const r = RoleCreateBody.safeParse({
      name: "Reviewer",
      permissions: ["totally:fabricated"],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a known permission", () => {
    const r = RoleCreateBody.safeParse({
      name: "Reviewer",
      permissions: ["notes:create"],
    });
    expect(r.success).toBe(true);
  });
});

describe("UserCreateBody", () => {
  it("requires email, name, password", () => {
    const r = UserCreateBody.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects a short password", () => {
    const r = UserCreateBody.safeParse({
      email: "a@b.co",
      name: "A",
      password: "short",
    });
    expect(r.success).toBe(false);
  });

  it("lowercases the email", () => {
    const r = UserCreateBody.safeParse({
      email: "Mixed@Case.COM",
      name: "A",
      password: "longenoughpassword",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("mixed@case.com");
    }
  });
});

describe("CalendarCreateBody", () => {
  it("requires a title and ISO startDate", () => {
    const r = CalendarCreateBody.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects a non-ISO startDate", () => {
    const r = CalendarCreateBody.safeParse({
      title: "Sprint",
      startDate: "tomorrow at 9",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const r = CalendarCreateBody.safeParse({
      title: "Sprint",
      startDate: "2026-06-06T12:00:00.000Z",
      endDate: "2026-06-06T11:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });
});
