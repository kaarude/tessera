import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import { downloadFromS3 } from "@/lib/s3";
import { decryptBuffer, sha256 } from "@/lib/security";
import type { Prisma } from "@prisma/client";

type RestoreData = {
  users?: Prisma.UserCreateManyInput[];
  teams?: Prisma.TeamCreateManyInput[];
  memberships?: Prisma.TeamMembershipCreateManyInput[];
  roles?: Prisma.RoleCreateManyInput[];
  rolePermissions?: Prisma.RolePermissionCreateManyInput[];
  userRoles?: Prisma.UserRoleCreateManyInput[];
  notes?: Prisma.NoteCreateManyInput[];
  noteShares?: Prisma.NoteShareCreateManyInput[];
  calendarEntries?: Prisma.CalendarEntryCreateManyInput[];
  boards?: Prisma.TaskBoardCreateManyInput[];
  columns?: Prisma.TaskColumnCreateManyInput[];
  tasks?: Prisma.TaskCreateManyInput[];
};

const Body = z.object({
  confirmation: z.literal("RESTORE TESSERA"),
  previewOnly: z.boolean().default(true),
});

export const POST = withRoute<{ id: string }>(
  async ({ params, body }) => {
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return apiError(400, 'Type "RESTORE TESSERA" to confirm');
    }
    const backup = await prisma.systemBackup.findUnique({
      where: { id: params.id },
    });
    if (!backup) return apiError(404, "Backup not found");
    const raw = await downloadFromS3(backup.s3Key);
    if (sha256(raw) !== backup.checksum) {
      return apiError(409, "Backup checksum validation failed");
    }
    const snapshot = JSON.parse(decryptBuffer(raw).toString("utf8")) as {
      version: number;
      data: Record<string, unknown[]>;
    };
    if (snapshot.version !== 1 || !snapshot.data) {
      return apiError(400, "Unsupported backup format");
    }
    const counts = Object.fromEntries(
      Object.entries(snapshot.data).map(([key, value]) => [key, value.length]),
    );
    if (parsed.data.previewOnly) {
      return NextResponse.json({
        valid: true,
        counts,
        checksum: backup.checksum,
      });
    }
    const data = snapshot.data as RestoreData;
    await prisma.$transaction(
      async (tx) => {
        await tx.webhookDelivery.deleteMany();
        await tx.webhook.deleteMany();
        await tx.apiToken.deleteMany();
        await tx.userSession.deleteMany();
        await tx.notification.deleteMany();
        await tx.noteAttachment.deleteMany();
        await tx.auditLog.deleteMany();
        await tx.task.deleteMany();
        await tx.taskColumn.deleteMany();
        await tx.taskBoard.deleteMany();
        await tx.taskBoardTemplate.deleteMany();
        await tx.calendarEntry.deleteMany();
        await tx.noteShare.deleteMany();
        await tx.note.deleteMany();
        await tx.userRole.deleteMany();
        await tx.rolePermission.deleteMany();
        await tx.role.deleteMany();
        await tx.teamMembership.deleteMany();
        await tx.team.deleteMany();
        await tx.systemBackup.deleteMany();
        await tx.loginAttempt.deleteMany();
        await tx.user.deleteMany();

        if (data.users?.length) await tx.user.createMany({ data: data.users });
        if (data.teams?.length) await tx.team.createMany({ data: data.teams });
        if (data.memberships?.length)
          await tx.teamMembership.createMany({ data: data.memberships });
        if (data.roles?.length) await tx.role.createMany({ data: data.roles });
        if (data.rolePermissions?.length)
          await tx.rolePermission.createMany({ data: data.rolePermissions });
        if (data.userRoles?.length)
          await tx.userRole.createMany({ data: data.userRoles });
        if (data.notes?.length) await tx.note.createMany({ data: data.notes });
        if (data.noteShares?.length)
          await tx.noteShare.createMany({ data: data.noteShares });
        if (data.calendarEntries?.length)
          await tx.calendarEntry.createMany({ data: data.calendarEntries });
        if (data.boards?.length)
          await tx.taskBoard.createMany({ data: data.boards });
        if (data.columns?.length)
          await tx.taskColumn.createMany({ data: data.columns });
        if (data.tasks?.length) await tx.task.createMany({ data: data.tasks });
      },
      { timeout: 120_000 },
    );
    return NextResponse.json({
      restored: true,
      counts,
      message: "Restore completed. All active sessions were revoked.",
    });
  },
  { adminOnly: true },
);
