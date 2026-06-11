import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We deliberately do NOT use `output: "standalone"` because the
  // entrypoint needs to run Prisma migrations and seed the database
  // at boot, which requires a full `node_modules/`. The Dockerfile
  // ships the whole `node_modules/` and a slim base, which works out
  // roughly the same size but is more robust.
  //
  // `serverExternalPackages` keeps Prisma + bcryptjs + pg from being
  // bundled into the client/edge runtime; they need to be loaded
  // from node_modules at runtime.
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs", "pg"],

  // Explicitly pin the Turbopack workspace root to this directory.
  // Without this, Next.js picks the nearest ancestor that contains a
  // lockfile (e.g. /Users/carl/) and emits a warning. Harmless but
  // noisy in monorepo-adjacent setups.
  turbopack: {
    root: process.cwd(),
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; connect-src 'self'; upgrade-insecure-requests`,
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
