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
    const resetAt = new Date(now + windowMs);
    const [record] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "LoginAttempt" ("id", "key", "count", "resetAt", "createdAt", "updatedAt")
      VALUES (
        concat('rl_', md5(${key})),
        ${key},
        1,
        ${resetAt},
        NOW(),
        NOW()
      )
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "LoginAttempt"."resetAt" <= NOW() THEN 1
          ELSE "LoginAttempt"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "LoginAttempt"."resetAt" <= NOW() THEN ${resetAt}
          ELSE "LoginAttempt"."resetAt"
        END,
        "updatedAt" = NOW()
      RETURNING "count", "resetAt"
    `;
    if (record.count > max) {
      return {
        allowed: false,
        retryAfterMs: Math.max(0, record.resetAt.getTime() - now),
      };
    }
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Clear a key — call on successful login so the same user doesn't get throttled indefinitely. */
export async function clearRateLimit(...keys: string[]) {
  for (const key of keys) {
    if (!key) continue;
    await prisma.loginAttempt.delete({ where: { key } }).catch(() => undefined); // ignore not-found
  }
}
