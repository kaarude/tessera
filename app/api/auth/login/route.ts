import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";

const Body = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(200),
  })
  .strict();

function getClientIp(request: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "";
  // Trust the first entry in x-forwarded-for. On Vercel/Cloudflare/Railway
  // the platform sets this. If you proxy through a custom chain, harden
  // the index accordingly.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const email = body.email.toLowerCase();
    // Build the rate-limit key set. The IP key is only included when
    // we have a trusted client IP (TRUST_PROXY=1 with a valid header).
    // Without it, every request would share the same "ip:" bucket and
    // a single user failing login would throttle everyone.
    const rateLimitKeys = [`email:${email}`];
    if (ip) rateLimitKeys.push(`ip:${ip}`);
    const { allowed, retryAfterMs } = await checkRateLimit(rateLimitKeys);
    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Use a deliberately vague message so attackers can't enumerate users.
      // We do NOT clear the rate limit on failure — wrong-email attempts
      // should still burn the budget.
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Successful auth — release the rate-limit bucket for the email. The IP
    // bucket is left intact (a busy NAT could share IPs across real users).
    await clearRateLimit(`email:${email}`);

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.isAdmin = user.isAdmin;
    session.sessionVersion = user.sessionVersion;
    session.passwordChangeOnly = user.mustChangePassword;
    await session.save();

    await logAudit({
      actorId: user.id,
      action: "login",
      entityType: "user",
      entityId: user.id,
      metadata: { ip },
    });

    if (user.mustChangePassword) {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          mustChangePassword: true,
        },
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
