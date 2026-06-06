import { describe, expect, it } from "vitest";
import {
  canReadNote,
  requiresCurrentPassword,
  validateCalendarDates,
} from "@/lib/access";

describe("canReadNote", () => {
  it("does not expose a public team note outside its team", () => {
    expect(
      canReadNote(
        {
          ownerId: "owner",
          teamId: "team-a",
          isPrivate: false,
          shares: [],
        },
        "outsider",
        ["team-b"],
      ),
    ).toBe(false);
  });

  it("allows owners, team members, and explicit shares", () => {
    const note = {
      ownerId: "owner",
      teamId: "team-a",
      isPrivate: false,
      shares: [{ userId: "shared-user", teamId: null }],
    };
    expect(canReadNote(note, "owner", [])).toBe(true);
    expect(canReadNote(note, "member", ["team-a"])).toBe(true);
    expect(canReadNote(note, "shared-user", [])).toBe(true);
  });
});

describe("requiresCurrentPassword", () => {
  it("requires a current password for every self-service change", () => {
    expect(
      requiresCurrentPassword({
        actorId: "user",
        targetId: "user",
        actorIsAdmin: true,
      }),
    ).toBe(true);
  });

  it("allows an admin to reset another user without their password", () => {
    expect(
      requiresCurrentPassword({
        actorId: "admin",
        targetId: "user",
        actorIsAdmin: true,
      }),
    ).toBe(false);
  });
});

describe("validateCalendarDates", () => {
  it("rejects an end before the start", () => {
    expect(
      validateCalendarDates(
        "2026-06-06T12:00:00.000Z",
        "2026-06-06T11:00:00.000Z",
      ),
    ).toBe(false);
  });
});
