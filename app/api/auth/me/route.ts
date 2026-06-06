import { NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let authenticated;
  try {
    authenticated = await requireAuth();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 403 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: authenticated.id },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      avatarUrl: true,
      mustChangePassword: true,
      memberships: {
        include: {
          team: { select: { id: true, name: true } },
        },
      },
      userRoles: {
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
