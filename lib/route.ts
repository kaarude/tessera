import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, hashPassword, verifyPassword, type SessionUser } from "./auth";
import { requirePermission } from "./permissions-server";
import { apiError } from "./api-error";
import { logAudit } from "./audit";

export type { SessionUser };

type BaseCtx<B = unknown, P = Record<string, string>> = {
  user: SessionUser;
  request: Request;
  body: B;
  teamId?: string;
  params: P;
};

/**
 * Wrap a route handler that needs auth, optional permission, and an arbitrary
 * `params` object. Pass the route's second argument through unchanged.
 *
 *   export const GET = withRoute(async ({ user, params }) => {
 *     const { id } = params as { id: string };
 *     ...
 *   });
 */
export function withRoute<Params = Record<string, string>>(
  handler: (ctx: BaseCtx<unknown, Params>) => Promise<NextResponse>,
  options?: { permission?: string; adminOnly?: boolean },
) {
  return async (request: Request, ctx?: { params: Promise<Params> }) => {
    try {
      const user = options?.adminOnly ? await requireAdmin() : await requireAuth();

      let body: unknown = {};
      if (request.method !== "GET" && request.method !== "HEAD") {
        const text = await request.clone().text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = {};
          }
        }
      }
      const teamId = (body as { teamId?: string })?.teamId ?? undefined;

      if (options?.permission) {
        await requirePermission(user.id, options.permission, teamId);
      }

      const params = (ctx?.params ? await ctx.params : ({} as Params)) as Params;
      return await handler({ user, request, body, teamId, params });
    } catch (err) {
      return mapError(err);
    }
  };
}

export function mapError(err: unknown) {
  const msg =
    err instanceof Error ? err.message : "Internal server error";
  if (msg === "Unauthorized") return apiError(401, "Unauthorized");
  if (msg === "Password change required") {
    return apiError(403, "Password change required");
  }
  if (msg.startsWith("Forbidden")) return apiError(403, msg);
  if (err && typeof err === "object" && "name" in err && (err as { name: unknown }).name === "ZodError") {
    return apiError(400, "Invalid request", {
      details: (err as unknown as { issues: unknown }).issues,
    });
  }
  if (process.env.NODE_ENV !== "production") {
    console.error("Route error:", err);
  }
  return apiError(500, "Internal server error");
}

// Re-exports for handler convenience
export { requireAuth, requireAdmin, hashPassword, verifyPassword, logAudit, requirePermission };
