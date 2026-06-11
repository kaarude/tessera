import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { assertTrustedOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { UserProfileUpdateBody } from "@/lib/schemas";

export async function PATCH(request: Request) {
  try {
    assertTrustedOrigin(request);
    const me = await requireAuth();

    const body = UserProfileUpdateBody.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: body.error.issues },
        { status: 400 },
      );
    }

    // Admins do not get theme/avatar customization
    if (me.isAdmin && (body.data.theme || body.data.avatarUrl)) {
      return NextResponse.json(
        { error: "Admins cannot customize theme or avatar" },
        { status: 403 },
      );
    }

    const data: Record<string, unknown> = {};
    if (body.data.name !== undefined) data.name = body.data.name;
    if (body.data.avatarUrl !== undefined) data.avatarUrl = body.data.avatarUrl;
    if (body.data.theme !== undefined) data.theme = body.data.theme;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        avatarUrl: true,
        theme: true,
        mustChangePassword: true,
        mfaEnabled: true,
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

    await logAudit({
      actorId: me.id,
      action: "update",
      entityType: "user",
      entityId: me.id,
      metadata: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
