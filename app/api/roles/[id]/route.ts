import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute, logAudit } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { RoleUpdateBody } from "@/lib/schemas";

const CUID = /^c[a-z0-9]{20,}$/;

export const PATCH = withRoute<{ id: string }>(
  async ({ user, body, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid id");

    const parsed = RoleUpdateBody.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Invalid request", { details: parsed.error.issues });
    }
    const { name, description, permissions } = parsed.data;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    const allowed =
      user.isAdmin ||
      (await hasPermission(user.id, "roles:edit", existing.teamId ?? undefined));
    if (!allowed) return apiError(403, "Forbidden: roles:edit required");

    if (permissions !== undefined) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId: id, permission: p })),
        });
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
      include: { permissions: true },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "role",
      entityId: id,
      teamId: existing.teamId ?? undefined,
      metadata: { name: role.name },
    });

    return NextResponse.json(role);
  },
);

export const DELETE = withRoute<{ id: string }>(
  async ({ user, params }) => {
    const { id } = params;
    if (!CUID.test(id)) return apiError(400, "Invalid id");

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return apiError(404, "Not found");

    const allowed =
      user.isAdmin ||
      (await hasPermission(user.id, "roles:delete", existing.teamId ?? undefined));
    if (!allowed) return apiError(403, "Forbidden: roles:delete required");

    await prisma.role.delete({ where: { id } });
    await logAudit({
      actorId: user.id,
      action: "delete",
      entityType: "role",
      entityId: id,
      teamId: existing.teamId ?? undefined,
    });
    return NextResponse.json({ success: true });
  },
);
