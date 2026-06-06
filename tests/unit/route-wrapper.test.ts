import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

/**
 * Tests for the route-handler wrapper and the error mapper. We mock
 * the auth and permission modules so we can exercise the wrapper
 * without a real database.
 */
const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.requireAuth,
  requireAdmin: mocks.requireAdmin,
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/permissions-server", () => ({
  requirePermission: mocks.requirePermission,
}));

import { withRoute, mapError } from "@/lib/route";

const fakeUser = {
  id: "user-1",
  email: "u@example.com",
  name: "User",
  isAdmin: false,
  passwordHash: "x",
  avatarUrl: null,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [],
  userRoles: [],
};

beforeEach(() => {
  mocks.requireAuth.mockReset();
  mocks.requireAdmin.mockReset();
  mocks.requirePermission.mockReset();
  mocks.requireAuth.mockResolvedValue(fakeUser);
  mocks.requireAdmin.mockResolvedValue({ ...fakeUser, isAdmin: true });
  mocks.requirePermission.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/test", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("withRoute — auth gate", () => {
  it("returns 401 when requireAuth throws Unauthorized", async () => {
    mocks.requireAuth.mockRejectedValue(new Error("Unauthorized"));

    const handler = withRoute(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 401 when requireAdmin throws Unauthorized (adminOnly)", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));

    const handler = withRoute(async () => NextResponse.json({ ok: true }), {
      adminOnly: true,
    });
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 403 when requireAdmin throws Forbidden (adminOnly)", async () => {
    mocks.requireAdmin.mockRejectedValue(
      new Error("Forbidden: Admin required"),
    );

    const handler = withRoute(async () => NextResponse.json({ ok: true }), {
      adminOnly: true,
    });
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(403);
  });

  it("passes the user to the handler on success", async () => {
    const handler = withRoute(async ({ user }) =>
      NextResponse.json({ id: user.id, isAdmin: user.isAdmin }),
    );

    const res = await handler(makeRequest({}));
    const body = await res.json();
    expect(body).toEqual({ id: "user-1", isAdmin: false });
  });
});

describe("withRoute — permission gate", () => {
  it("calls requirePermission with the route's teamId from the body", async () => {
    const handler = withRoute(async () => NextResponse.json({ ok: true }), {
      permission: "notes:create",
    });

    await handler(makeRequest({ teamId: "team-42", title: "x" }));

    expect(mocks.requirePermission).toHaveBeenCalledWith(
      "user-1",
      "notes:create",
      "team-42",
    );
  });

  it("returns 403 when requirePermission throws Forbidden", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Forbidden: notes:create required"),
    );

    const handler = withRoute(async () => NextResponse.json({ ok: true }), {
      permission: "notes:create",
    });
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(403);
  });

  it("does not call requirePermission when no permission option is set", async () => {
    const handler = withRoute(async () => NextResponse.json({ ok: true }));
    await handler(makeRequest({}));

    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });
});

describe("withRoute — body parsing", () => {
  it("parses a JSON body for non-GET methods", async () => {
    let captured: unknown;
    const handler = withRoute(async ({ body }) => {
      captured = body;
      return NextResponse.json({ ok: true });
    });

    await handler(makeRequest({ hello: "world" }));
    expect(captured).toEqual({ hello: "world" });
  });

  it("passes {} when the method is GET", async () => {
    let captured: unknown = "sentinel";
    const handler = withRoute(async ({ body }) => {
      captured = body;
      return NextResponse.json({ ok: true });
    });

    await handler(makeRequest(undefined, "GET"));
    expect(captured).toEqual({});
  });

  it("falls back to {} when the body is empty for a POST", async () => {
    let captured: unknown = "sentinel";
    const handler = withRoute(async ({ body }) => {
      captured = body;
      return NextResponse.json({ ok: true });
    });

    await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(captured).toEqual({});
  });

  it("falls back to {} when the body is not valid JSON", async () => {
    let captured: unknown = "sentinel";
    const handler = withRoute(async ({ body }) => {
      captured = body;
      return NextResponse.json({ ok: true });
    });

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: "not json{",
    });
    await handler(req);
    expect(captured).toEqual({});
  });

  it("parses HEAD requests the same as GET (no body)", async () => {
    let captured: unknown = "sentinel";
    const handler = withRoute(async ({ body }) => {
      captured = body;
      return NextResponse.json({ ok: true });
    });

    await handler(makeRequest(undefined, "HEAD"));
    expect(captured).toEqual({});
  });
});

describe("withRoute — params passing", () => {
  it("awaits ctx.params and passes them to the handler", async () => {
    const handler = withRoute<{ id: string }>(async ({ params }) =>
      NextResponse.json({ id: params.id }),
    );

    const req = makeRequest();
    const ctx = { params: Promise.resolve({ id: "abc-123" }) };
    const res = await handler(req, ctx);

    const body = await res.json();
    expect(body).toEqual({ id: "abc-123" });
  });

  it("defaults params to {} when ctx is missing", async () => {
    let captured: unknown = "sentinel";
    const handler = withRoute(async ({ params }) => {
      captured = params;
      return NextResponse.json({ ok: true });
    });

    await handler(makeRequest());
    expect(captured).toEqual({});
  });
});

describe("withRoute — error handling", () => {
  it("returns 500 for an unhandled exception in the handler", async () => {
    const handler = withRoute(async () => {
      throw new Error("database is on fire");
    });

    const res = await handler(makeRequest({}));
    expect(res.status).toBe(500);
  });

  it("returns 400 with details for a ZodError", async () => {
    const handler = withRoute(async () => {
      const zodError = new Error("Invalid input") as Error & {
        name: string;
        issues: unknown;
      };
      zodError.name = "ZodError";
      zodError.issues = [
        { path: ["email"], message: "Required" },
      ];
      throw zodError;
    });

    const res = await handler(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
    expect(body.details).toEqual([{ path: ["email"], message: "Required" }]);
  });

  it("returns 403 for a 'Password change required' error", async () => {
    mocks.requireAuth.mockRejectedValue(
      new Error("Password change required"),
    );

    const handler = withRoute(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(403);
  });
});

describe("mapError", () => {
  it("returns 401 for an 'Unauthorized' error", () => {
    const res = mapError(new Error("Unauthorized"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for any 'Forbidden: ...' error", () => {
    const res = mapError(new Error("Forbidden: notes:create required"));
    expect(res.status).toBe(403);
  });

  it("returns 500 for a plain Error", () => {
    const res = mapError(new Error("kaboom"));
    expect(res.status).toBe(500);
  });

  it("returns 500 for a non-Error throw", () => {
    const res = mapError("a string");
    expect(res.status).toBe(500);
  });

  it("returns 500 for null", () => {
    const res = mapError(null);
    expect(res.status).toBe(500);
  });
});
