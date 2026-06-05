import { prisma } from "./prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_KEY = 10;

/**
 * Database-backed sliding window rate limiter. Two keys are usually passed
 * at login: the IP and the lowercased email. Either one triggering
 * `MAX_PER_KEY` within the window rejects the request.
 */
export async function checkRateLimit(
  keys: string[],
  max = MAX_PER_KEY,
  windowMs = WINDOW_MS,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const uniqKeys = Array.from(new Set(keys.filter(Boolean)));

  for (const key of uniqKeys) {
    const record = await prisma.loginAttempt.findUnique({ where: { key } });
    if (!record || record.resetAt.getTime() <= now) {
      // window has expired or first time — reset
      await prisma.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, resetAt: new Date(now + windowMs) },
        update: { count: 1, resetAt: new Date(now + windowMs) },
      });
      continue;
    }
    if (record.count >= max) {
      return { allowed: false, retryAfterMs: record.resetAt.getTime() - now };
    }
    await prisma.loginAttempt.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Clear a key — call on successful login so the same user doesn't get throttled indefinitely. */
export async function clearRateLimit(...keys: string[]) {
  for (const key of keys) {
    if (!key) continue;
    await prisma.loginAttempt
      .delete({ where: { key } })
      .catch(() => undefined); // ignore not-found
  }
}
