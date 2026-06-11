import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const DELETE = withRoute<{ id: string }>(async ({ user, params }) => {
  await prisma.webhook.deleteMany({
    where: { id: params.id, userId: user.id },
  });
  return NextResponse.json({ success: true });
});
