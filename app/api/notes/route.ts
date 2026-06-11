import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute, mapError, requireAuth, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import type { Prisma } from "@prisma/client";
import { NoteCreateBody } from "@/lib/schemas";

const NoteSearchQuery = z.object({
  search: z.string().max(200).optional(),
  teamId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parsed = NoteSearchQuery.safeParse({
      search: searchParams.get("search") ?? undefined,
      teamId: searchParams.get("teamId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return apiError(400, "Invalid query");

    const { search, teamId, limit } = parsed.data;

    // Build the visibility filter. A user can see a note if:
    //   - they own it
    //   - it is shared with them directly
    //   - it is shared with a team they belong to (and is not private)
    //   - it is a non-private team note in a team they belong to
    const teamIds = user.memberships.map((m) => m.teamId);
    const visibilityWhere: Prisma.NoteWhereInput = {
      OR: [
        { ownerId: user.id },
        {
          isPrivate: false,
          teamId: { in: teamIds },
        },
        {
          shares: {
            some: {
              OR: [
                { userId: user.id },
                { teamId: { in: teamIds } },
              ],
            },
          },
        },
      ],
    };

    const where: Prisma.NoteWhereInput = { AND: [visibilityWhere] };

    if (teamId) {
      // Make sure the user is a member of the team they're filtering by.
      if (!teamIds.includes(teamId)) return apiError(403, "Not a member of that team");
      (where.AND as Prisma.NoteWhereInput[]).push({ teamId });
    }
    if (search) {
      (where.AND as Prisma.NoteWhereInput[]).push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
        attachments: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(notes);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(
  async ({ user, body }) => {
    const parsed = NoteCreateBody.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid request", { details: parsed.error.issues });

    const { title, content, teamId, isPrivate } = parsed.data;

    // Permission: must have notes:create in the target team (or platform-wide).
    const teamIdForPerm = teamId ?? null;
    const allowed = await hasPermission(user.id, "notes:create", teamIdForPerm ?? undefined);
    if (!allowed) {
      return apiError(403, "Forbidden: notes:create required");
    }

    // If a teamId is set, the user must be a member of that team.
    if (teamId) {
      const isMember = user.memberships.some((m) => m.teamId === teamId);
      if (!isMember && !user.isAdmin) {
        return apiError(403, "Not a member of that team");
      }
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        ownerId: user.id,
        teamId: teamId ?? null,
        isPrivate: isPrivate !== undefined ? isPrivate : true,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "create",
      entityType: "note",
      entityId: note.id,
      teamId: teamId ?? undefined,
      metadata: { title },
    });

    return NextResponse.json(note, { status: 201 });
  },
);
