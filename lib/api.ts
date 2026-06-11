"use client";

/**
 * Tiny typed wrapper around `fetch` for Tessera's API routes.
 * - Throws on non-2xx with the server-provided error message
 * - Returns the parsed JSON body
 * - Lets the React Query layer handle retries/caching
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body — that's fine, treat as null.
    }
  }
  if (!res.ok) {
    const obj =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const errField = obj?.error;
    const message =
      (typeof errField === "string" && errField) ||
      res.statusText ||
      "Request failed";
    const details = obj?.details;
    throw new ApiError(res.status, message, details);
  }
  return (data as T) ?? (null as unknown as T);
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { credentials: "same-origin" }));
}

export async function apiSend<T = unknown>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
}

export const apiPost = <T = unknown>(url: string, body?: unknown) =>
  apiSend<T>("POST", url, body);
export const apiPatch = <T = unknown>(url: string, body?: unknown) =>
  apiSend<T>("PATCH", url, body);
export const apiPut = <T = unknown>(url: string, body?: unknown) =>
  apiSend<T>("PUT", url, body);
export const apiDelete = <T = unknown>(url: string) =>
  apiSend<T>("DELETE", url);
