# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────
#  Tessera production image
#  Built for self-hosters. Multi-stage so the final image is small and
#  the runtime runs as a non-root user.
# ──────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# 1. Dependencies — install everything we need for the build.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Skip postinstall (prisma generate) here; we'll do it in the builder
# stage against the actual Prisma schema after copying source.
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

# 3. Production runner — only ship the artifacts the runtime needs.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl curl tini && \
    addgroup -g 1001 -S nodejs && \
    adduser -S tessera -u 1001

# Copy the standalone server, the static assets, and the Prisma client.
COPY --from=builder --chown=tessera:nodejs /app/public ./public
COPY --from=builder --chown=tessera:nodejs /app/.next/standalone ./
COPY --from=builder --chown=tessera:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=tessera:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=tessera:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=tessera:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=tessera:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=tessera:nodejs /app/node_modules/@aws-sdk ./node_modules/@aws-sdk
COPY --from=builder --chown=tessera:nodejs /app/node_modules/pg ./node_modules/pg
COPY --from=builder --chown=tessera:nodejs /app/node_modules/iron-session ./node_modules/iron-session
COPY --from=builder --chown=tessera:nodejs /app/node_modules/uuid ./node_modules/uuid
COPY --from=builder --chown=tessera:nodejs /app/prisma ./prisma
COPY --from=builder --chown=tessera:nodejs /app/package.json ./package.json
COPY --from=builder --chown=tessera:nodejs /app/next.config.ts ./next.config.ts

# Boot-time script that runs Prisma migrations, then execs the Next.js
# server. We do migrations at startup so a fresh `docker compose up`
# brings the DB to the latest schema automatically.
COPY --chown=tessera:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER tessera
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/auth/me || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
