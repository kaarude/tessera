import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { assertTrustedOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { uploadToS3, getSignedDownloadUrl } from "@/lib/s3";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const me = await requireAuth();

    if (me.isAdmin) {
      return NextResponse.json(
        { error: "Admins cannot upload avatars" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Avatar file is required" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Avatar must be under 2MB" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF are allowed" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split("/")[1];
    const key = `avatars/${me.id}/${Date.now()}.${ext}`;

    await uploadToS3(key, buffer, file.type);

    // Clean up old avatar if it exists
    const oldUser = await prisma.user.findUnique({
      where: { id: me.id },
      select: { avatarUrl: true },
    });

    if (oldUser?.avatarUrl) {
      const oldKey = oldUser.avatarUrl
        .split("?")[0]
        .split("/")
        .slice(-2)
        .join("/");
      if (oldKey.startsWith("avatars/")) {
        try {
          const { deleteFromS3 } = await import("@/lib/s3");
          await deleteFromS3(oldKey);
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    const signedUrl = await getSignedDownloadUrl(key, 60 * 60 * 24 * 7); // 7 days

    await prisma.user.update({
      where: { id: me.id },
      data: { avatarUrl: signedUrl },
    });

    await logAudit({
      actorId: me.id,
      action: "update",
      entityType: "user",
      entityId: me.id,
      metadata: { avatarUpdated: true },
    });

    return NextResponse.json({ avatarUrl: signedUrl });
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
