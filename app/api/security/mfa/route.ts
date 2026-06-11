import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { apiError } from "@/lib/api-error";
import {
  generateMfaSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/mfa";
import { decryptSecret, encryptSecret } from "@/lib/security";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("confirm"), code: z.string().length(6) }),
  z.object({ action: z.literal("disable"), code: z.string().min(6).max(30) }),
]);

export const POST = withRoute(async ({ user, body }) => {
  const parsed = Body.safeParse(body);
  if (!parsed.success) return apiError(400, "Invalid MFA request");
  if (parsed.data.action === "setup") {
    const secret = generateMfaSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecretEncrypted: encryptSecret(secret), mfaEnabled: false },
    });
    const issuer = encodeURIComponent("Tessera");
    const label = encodeURIComponent(`Tessera:${user.email}`);
    return NextResponse.json({
      secret,
      otpauth: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`,
    });
  }
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      mfaSecretEncrypted: true,
      mfaEnabled: true,
      recoveryCodeHashes: true,
    },
  });
  if (!current?.mfaSecretEncrypted)
    return apiError(400, "MFA setup not started");
  const secret = decryptSecret(current.mfaSecretEncrypted);
  const validTotp = verifyTotp(secret, parsed.data.code);
  const recoveryHash = hashRecoveryCode(parsed.data.code);
  const recoveryIndex = current.recoveryCodeHashes.indexOf(recoveryHash);
  if (!validTotp && recoveryIndex < 0) return apiError(400, "Invalid code");

  if (parsed.data.action === "confirm") {
    const recoveryCodes = generateRecoveryCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
      },
    });
    return NextResponse.json({ enabled: true, recoveryCodes });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      recoveryCodeHashes: [],
      sessionVersion: { increment: 1 },
    },
  });
  return NextResponse.json({ enabled: false });
});
