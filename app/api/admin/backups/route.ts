import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { encryptBuffer, sha256 } from "@/lib/security";
import { uploadToS3 } from "@/lib/s3";

export const GET = withRoute(
  async () => {
    const backups = await prisma.systemBackup.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json(backups);
  },
  { adminOnly: true },
);

export const POST = withRoute(
  async ({ user }) => {
    const [
      users,
      teams,
      memberships,
      roles,
      rolePermissions,
      userRoles,
      notes,
      noteShares,
      calendarEntries,
      boards,
      columns,
      tasks,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.team.findMany(),
      prisma.teamMembership.findMany(),
      prisma.role.findMany(),
      prisma.rolePermission.findMany(),
      prisma.userRole.findMany(),
      prisma.note.findMany(),
      prisma.noteShare.findMany(),
      prisma.calendarEntry.findMany(),
      prisma.taskBoard.findMany(),
      prisma.taskColumn.findMany(),
      prisma.task.findMany(),
    ]);
    const payload = Buffer.from(
      JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        data: {
          users,
          teams,
          memberships,
          roles,
          rolePermissions,
          userRoles,
          notes,
          noteShares,
          calendarEntries,
          boards,
          columns,
          tasks,
        },
      }),
    );
    const encrypted = encryptBuffer(payload);
    const checksum = sha256(encrypted);
    const filename = `tessera-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const s3Key = `backups/${filename}`;
    await uploadToS3(s3Key, encrypted, "application/octet-stream");
    const backup = await prisma.systemBackup.create({
      data: {
        createdById: user.id,
        filename,
        s3Key,
        size: encrypted.length,
        checksum,
      },
    });
    return NextResponse.json(backup, { status: 201 });
  },
  { adminOnly: true },
);
