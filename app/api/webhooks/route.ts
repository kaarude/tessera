import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import {
  encryptSecret,
  randomToken,
  sha256,
  validateOutboundUrl,
} from "@/lib/security";

const Body = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(2000),
  teamId: z.string().cuid().nullable().optional(),
  events: z.array(z.string().min(1).max(100)).min(1).max(25),
});

export const GET = withRoute(async ({ user }) => {
  const hooks = await prisma.webhook.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      url: true,
      teamId: true,
      events: true,
      enabled: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      createdAt: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(hooks);
});

export const POST = withRoute(async ({ user, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return apiError(400, "Invalid webhook request");
  if (
    parsed.data.teamId &&
    !user.isAdmin &&
    !user.memberships.some((item) => item.teamId === parsed.data.teamId)
  ) {
    return apiError(403, "Not a member of that team");
  }
  let url: string;
  try {
    url = validateOutboundUrl(parsed.data.url);
  } catch (error) {
    return apiError(400, (error as Error).message);
  }
  const secret = randomToken("whsec");
  const hook = await prisma.webhook.create({
    data: {
      userId: user.id,
      teamId: parsed.data.teamId || null,
      name: parsed.data.name,
      url,
      events: parsed.data.events,
      secretHash: sha256(secret),
      secretEncrypted: encryptSecret(secret),
    },
  });
  return NextResponse.json({ id: hook.id, secret }, { status: 201 });
});
