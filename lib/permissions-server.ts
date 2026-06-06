import { prisma } from "./prisma";
import { ALL_PERMISSIONS } from "./permissions";

export async function getUserPermissions(userId: string, teamId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (user?.isAdmin) return new Set<string>(ALL_PERMISSIONS);

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [{ role: { teamId: teamId ?? null } }, { role: { isPlatform: true } }],
    },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  const permissions = new Set<string>();
  for (const ur of userRoles) {
    for (const p of ur.role.permissions) {
      permissions.add(p.permission);
    }
  }

  return permissions;
}

export async function hasPermission(
  userId: string,
  permission: string,
  teamId?: string
) {
  const perms = await getUserPermissions(userId, teamId);
  return perms.has(permission);
}

export async function requirePermission(
  userId: string,
  permission: string,
  teamId?: string
) {
  const has = await hasPermission(userId, permission, teamId);
  if (!has) {
    throw new Error(`Forbidden: ${permission} required`);
  }
}
