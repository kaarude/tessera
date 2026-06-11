import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, withRoute, mapError, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { RoleCreateBody } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || undefined;
    if (
      teamId &&
      !user.memberships.some((m) => m.teamId === teamId) &&
      !user.isAdmin
    ) {
      return apiError(403, "Not a member of that team");
    }
    const roles = await prisma.role.findMany({
      where: teamId ? { teamId } : {},
      include: {
        permissions: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(roles);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(async ({ user, body }) => {
  const parsed = RoleCreateBody.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "Invalid request", { details: parsed.error.issues });
  }
  const { name, description, teamId, permissions } = parsed.data;

  if (
    teamId &&
    !user.memberships.some((m) => m.teamId === teamId) &&
    !user.isAdmin
  ) {
    return apiError(403, "Not a member of that team");
  }
  const allowed =
    user.isAdmin ||
    (await hasPermission(user.id, "roles:create", teamId ?? undefined));
  if (!allowed) return apiError(403, "Forbidden: roles:create required");

  const role = await prisma.role.create({
    data: {
      name,
      description,
      teamId: teamId ?? null,
      isPlatform: !teamId,
      permissions: {
        create: permissions.map((p) => ({ permission: p })),
      },
    },
    include: { permissions: true },
  });

  await logAudit({
    actorId: user.id,
    action: "create",
    entityType: "role",
    entityId: role.id,
    teamId: teamId ?? undefined,
    metadata: { name, permissions },
  });

  return NextResponse.json(role, { status: 201 });
});
