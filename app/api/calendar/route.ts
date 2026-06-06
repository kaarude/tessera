import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, withRoute, mapError, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import type { Prisma } from "@prisma/client";
import { CalendarCreateBody } from "@/lib/schemas";

const CalendarListQuery = z.object({
  teamId: z.string().cuid().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parsed = CalendarListQuery.safeParse({
      teamId: searchParams.get("teamId") ?? undefined,
      start: searchParams.get("start") ?? undefined,
      end: searchParams.get("end") ?? undefined,
    });
    if (!parsed.success) return apiError(400, "Invalid query");
    const { teamId, start, end } = parsed.data;

    const where: Prisma.CalendarEntryWhereInput = {};
    if (teamId) {
      // Make sure the user can read this team's calendar.
      if (!user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
        return apiError(403, "Not a member of that team");
      }
      where.teamId = teamId;
      if (
        !user.isAdmin &&
        !(await hasPermission(user.id, "calendar:view_team", teamId))
      ) {
        return apiError(403, "Forbidden: calendar:view_team required");
      }
    } else {
      where.OR = [
        { userId: user.id },
        { teamId: { in: user.memberships.map((m) => m.teamId) } },
        { assignedToId: user.id },
      ];
    }

    if (start && end) {
      where.startDate = { gte: new Date(start), lte: new Date(end) };
    }

    const entries = await prisma.calendarEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(entries);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(
  async ({ user, body }) => {
    const parsed = CalendarCreateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      teamId,
      groupId,
      assignedToId,
    } = parsed.data;

    const allowed = await hasPermission(user.id, "calendar:create", teamId ?? undefined);
    if (!allowed) return apiError(403, "Forbidden: calendar:create required");

    if (teamId && !user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
      return apiError(403, "Not a member of that team");
    }
    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group || group.teamId !== teamId) {
        return apiError(400, "group/team mismatch");
      }
    }
    if (assignedToId) {
      if (
        !(await hasPermission(
          user.id,
          "calendar:assign_users",
          teamId ?? undefined,
        )) &&
        !user.isAdmin
      ) {
        return apiError(403, "Forbidden: calendar:assign_users required");
      }
      if (teamId) {
        const membership = await prisma.teamMembership.findUnique({
          where: { userId_teamId: { userId: assignedToId, teamId } },
        });
        if (!membership) {
          return apiError(400, "assignee is not a team member");
        }
      }
    }

    const entry = await prisma.calendarEntry.create({
      data: {
        title,
        description: description ?? null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isAllDay,
        userId: user.id,
        teamId: teamId ?? null,
        groupId: groupId ?? null,
        assignedToId: assignedToId ?? null,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "create",
      entityType: "calendar_entry",
      entityId: entry.id,
      teamId: teamId ?? undefined,
      metadata: { title },
    });

    return NextResponse.json(entry, { status: 201 });
  },
);
