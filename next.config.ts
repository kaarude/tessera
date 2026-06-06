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
};

export default nextConfig;
