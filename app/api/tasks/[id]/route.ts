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
      if (!perm && !isCreator && !isAssignee && !user.isAdmin) {
        return apiError(403, "Forbidden: tasks:move_columns required");
      }
    }

    // Reassignment requires tasks:reassign_users / tasks:reassign_teams.
    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
      const perm = await hasPermission(
        user.id,
        "tasks:reassign_users",
        existing.teamId,
      );
      if (!perm && !isCreator && !user.isAdmin) {
        return apiError(403, "Forbidden: tasks:reassign_users required");
      }
    }
    if (data.teamId && data.teamId !== existing.teamId) {
      const perm = await hasPermission(
        user.id,
        "tasks:reassign_teams",
        existing.teamId,
      );
      if (!perm && !isCreator && !user.isAdmin) {
        return apiError(403, "Forbidden: tasks:reassign_teams required");
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
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
      groupId: task.groupId ?? undefined,
      metadata: { title: task.title, columnId: task.columnId },
    });

    return NextResponse.json(task);
  },
);

export const DELETE = withRoute<{ id: string }>(
  async ({ user, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid id");

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    if (existing.createdById !== user.id && !user.isAdmin) {
      return apiError(403, "Only the creator or an admin can delete a task");
    }

    await prisma.task.delete({ where: { id } });
    await logAudit({
      actorId: user.id,
      action: "delete",
      entityType: "task",
      entityId: id,
      teamId: existing.teamId,
      groupId: existing.groupId ?? undefined,
      metadata: { title: existing.title },
    });
    return NextResponse.json({ success: true });
  },
);
