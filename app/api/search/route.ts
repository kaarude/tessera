import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { mapError } from "@/lib/route";

const Query = z.object({
  q: z.string().trim().min(2).max(100),
  teamId: z.string().cuid().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const parsed = Query.safeParse({
      q: url.searchParams.get("q"),
      teamId: url.searchParams.get("teamId") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ results: [] });
    }
    const { q, teamId } = parsed.data;
    const teamIds = user.isAdmin
      ? undefined
      : user.memberships.map((membership) => membership.teamId);
    if (teamId && teamIds && !teamIds.includes(teamId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const scopedTeams = teamId ? [teamId] : teamIds;
    const [notes, tasks, events, teams] = await Promise.all([
      prisma.note.findMany({
        where: {
          AND: [
            {
              OR: [
                { ownerId: user.id },
                { isPrivate: false, teamId: { in: scopedTeams } },
                {
                  shares: {
                    some: {
                      OR: [
                        { userId: user.id },
                        { teamId: { in: scopedTeams } },
                      ],
                    },
                  },
                },
              ],
            },
            {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: { id: true, title: true, content: true, updatedAt: true },
        take: 8,
      }),
      prisma.task.findMany({
        where: {
          teamId: scopedTeams ? { in: scopedTeams } : undefined,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, description: true, updatedAt: true },
        take: 8,
      }),
      prisma.calendarEntry.findMany({
        where: {
          teamId: scopedTeams ? { in: scopedTeams } : undefined,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, description: true, startDate: true },
        take: 8,
      }),
      prisma.team.findMany({
        where: {
          id: scopedTeams ? { in: scopedTeams } : undefined,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, description: true },
        take: 5,
      }),
    ]);
    return NextResponse.json({
      results: [
        ...notes.map((item) => ({
          type: "note",
          id: item.id,
          title: item.title,
          detail: item.content.slice(0, 120),
          href: `/notes/${item.id}`,
        })),
        ...tasks.map((item) => ({
          type: "task",
          id: item.id,
          title: item.title,
          detail: item.description || "Task",
          href: "/tasks",
        })),
        ...events.map((item) => ({
          type: "event",
          id: item.id,
          title: item.title,
          detail: item.description || item.startDate.toLocaleString(),
          href: "/calendar",
        })),
        ...teams.map((item) => ({
          type: "team",
          id: item.id,
          title: item.name,
          detail: item.description || "Team",
          href: "/teams",
        })),
      ],
    });
  } catch (error) {
    return mapError(error);
  }
}
