import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { CalendarUpdateBody } from "@/lib/schemas";

const CUID = /^c[a-z0-9]{20,}$/;

export const PATCH = withRoute<{ id: string }>(
  async ({ user, body, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid id");

    const parsed = CalendarUpdateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const data = parsed.data;

    const existing = await prisma.calendarEntry.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    const isOwner = existing.userId === user.id;
    if (!isOwner && !user.isAdmin) {
      const perm = await hasPermission(
        user.id,
        "calendar:edit_others",
        existing.teamId ?? undefined,
      );
      if (!perm) return apiError(403, "Forbidden");
    }

    const entry = await prisma.calendarEntry.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "calendar_entry",
      entityId: entry.id,
      teamId: entry.teamId ?? undefined,
      metadata: { title: entry.title },
    });

    return NextResponse.json(entry);
  },
);

export const DELETE = withRoute<{ id: string }>(
  async ({ user, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid id");

    const existing = await prisma.calendarEntry.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    if (existing.userId !== user.id && !user.isAdmin) {
      return apiError(403, "Forbidden");
    }

    await prisma.calendarEntry.delete({ where: { id } });
    await logAudit({
      actorId: user.id,
      action: "delete",
      entityType: "calendar_entry",
      entityId: id,
      teamId: existing.teamId ?? undefined,
      metadata: { title: existing.title },
    });
    return NextResponse.json({ success: true });
  },
);
