import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";

export async function POST(request: Request) {
  assertTrustedOrigin(request);
  const session = await getSession();
  if (session.sessionId) {
    await prisma.userSession.updateMany({
      where: { sessionId: session.sessionId },
      data: { revokedAt: new Date() },
    });
  }
  session.destroy();
  return NextResponse.json({ success: true });
}
