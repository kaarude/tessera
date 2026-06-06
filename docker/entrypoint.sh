#!/bin/sh
# Tessera entrypoint. Runs Prisma migrations against the configured
# DATABASE_URL, then hands off to the CMD (the Next.js server).
#
# Set SKIP_MIGRATIONS=1 in your compose file to skip the migration step
# (useful for read-only replicas or when you run migrations elsewhere).

set -eu

echo "[tessera] starting $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Refuse to start with the example SESSION_SECRET.
if [ -z "${SESSION_SECRET:-}" ]; then
  echo "[tessera] FATAL: SESSION_SECRET is not set." >&2
  echo "[tessera] Generate one with:  openssl rand -base64 48" >&2
  exit 1
fi
if [ "${SESSION_SECRET}" = "your-super-secret-session-key-change-this-in-production" ] || \
   [ "${SESSION_SECRET}" = "placeholder_session_secret_placeholder_session_secret" ]; then
  echo "[tessera] FATAL: SESSION_SECRET is set to the example value." >&2
  echo "[tessera] Generate one with:  openssl rand -base64 48" >&2
  exit 1
fi
if [ "${#SESSION_SECRET}" -lt 32 ]; then
  echo "[tessera] FATAL: SESSION_SECRET must be at least 32 characters." >&2
  exit 1
fi

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[tessera] running database migrations..."
  # Run the Prisma CLI directly from the bundled node_modules.
  if ! node ./node_modules/prisma/build/index.js migrate deploy; then
    echo "[tessera] FATAL: database migration failed." >&2
    exit 1
  fi

  # Seed on first boot if the database is empty.
  USER_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');(async()=>{try{const p=new PrismaClient();const c=await p.user.count();console.log(c);await p.\$disconnect();}catch(e){console.log('err')}})()" 2>/dev/null || echo "0")
  if [ "${AUTO_SEED:-0}" = "1" ] && [ "${USER_COUNT}" = "0" ]; then
    echo "[tessera] seeding database with demo data..."
    if ! node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts; then
      echo "[tessera] seed failed (non-fatal)"
    fi
  fi
fi

echo "[tessera] starting server..."
exec "$@"
