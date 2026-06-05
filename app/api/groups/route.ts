import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, withRoute, mapError, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { GroupCreateBody } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || undefined;
    if (teamId && !user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
      return apiError(403, "Not a member of that team");
    }
    const groups = await prisma.group.findMany({
      where: teamId ? { teamId } : { teamId: { in: user.memberships.map((m) => m.teamId) } },
      include: { team: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(
  async ({ user, body }) => {
    const parsed = GroupCreateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const { name, description, teamId } = parsed.data;

    if (!user.memberships.some((m) => m.teamId === teamId) && !user.isAdmin) {
      return apiError(403, "Not a member of that team");
    }
    const allowed =
      user.isAdmin ||
      (await hasPermission(user.id, "groups:create", teamId));
    if (!allowed) return apiError(403, "Forbidden: groups:create required");

    const group = await prisma.group.create({
      data: { name, description, teamId },
    });
    await logAudit({
      actorId: user.id,
      action: "create",
      entityType: "group",
      entityId: group.id,
      teamId,
      metadata: { name },
    });
    return NextResponse.json(group, { status: 201 });
  },
);
