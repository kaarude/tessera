import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, requireAuth } from "@/lib/auth";
import { assertTrustedOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth";
import { requiresCurrentPassword } from "@/lib/access";

const Body = z
  .object({
    userId: z.string().cuid().optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).max(200),
    forceReset: z.boolean().optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const session = await getSession();
    const body = Body.parse(await request.json());

    // Two cases:
    //   1) Authenticated user changing their own password — must supply current password.
    //   2) Admin forcing a reset on another user — uses forceReset and requires admin.
    // The unauthenticated "must change password" login flow uses case (1) with the
    // explicit `currentPassword: <their-just-used-password>` field.
    if (body.userId) {
      // Targeted change (admin reset or external flow)
      const me = await requireAuth({ allowPasswordChangeOnly: true });
      if (me.id !== body.userId && !me.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const needsCurrent = requiresCurrentPassword({
        actorId: me.id,
        targetId: body.userId,
        actorIsAdmin: me.isAdmin,
      });
      if (body.forceReset && me.id === body.userId) {
        return NextResponse.json(
          { error: "You cannot force-reset your own password" },
          { status: 403 },
        );
      }
      if (needsCurrent && !body.currentPassword) {
        return NextResponse.json(
          { error: "currentPassword is required to change your own password" },
          { status: 400 },
        );
      }
      if (body.currentPassword) {
        const target = await prisma.user.findUnique({
          where: { id: body.userId },
        });
        if (!target)
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        const ok = await verifyPassword(
          body.currentPassword,
          target.passwordHash,
        );
        if (!ok) {
          return NextResponse.json(
            { error: "Current password is incorrect" },
            { status: 401 },
          );
        }
      }
      const passwordHash = await hashPassword(body.newPassword);
      const updated = await prisma.user.update({
        where: { id: body.userId },
        data: {
          passwordHash,
          mustChangePassword: body.forceReset ? true : false,
          sessionVersion: { increment: 1 },
        },
      });
      if (me.id === body.userId && !body.forceReset) {
        session.sessionVersion = updated.sessionVersion;
        session.passwordChangeOnly = false;
        await session.save();
      }
      await logAudit({
        actorId: me.id,
        action: body.forceReset ? "force_password_reset" : "change_password",
        entityType: "user",
        entityId: body.userId,
        metadata: { forced: !!body.forceReset, targetId: body.userId },
      });
      return NextResponse.json({ success: true });
    }

    // Self-service change (no userId in body — change the caller's own password)
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!body.currentPassword) {
      return NextResponse.json(
        { error: "currentPassword is required" },
        { status: 400 },
      );
    }
    const me = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ok = await verifyPassword(body.currentPassword, me.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }
    const passwordHash = await hashPassword(body.newPassword);
    const updated = await prisma.user.update({
      where: { id: me.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
    session.sessionVersion = updated.sessionVersion;
    session.passwordChangeOnly = false;
    await session.save();
    await logAudit({
      actorId: me.id,
      action: "change_password",
      entityType: "user",
      entityId: me.id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          error: "Invalid request",
          issues: (error as { issues: unknown }).issues,
        },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
