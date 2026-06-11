import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createHmac } from "node:crypto";
import { decryptSecret } from "./security";

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
  const log = await prisma.auditLog.create({
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
  if (process.env.NODE_ENV === "test") return log;
  await deliverWebhooks({
    event: `${args.entityType}.${args.action}`,
    teamId: args.teamId,
    payload: {
      id: log.id,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      teamId: args.teamId ?? null,
      createdAt: log.createdAt?.toISOString() ?? new Date().toISOString(),
    },
  }).catch(() => undefined);
  return log;
}

async function deliverWebhooks(args: {
  event: string;
  teamId?: string;
  payload: Record<string, unknown>;
}) {
  const hooks = await prisma.webhook.findMany({
    where: {
      enabled: true,
      events: { has: args.event },
      OR: [{ teamId: null }, { teamId: args.teamId }],
    },
  });
  const body = JSON.stringify({
    event: args.event,
    data: args.payload,
  });
  await Promise.allSettled(
    hooks.map(async (hook) => {
      const secret = decryptSecret(hook.secretEncrypted);
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Tessera-Webhook/1.0",
            "X-Tessera-Event": args.event,
            "X-Tessera-Signature-256": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(8_000),
          redirect: "error",
        });
        await prisma.$transaction([
          prisma.webhookDelivery.create({
            data: {
              webhookId: hook.id,
              event: args.event,
              statusCode: response.status,
              success: response.ok,
              error: response.ok ? null : `HTTP ${response.status}`,
            },
          }),
          prisma.webhook.update({
            where: { id: hook.id },
            data: response.ok
              ? { lastSuccessAt: new Date() }
              : { lastFailureAt: new Date() },
          }),
        ]);
      } catch (error) {
        await prisma.$transaction([
          prisma.webhookDelivery.create({
            data: {
              webhookId: hook.id,
              event: args.event,
              success: false,
              error:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : "Delivery failed",
            },
          }),
          prisma.webhook.update({
            where: { id: hook.id },
            data: { lastFailureAt: new Date() },
          }),
        ]);
      }
    }),
  );
}
