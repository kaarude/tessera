import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const DELETE = withRoute<{ id: string }>(async ({ user, params }) => {
  await prisma.apiToken.updateMany({
    where: { id: params.id, userId: user.id },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ success: true });
});
