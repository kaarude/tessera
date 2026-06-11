import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";

const Body = z.object({
  name: z.string().min(1).max(50).optional(),
  position: z.number().int().min(0).optional(),
});

export const PATCH = withRoute<{ id: string }>(
  async ({ user, params, body }) => {
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid column");
    const column = await prisma.taskColumn.findUnique({
      where: { id: params.id },
      include: { board: true },
    });
    if (!column) return apiError(404, "Column not found");
    if (
      !user.isAdmin &&
      !user.memberships.some((item) => item.teamId === column.board.teamId)
    ) {
      return apiError(403, "Forbidden");
    }
    return NextResponse.json(
      await prisma.taskColumn.update({
        where: { id: column.id },
        data: parsed.data,
      }),
    );
  },
);
