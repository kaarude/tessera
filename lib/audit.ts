import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function logAudit(args: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  teamId?: string;
  metadata?: Record<string, unknown>;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: args.actorId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      teamId: args.teamId,
      metadata: (args.metadata ?? {}) as Prisma.InputJsonValue,
      beforeData: (args.beforeData ?? {}) as Prisma.InputJsonValue,
      afterData: (args.afterData ?? {}) as Prisma.InputJsonValue,
    },
  });
}
