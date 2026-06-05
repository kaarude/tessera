import { describe, expect, it } from "vitest";
import { apiError } from "@/lib/api-error";

describe("apiError", () => {
  it("returns a NextResponse with the given status and message", async () => {
    const res = apiError(404, "Not found");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
    expect(body.details).toBeUndefined();
  });

  it("includes details when provided and NODE_ENV is not production", async () => {
    const original = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    try {
      const res = apiError(400, "Invalid", { details: { field: "email" } });
      const body = await res.json();
      expect(body.details).toEqual({ field: "email" });
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = original;
    }
  });

  it("strips details in production", async () => {
    const original = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const res = apiError(400, "Invalid", { details: { field: "email" } });
      const body = await res.json();
      expect(body.details).toBeUndefined();
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = original;
    }
  });

  it("respects an explicit isDev override", async () => {
    const res = apiError(400, "Invalid", {
      details: { field: "email" },
      isDev: true,
    });
    const body = await res.json();
    expect(body.details).toEqual({ field: "email" });
  });
});
