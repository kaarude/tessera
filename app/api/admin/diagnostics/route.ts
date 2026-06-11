import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { getStorageUsage } from "@/lib/s3";

export const GET = withRoute(
  async () => {
    const [storage, sessions, failedLogins, users, teams, backups] =
      await Promise.all([
        getStorageUsage().catch(() => ({ bytes: 0, objects: 0 })),
        prisma.userSession.count({
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
        }),
        prisma.loginAttempt.count({ where: { count: { gt: 1 } } }),
        prisma.user.count(),
        prisma.team.count(),
        prisma.systemBackup.count(),
      ]);
    const warnings = [
      process.env.TRUST_PROXY !== "1" &&
        "Trusted proxy mode is disabled; per-IP login throttling is inactive.",
      process.env.AUTO_SEED === "1" &&
        "Automatic seeding is enabled. Disable it after initial setup.",
      (process.env.S3_ACCESS_KEY_ID === "minio" ||
        process.env.S3_SECRET_ACCESS_KEY === "minio12345") &&
        "Default object-storage credentials are configured.",
      !process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") &&
        "The public application URL is not HTTPS.",
    ].filter(Boolean);
    return NextResponse.json({
      database: "ok",
      storage,
      sessions,
      failedLogins,
      users,
      teams,
      backups,
      warnings,
    });
  },
  { adminOnly: true },
);
