import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { TaskUpdateBody } from "@/lib/schemas";

const CUID = /^c[a-z0-9]{20,}$/;

export const PATCH = withRoute<{ id: string }>(
  async ({ user, body, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid id");

    const parsed = TaskUpdateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const data = parsed.data;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    const isCreator = existing.createdById === user.id;
    const isAssignee = existing.assigneeId === user.id;
    if ((isCreator || isAssignee) && !user.isAdmin) {
      const ownPermission = await hasPermission(
        user.id,
        "tasks:edit_own",
        existing.teamId,
      );
      if (!ownPermission) {
        return apiError(403, "Forbidden: tasks:edit_own required");
      }
    }
    if (!isCreator && !isAssignee && !user.isAdmin) {
      const perm = await hasPermission(
        user.id,
        "tasks:edit_others",
        existing.teamId,
      );
      if (!perm) return apiError(403, "Forbidden");
    }

    // Column move requires tasks:move_columns on the source team.
    if (data.columnId && data.columnId !== existing.columnId) {
      const perm = await hasPermission(
        user.id,
        "tasks:move_columns",
        existing.teamId,
      );
      if (!perm && !user.isAdmin) {
        return apiError(403, "Forbidden: tasks:move_columns required");
      }
    }

    // Reassignment requires tasks:reassign_users / tasks:reassign_teams.
    if (
      data.assigneeId !== undefined &&
      data.assigneeId !== existing.assigneeId
    ) {
      const perm = await hasPermission(
        user.id,
        "tasks:reassign_users",
        existing.teamId,
      );
      if (!perm && !user.isAdmin) {
        return apiError(403, "Forbidden: tasks:reassign_users required");
      }
    }
    if (data.teamId && data.teamId !== existing.teamId) {
      const perm = await hasPermission(
        user.id,
        "tasks:reassign_teams",
        existing.teamId,
      );
      if (!perm && !user.isAdmin) {
        return apiError(403, "Forbidden: tasks:reassign_teams required");
      }
    }

    const targetTeamId = data.teamId ?? existing.teamId;
    const targetBoardId = data.boardId ?? existing.boardId;
    const targetColumnId = data.columnId ?? existing.columnId;
    const column = await prisma.taskColumn.findUnique({
      where: { id: targetColumnId },
      include: { board: { select: { id: true, teamId: true } } },
    });
    if (
      !column ||
      column.board.id !== targetBoardId ||
      column.board.teamId !== targetTeamId
    ) {
      return apiError(400, "column/board/team mismatch");
    }
    if (
      !user.memberships.some(
        (membership) => membership.teamId === targetTeamId,
      ) &&
      !user.isAdmin
    ) {
      return apiError(403, "Not a member of the target team");
    }
    if (data.assigneeId) {
      const membership = await prisma.teamMembership.findUnique({
        where: {
          userId_teamId: { userId: data.assigneeId, teamId: targetTeamId },
        },
      });
      if (!membership) return apiError(400, "assignee is not a team member");
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
        ...(data.boardId !== undefined && { boardId: data.boardId }),
        ...(data.columnId !== undefined && { columnId: data.columnId }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "task",
      entityId: task.id,
      teamId: task.teamId,
      metadata: { title: task.title, columnId: task.columnId },
    });

    return NextResponse.json(task);
  },
);

export const DELETE = withRoute<{ id: string }>(async ({ user, params }) => {
  const { id } = params;
  if (!CUID.test(id)) return apiError(400, "Invalid id");

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Not found");

  const isOwn =
    existing.createdById === user.id || existing.assigneeId === user.id;
  const permission = await hasPermission(
    user.id,
    isOwn ? "tasks:delete_own" : "tasks:delete_others",
    existing.teamId,
  );
  if (!permission && !user.isAdmin) {
    return apiError(403, "Forbidden");
  }

  await prisma.task.delete({ where: { id } });
  await logAudit({
    actorId: user.id,
    action: "delete",
    entityType: "task",
    entityId: id,
    teamId: existing.teamId,
    metadata: { title: existing.title },
  });
  return NextResponse.json({ success: true });
});
