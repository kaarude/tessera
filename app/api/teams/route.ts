import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute, mapError, requireAuth } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { TeamCreateBody } from "@/lib/schemas";

export async function GET() {
  try {
    const user = await requireAuth();
    const memberships = await prisma.teamMembership.findMany({
      where: { userId: user.id },
      include: { team: true },
    });
    return NextResponse.json(memberships.map((m) => m.team));
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(async ({ user, body }) => {
  const parsed = TeamCreateBody.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "Invalid request", { details: parsed.error.issues });
  }
  const { name, description } = parsed.data;

  const allowed =
    user.isAdmin || (await hasPermission(user.id, "teams:create"));
  if (!allowed) return apiError(403, "Forbidden: teams:create required");

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: { name, description, ownerId: user.id },
    });
    await tx.teamMembership.create({
      data: { userId: user.id, teamId: created.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "create",
        entityType: "team",
        entityId: created.id,
        teamId: created.id,
        metadata: { name },
      },
    });
    return created;
  });

  return NextResponse.json(team, { status: 201 });
});
