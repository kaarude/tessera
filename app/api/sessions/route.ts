import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { getSession } from "@/lib/auth";

export const GET = withRoute(async ({ user }) => {
  const session = await getSession();
  const sessions = await prisma.userSession.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
  return NextResponse.json(
    sessions.map((item) => ({
      ...item,
      current: item.sessionId === session.sessionId,
    })),
  );
});
