import { NextResponse } from "next/server";

/**
 * Standard error response shape for all Tessera API routes.
 * Never leaks the raw error message in production (only the kind + status).
 * In development, includes the real message for easier debugging.
 */
export function apiError(
  status: number,
  message: string,
  options?: { details?: unknown; isDev?: boolean },
) {
  const isDev = options?.isDev ?? process.env.NODE_ENV !== "production";
  return NextResponse.json(
    {
      error: message,
      ...(isDev && options?.details
        ? { details: options.details }
        : {}),
    },
    { status },
  );
}

export function requireSession() {
  throw new Error("Unauthorized");
}

export function requireAdminError() {
  throw new Error("Forbidden: Admin required");
}

export function requirePermissionError(perm: string) {
  throw new Error(`Forbidden: ${perm} required`);
}
