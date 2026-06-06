import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, withRoute, mapError, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import type { Prisma } from "@prisma/client";
import { TaskCreateBody } from "@/lib/schemas";

const TaskListQuery = z.object({
  teamId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  boardId: z.string().cuid().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parsed = TaskListQuery.safeParse({
      teamId: searchParams.get("teamId") ?? undefined,
      groupId: searchParams.get("groupId") ?? undefined,
      boardId: searchParams.get("boardId") ?? undefined,
    });
    if (!parsed.success) return apiError(400, "Invalid query");
    const { teamId, groupId, boardId } = parsed.data;

    const where: Prisma.TaskWhereInput = {};

    if (teamId) {
      if (!user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
        return apiError(403, "Not a member of that team");
      }
      where.teamId = teamId;
      if (
        !user.isAdmin &&
        !(await hasPermission(user.id, "tasks:view_team", teamId))
      ) {
        return apiError(403, "Forbidden: tasks:view_team required");
      }
    } else {
      where.OR = [
        { assigneeId: user.id },
        { createdById: user.id },
        { teamId: { in: user.memberships.map((m) => m.teamId) } },
      ];
    }
    if (groupId) where.groupId = groupId;
    if (
      groupId &&
      !user.isAdmin &&
      !(await hasPermission(user.id, "tasks:view_group", teamId))
    ) {
      return apiError(403, "Forbidden: tasks:view_group required");
    }
    if (boardId) where.boardId = boardId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        board: { select: { id: true, name: true } },
        column: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ columnId: "asc" }, { position: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(
  async ({ user, body }) => {
    const parsed = TaskCreateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const {
      title,
      description,
      priority,
      dueDate,
      assigneeId,
      teamId,
      groupId,
      boardId,
      columnId,
      position,
    } = parsed.data;

    if (!user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
      return apiError(403, "Not a member of that team");
    }
    const allowed = await hasPermission(user.id, "tasks:create", teamId);
    if (!allowed) return apiError(403, "Forbidden: tasks:create required");

    // Confirm the column belongs to the board belongs to the team.
    const column = await prisma.taskColumn.findUnique({
      where: { id: columnId },
      include: { board: { select: { id: true, teamId: true } } },
    });
    if (!column || column.board.id !== boardId || column.board.teamId !== teamId) {
      return apiError(400, "column/board/team mismatch");
    }
    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group || group.teamId !== teamId) {
        return apiError(400, "group/team mismatch");
      }
    }
    if (assigneeId) {
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: assigneeId, teamId } },
      });
      if (!membership) return apiError(400, "assignee is not a team member");
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId ?? null,
        teamId,
        groupId: groupId ?? null,
        boardId,
        columnId,
        position,
        createdById: user.id,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "create",
      entityType: "task",
      entityId: task.id,
      teamId,
      groupId: groupId ?? undefined,
      metadata: { title, columnId },
    });

    return NextResponse.json(task, { status: 201 });
  },
);
