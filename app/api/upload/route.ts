import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { deleteFromS3, uploadToS3 } from "@/lib/s3";
import { logAudit } from "@/lib/audit";
import { apiError } from "@/lib/api-error";
import { hasPermission } from "@/lib/permissions-server";
import { assertTrustedOrigin } from "@/lib/security";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_USER_BYTES = 250 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
]);

function hasExpectedSignature(buffer: Buffer, type: string) {
  if (type.startsWith("text/")) return !buffer.includes(0);
  if (type === "application/pdf")
    return buffer.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (type === "image/gif")
    return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString());
  if (type === "image/webp")
    return (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    );
  return false;
}

export const runtime = "nodejs"; // Buffer + S3 SDK

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const noteIdRaw = formData.get("noteId");
    const noteId = typeof noteIdRaw === "string" ? noteIdRaw : null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
        { status: 413 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError(415, "File type is not allowed");
    }
    const usedBytes = await prisma.noteAttachment.aggregate({
      where: { uploaderId: user.id },
      _sum: { size: true },
    });
    if ((usedBytes._sum.size || 0) + file.size > MAX_USER_BYTES) {
      return apiError(413, "Personal attachment quota exceeded");
    }

    // If a noteId is provided, the caller must own the note.
    if (noteId) {
      const parsed = z.string().cuid().safeParse(noteId);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid noteId" }, { status: 400 });
      }
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: { ownerId: true, teamId: true },
      });
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      if (note.ownerId !== user.id && !user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const allowed = await hasPermission(
        user.id,
        "notes:upload_attachments",
        note.teamId ?? undefined,
      );
      if (!allowed && !user.isAdmin) {
        return apiError(403, "Forbidden: notes:upload_attachments required");
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!hasExpectedSignature(buffer, file.type)) {
      return apiError(415, "File contents do not match the declared type");
    }
    // S3 keys for unattached uploads (no noteId) go to a user-scoped prefix.
    const keyPrefix = noteId ? `notes/${noteId}` : `uploads/${user.id}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    const key = `${keyPrefix}/${Date.now()}-${safeName}`;

    await uploadToS3(key, buffer, file.type || "application/octet-stream");
    let attachment = null;
    if (noteId) {
      try {
        attachment = await prisma.noteAttachment.create({
          data: {
            noteId,
            filename: file.name,
            s3Key: key,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            uploaderId: user.id,
          },
        });
      } catch (error) {
        await deleteFromS3(key).catch(() => undefined);
        throw error;
      }
    }

    await logAudit({
      actorId: user.id,
      action: "upload",
      entityType: noteId ? "note_attachment" : "upload",
      entityId: noteId ?? key,
      metadata: { key, size: file.size, mimeType: file.type },
    });

    return NextResponse.json({
      key,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      attachment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError(401, "Unauthorized");
    }
    console.error("Upload error:", error);
    return apiError(500, "Internal server error");
  }
}
