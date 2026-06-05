import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output gives us a self-contained `server.js` that the
  // production Docker image can run without copying node_modules in full.
  output: "standalone",
  // Allow `bcryptjs` (pure-JS) without bundling complaints.
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs", "pg"],
  // Some deps (notably @prisma + bcryptjs) are CommonJS and should not
  // be transpiled into the bundle.
  experimental: {
    // Avoid the workspace-root warning when running inside a monorepo
    // (harmless for single-package installs).
  },
  // Trust the proxy when running behind one. The rate limiter and
  // audit log trust x-forwarded-for. Adjust this to your proxy.
  // (The actual middleware lives in entrypoint.sh + auth.ts.)
};

export default nextConfig;
