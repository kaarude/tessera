import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";

const Column = z.object({
  name: z.string().min(1).max(50),
  position: z.number().int().min(0),
});
const Body = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  teamId: z.string().cuid().nullable().optional(),
  columns: z.array(Column).min(1).max(20),
});

export const GET = withRoute(async ({ user }) => {
  const templates = await prisma.taskBoardTemplate.findMany({
    where: user.isAdmin
      ? {}
      : {
          OR: [
            { teamId: null },
            { teamId: { in: user.memberships.map((item) => item.teamId) } },
          ],
        },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
});

export const POST = withRoute(async ({ user, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return apiError(400, "Invalid template");
  if (
    parsed.data.teamId &&
    !user.isAdmin &&
    !user.memberships.some((item) => item.teamId === parsed.data.teamId)
  ) {
    return apiError(403, "Not a member of that team");
  }
  const template = await prisma.taskBoardTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      teamId: parsed.data.teamId || null,
      columns: parsed.data.columns,
      createdById: user.id,
    },
  });
  return NextResponse.json(template, { status: 201 });
});
