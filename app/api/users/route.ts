import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute, mapError, requireAdmin } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth";
import { UserCreateBody } from "@/lib/schemas";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        mustChangePassword: true,
        memberships: {
          include: { team: { select: { id: true, name: true } } },
        },
        userRoles: {
          include: { role: { select: { id: true, name: true, teamId: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    return mapError(err);
  }
}

export const POST = withRoute(async ({ user, body }) => {
  // `user` here is the acting admin (requireAdmin was already checked via the
  // requireAdmin import — but withRoute doesn't know to do that, so we
  // re-check explicitly to keep this file consistent with the previous
  // behavior).
  if (!user.isAdmin) {
    return apiError(403, "Forbidden: Admin required");
  }

  const parsed = UserCreateBody.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "Invalid request", { details: parsed.error.issues });
  }
  const {
    email,
    name,
    password,
    isAdmin: makeAdmin,
    teamIds,
    roleIds,
  } = parsed.data;

  // Only admins can grant admin. (A non-admin caller wouldn't even reach
  // this branch because the requireAdmin guard above would 403, but we
  // double-check the grant intent for the audit trail.)
  if (makeAdmin && !user.isAdmin) {
    return apiError(403, "Only admins can grant admin");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return apiError(409, "Email already exists");

  const passwordHash = await hashPassword(password);
  const created = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        isAdmin: makeAdmin,
        mustChangePassword: true,
      },
    });
    if (teamIds.length > 0) {
      await tx.teamMembership.createMany({
        data: teamIds.map((teamId) => ({ userId: newUser.id, teamId })),
        skipDuplicates: true,
      });
    }
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: newUser.id, roleId })),
        skipDuplicates: true,
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "create",
        entityType: "user",
        entityId: newUser.id,
        metadata: { email, name, isAdmin: makeAdmin },
      },
    });
    return newUser;
  });

  return NextResponse.json(created, { status: 201 });
});
