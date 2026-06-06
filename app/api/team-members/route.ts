import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, mapError } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

const Query = z.object({ teamId: z.string().cuid() });

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const parsed = Query.safeParse({
      teamId: new URL(request.url).searchParams.get("teamId"),
    });
    if (!parsed.success) return apiError(400, "Invalid teamId");
    const { teamId } = parsed.data;
    if (
      !user.memberships.some((membership) => membership.teamId === teamId) &&
      !user.isAdmin
    ) {
      return apiError(403, "Not a member of that team");
    }
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return NextResponse.json(memberships.map(({ user: member }) => member));
  } catch (error) {
    return mapError(error);
  }
}
