import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";

const Body = z.object({ name: z.string().min(1).max(50) });

export const POST = withRoute<{ id: string }>(
  async ({ user, params, body }) => {
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid column");
    const board = await prisma.taskBoard.findUnique({
      where: { id: params.id },
      include: { columns: true },
    });
    if (!board) return apiError(404, "Board not found");
    if (
      !user.isAdmin &&
      (!user.memberships.some((item) => item.teamId === board.teamId) ||
        !(await hasPermission(user.id, "tasks:move_columns", board.teamId)))
    ) {
      return apiError(403, "Forbidden");
    }
    const column = await prisma.taskColumn.create({
      data: {
        name: parsed.data.name,
        boardId: board.id,
        position: board.columns.length,
      },
    });
    return NextResponse.json(column, { status: 201 });
  },
);
