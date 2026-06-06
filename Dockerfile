# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────
#  Tessera production image
#
#  Built for self-hosters. Multi-stage so the final image is small and
#  the runtime runs as a non-root user. We deliberately do NOT use
#  Next.js's `output: "standalone"` mode because the entrypoint needs
#  to run Prisma migrations and seed the database, which requires a
#  full `node_modules/`. The size cost is ~300MB on disk; the
#  reliability gain is worth it.
# ──────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# 1. Dependencies — install everything we need for the build.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Skip the postinstall (prisma generate) here; we'll do it in the
# builder stage against the actual Prisma schema.
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN npm ci --no-audit --no-fund

# 2. Builder — compile the Next.js app and generate the Prisma client.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
# These are placeholders so `next build` succeeds. They are NOT used at
# runtime — the real values are injected at container start.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV SESSION_SECRET=placeholder_session_secret_placeholder_session_secret
ENV S3_ENDPOINT=http://localhost:9000
ENV S3_REGION=us-east-1
ENV S3_ACCESS_KEY_ID=placeholder
ENV S3_SECRET_ACCESS_KEY=placeholder
ENV S3_BUCKET=tessera
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# 3. Production runner — ship a full node_modules so the entrypoint
#    can run Prisma migrations and the seed script at boot.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl curl tini && \
    addgroup -g 1001 -S nodejs && \
    adduser -S tessera -u 1001

# Copy the entire app (excluding devDeps in node_modules).
COPY --from=builder --chown=tessera:nodejs /app/public ./public
COPY --from=builder --chown=tessera:nodejs /app/.next ./.next
COPY --from=builder --chown=tessera:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tessera:nodejs /app/prisma ./prisma
COPY --from=builder --chown=tessera:nodejs /app/package.json ./package.json
COPY --from=builder --chown=tessera:nodejs /app/next.config.ts ./next.config.ts
# Drop dev-only npm subdirs that the prod image doesn't need.
# (We just shipped everything; cleaning these reduces size a bit.)
RUN rm -rf node_modules/.cache node_modules/*/test 2>/dev/null || true

# Boot-time script that runs Prisma migrations, then execs the Next.js
# server. The script MUST be in the build context; the .dockerignore
# explicitly does NOT exclude the `docker/` directory.
COPY --chown=tessera:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER tessera
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]
