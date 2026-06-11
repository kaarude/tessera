import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, withRoute, mapError } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";

const BoardCreateBody = z.object({
  name: z.string().min(1).max(100),
  teamId: z.string().cuid(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        position: z.number().int().min(0).default(0),
      }),
    )
    .min(1)
    .max(20)
    .default([
      { name: "To Do", position: 0 },
      { name: "In Progress", position: 1 },
      { name: "Review", position: 2 },
      { name: "Done", position: 3 },
    ]),
  templateId: z.string().cuid().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || undefined;

    if (teamId) {
      if (!user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
        return apiError(403, "Not a member of that team");
      }
    }
    const boards = await prisma.taskBoard.findMany({
      where: teamId
        ? { teamId }
        : { teamId: { in: user.memberships.map((m) => m.teamId) } },
      include: {
        columns: { orderBy: { position: "asc" } },
        team: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(boards);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(async ({ user, body }) => {
  const parsed = BoardCreateBody.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "Invalid request", { details: parsed.error.issues });
  }
  const { name, teamId, templateId } = parsed.data;
  let columns = parsed.data.columns;
  if (templateId) {
    const template = await prisma.taskBoardTemplate.findUnique({
      where: { id: templateId },
    });
    if (
      !template ||
      (template.teamId && template.teamId !== teamId && !user.isAdmin)
    ) {
      return apiError(404, "Template not found");
    }
    columns = template.columns as typeof columns;
  }

  if (!user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
    return apiError(403, "Not a member of that team");
  }
  const allowed = await hasPermission(user.id, "tasks:create", teamId);
  if (!allowed) return apiError(403, "Forbidden: tasks:create required");

  const board = await prisma.taskBoard.create({
    data: {
      name,
      teamId,
      templateId: templateId ?? null,
      columns: { create: columns },
    },
    include: { columns: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json(board, { status: 201 });
});
