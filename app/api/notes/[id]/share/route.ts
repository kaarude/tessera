import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute, mapError, logAudit, requireAuth } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { ShareBody } from "@/lib/schemas";

const CUID = /^c[a-z0-9]{20,}$/;

export const POST = withRoute<{ id: string }>(
  async ({ user, body, params }) => {
    const { id: noteId } = params;
    if (!CUID.test(noteId)) return apiError(400, "Invalid note id");

    const parsed = ShareBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const { teamId, userId } = parsed.data;

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) return apiError(404, "Not found");

    // Owner can always share their own note. Admins can too.
    if (note.ownerId !== user.id && !user.isAdmin) {
      const perm = await hasPermission(
        user.id,
        teamId ? "notes:share_team" : "notes:share_users",
        teamId ?? undefined,
      );
      if (!perm) return apiError(403, "Forbidden");
    }

    if (teamId) {
      // Confirm the team exists. Sharing with a team the owner isn't in is OK —
      // it just means the share appears in a team context the owner doesn't
      // have. This is by design for cross-team collaboration.
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return apiError(404, "Team not found");
    }
    if (userId) {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return apiError(404, "User not found");
    }

    const share = await prisma.noteShare.create({
      data: { noteId, teamId: teamId ?? null, userId: userId ?? null },
    });

    await logAudit({
      actorId: user.id,
      action: "share",
      entityType: "note",
      entityId: noteId,
      teamId: teamId ?? undefined,
      metadata: { shareId: share.id, teamId, userId },
    });

    return NextResponse.json(share, { status: 201 });
  },
);

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: noteId } = await params;
    if (!CUID.test(noteId)) return apiError(400, "Invalid note id");

    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("shareId");
    if (!shareId || !CUID.test(shareId)) return apiError(400, "shareId required");

    const share = await prisma.noteShare.findUnique({
      where: { id: shareId },
      include: { note: { select: { ownerId: true } } },
    });
    if (!share || share.noteId !== noteId) return apiError(404, "Not found");
    if (share.note.ownerId !== user.id && !user.isAdmin) {
      return apiError(403, "Only the owner or an admin can revoke a share");
    }

    await prisma.noteShare.delete({ where: { id: shareId } });
    await logAudit({
      actorId: user.id,
      action: "unshare",
      entityType: "note",
      entityId: noteId,
      metadata: { shareId, teamId: share.teamId, userId: share.userId },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return mapError(err);
  }
}
