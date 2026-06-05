import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { uploadToS3 } from "@/lib/s3";
import { logAudit } from "@/lib/audit";
import { apiError } from "@/lib/api-error";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export const runtime = "nodejs"; // Buffer + S3 SDK

export async function POST(request: Request) {
  try {
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
        { status: 413 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    // If a noteId is provided, the caller must own the note.
    if (noteId) {
      const parsed = z.string().cuid().safeParse(noteId);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid noteId" }, { status: 400 });
      }
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: { ownerId: true },
      });
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      if (note.ownerId !== user.id && !user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // S3 keys for unattached uploads (no noteId) go to a user-scoped prefix.
    const keyPrefix = noteId
      ? `notes/${noteId}`
      : `uploads/${user.id}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    const key = `${keyPrefix}/${Date.now()}-${safeName}`;

    await uploadToS3(key, buffer, file.type || "application/octet-stream");

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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError(401, "Unauthorized");
    }
    console.error("Upload error:", error);
    return apiError(500, "Internal server error");
  }
}
