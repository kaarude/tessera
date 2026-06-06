import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Refuse to boot with a weak SESSION_SECRET. Skipped during `next build`
// (which runs the route module to collect page data but has no real
// secret) and in test environments.
function validateSessionSecret(secret: string | undefined) {
  if (process.env.NODE_ENV === "test") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one with `npm run init` and add it to .env.",
    );
  }
  if (secret === "your-super-secret-session-key-change-this-in-production") {
    throw new Error(
      "SESSION_SECRET is set to the example value. Generate a real one with `npm run init`.",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `SESSION_SECRET is too short (${secret.length} chars). Use at least 32 characters.`,
    );
  }
}

validateSessionSecret(process.env.SESSION_SECRET);

// Full user shape returned from requireAuth / requireAdmin.
export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof loadSessionUser>>
>;

async function loadSessionUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: { include: { permissions: true } },
        },
      },
      memberships: true,
    },
  });
}

export const sessionOptions = {
  cookieName: "tessera_session",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  sessionVersion?: number;
  passwordChangeOnly?: boolean;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function requireAuth(options?: {
  allowPasswordChangeOnly?: boolean;
}): Promise<SessionUser> {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("Unauthorized");
  }
  const user = await loadSessionUser(session.userId);
  if (!user) {
    throw new Error("Unauthorized");
  }
  await reconcileSessionVersion(session, user.sessionVersion);
  if (
    (session.passwordChangeOnly || user.mustChangePassword) &&
    !options?.allowPasswordChangeOnly
  ) {
    throw new Error("Password change required");
  }
  return user;
}

/**
 * Reconcile a session's `sessionVersion` against the user's current one.
 *
 * - If the session was issued before the sessionVersion migration
 *   landed (i.e. `session.sessionVersion === undefined`), upgrade it
 *   in place to the user's current version. This prevents the deploy
 *   from force-logging-out every active user.
 * - If the session has a version but it doesn't match the user's
 *   current version, the session is destroyed. This is the
 *   post-deploy state — password rotations invalidate older sessions.
 *
 * Extracted so the logic can be unit-tested without iron-session.
 */
export async function reconcileSessionVersion(
  session: { sessionVersion?: number; destroy: () => void; save?: () => Promise<void> },
  userSessionVersion: number,
): Promise<void> {
  if (session.sessionVersion === undefined) {
    // Pre-migration session. The user hasn't rotated their password
    // (userSessionVersion === 0). Upgrade the session in place.
    if (userSessionVersion === 0) {
      session.sessionVersion = 0;
      await session.save?.();
    } else {
      // User already rotated (userSessionVersion >= 1) before this
      // session ever talked to the new code. Treat the pre-migration
      // session as stale and force a fresh login.
      session.destroy();
      throw new Error("Unauthorized");
    }
    return;
  }
  if (session.sessionVersion !== userSessionVersion) {
    session.destroy();
    throw new Error("Unauthorized");
  }
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error("Forbidden: Admin required");
  }
  return user;
}
