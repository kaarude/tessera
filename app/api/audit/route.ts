import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, mapError } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

const Query = z.object({
  teamId: z.string().cuid().optional(),
  actorId: z.string().cuid().optional(),
  action: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = Query.safeParse({
      teamId: searchParams.get("teamId") ?? undefined,
      actorId: searchParams.get("actorId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return apiError(400, "Invalid query");
    const { teamId, actorId, action, page, limit } = parsed.data;

    const where: Prisma.AuditLogWhereInput = {};
    if (teamId) where.teamId = teamId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return mapError(err);
  }
}
