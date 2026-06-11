import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { randomToken, sha256 } from "@/lib/security";
import { ALL_PERMISSIONS } from "@/lib/permissions";

const CreateBody = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).max(25),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const GET = withRoute(async ({ user }) => {
  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tokens);
});

export const POST = withRoute(async ({ user, body }) => {
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return apiError(400, "Invalid token request");
  const raw = randomToken("tes");
  const token = await prisma.apiToken.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      prefix: raw.slice(0, 12),
      tokenHash: sha256(raw),
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });
  return NextResponse.json(
    { id: token.id, token: raw, prefix: token.prefix },
    { status: 201 },
  );
});
