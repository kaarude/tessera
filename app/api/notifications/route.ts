import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, mapError } from "@/lib/route";
import { assertTrustedOrigin } from "@/lib/security";
import { apiError } from "@/lib/api-error";

const PatchBody = z.union([
  z.object({ id: z.string().cuid() }),
  z.object({ readAll: z.literal(true) }),
  z.object({ readAll: z.literal(false) }).optional(),
  z.object({}).optional(),
]);

export async function GET() {
  try {
    const user = await requireAuth();
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (err) {
    return mapError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireAuth();
    const json = await request.json().catch(() => ({}));
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) return apiError(400, "Invalid body");

    if (
      typeof parsed.data === "object" &&
      parsed.data &&
      "readAll" in parsed.data &&
      parsed.data.readAll === true
    ) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (
      typeof parsed.data === "object" &&
      parsed.data &&
      "id" in parsed.data
    ) {
      const { id } = parsed.data as { id: string };
      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true },
      });
    } else {
      return apiError(400, "Provide { id } or { readAll: true }");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return mapError(err);
  }
}
