import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, withRoute, mapError, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { NoteUpdateBody } from "@/lib/schemas";
import { canReadNote } from "@/lib/access";

const CUID = /^c[a-z0-9]{20,}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!CUID.test(id)) return apiError(404, "Not found");

    const user = await requireAuth();
    const note = await prisma.note.findUnique({
      where: { id },
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
    });
    if (!note) return apiError(404, "Not found");

    const teamIds = user.memberships.map((m) => m.teamId);
    const canAccess = canReadNote(note, user.id, teamIds);
    if (!canAccess) return apiError(403, "Forbidden");

    return NextResponse.json(note);
  } catch (err) {
    return mapError(err);
  }
}

export const PATCH = withRoute<{ id: string }>(
  async ({ user, body, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid note id");

    const parsed = NoteUpdateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const data = parsed.data;

    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    const isOwner = existing.ownerId === user.id;
    const ownPermission = isOwner
      ? await hasPermission(user.id, "notes:edit_own", existing.teamId ?? undefined)
      : false;
    if (isOwner && !ownPermission && !user.isAdmin) {
      return apiError(403, "Forbidden: notes:edit_own required");
    }
    if (!isOwner && !user.isAdmin) {
      const canEditShared = await hasPermission(
        user.id,
        "notes:edit_shared",
        existing.teamId ?? undefined,
      );
      const hasShare = await prisma.noteShare.findFirst({
        where: {
          noteId: existing.id,
          OR: [
            { userId: user.id },
            { teamId: { in: user.memberships.map((m) => m.teamId) } },
          ],
        },
      });
      if (!canEditShared || !hasShare) {
        return apiError(403, "Forbidden");
      }
    }

    const targetTeamId =
      data.teamId === undefined ? existing.teamId : data.teamId;
    if (
      targetTeamId &&
      !user.memberships.some((membership) => membership.teamId === targetTeamId) &&
      !user.isAdmin
    ) {
      return apiError(403, "Not a member of the target team");
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "note",
      entityId: note.id,
      teamId: note.teamId ?? undefined,
      metadata: { title: note.title },
      beforeData: { title: existing.title, isPrivate: existing.isPrivate },
      afterData: { title: note.title, isPrivate: note.isPrivate },
    });

    return NextResponse.json(note);
  },
);

export const DELETE = withRoute<{ id: string }>(
  async ({ user, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid note id");

    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    const isOwner = existing.ownerId === user.id;
    const permission = await hasPermission(
      user.id,
      isOwner ? "notes:delete_own" : "notes:delete_shared",
      existing.teamId ?? undefined,
    );
    if (!permission && !user.isAdmin) {
      return apiError(403, "Forbidden");
    }

    await prisma.note.delete({ where: { id } });
    await logAudit({
      actorId: user.id,
      action: "delete",
      entityType: "note",
      entityId: id,
      teamId: existing.teamId ?? undefined,
      metadata: { title: existing.title },
    });

    return NextResponse.json({ success: true });
  },
);
