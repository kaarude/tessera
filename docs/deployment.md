# Tessera — deployment guide

This document goes deeper than the README. The README is "how do I get
running"; this is "how do I run this in production and not have a bad
time."

## 1. Bare-metal / VM with docker compose

The simplest production deployment. One machine, three containers.

### Prerequisites

- Linux VM with 1 vCPU / 1 GB RAM minimum (2 vCPU / 2 GB recommended for
  small teams)
- A reverse proxy in front of the app (Caddy, Traefik, or nginx)
- A DNS record pointing at the VM
- Automated Postgres backups (see [§6](#6-backups))

### Steps

```bash
# On the VM
git clone https://github.com/kaarude/tessera /opt/tessera
cd /opt/tessera

cp .env.example .env
# Generate a real SESSION_SECRET
SECRET=$(openssl rand -base64 48)
sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=\"$SECRET\"|" .env

# Set the public URL
sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=\"https://tessera.example.com\"|" .env

docker compose up -d
```

Put a Caddy in front:

```caddyfile
tessera.example.com {
    reverse_proxy localhost:3000
    encode zstd gzip
}
```

That's it. Certs are automatic.

### Upgrading

```bash
cd /opt/tessera
git pull
docker compose pull      # if using the prebuilt image
docker compose up -d     # migrations run automatically
```

The app container runs `prisma migrate deploy` on every boot, so a fresh
release that includes a migration will apply it before serving traffic.

## 2. Kubernetes

There is no official Helm chart yet. A reasonable starting point:

```yaml
# tessera.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tessera
spec:
  replicas: 2
  selector:
    matchLabels: { app: tessera }
  template:
    metadata:
      labels: { app: tessera }
    spec:
      containers:
        - name: tessera
          image: ghcr.io/kaarude/tessera:latest
          ports: [{ containerPort: 3000 }]
          env:
            - { name: DATABASE_URL,      valueFrom: { secretKeyRef: { name: tessera-secrets, key: database-url } } }
            - { name: SESSION_SECRET,    valueFrom: { secretKeyRef: { name: tessera-secrets, key: session-secret } } }
            - { name: S3_ENDPOINT,        value: "https://s3.us-east-1.amazonaws.com" }
            - { name: S3_REGION,          value: "us-east-1" }
            - { name: S3_ACCESS_KEY_ID,   valueFrom: { secretKeyRef: { name: tessera-secrets, key: s3-access-key-id" } } }
            - { name: S3_SECRET_ACCESS_KEY, valueFrom: { secretKeyRef: { name: tessera-secrets, key: s3-secret-access-key" } } }
            - { name: S3_BUCKET,          value: "tessera" }
            - { name: NEXT_PUBLIC_APP_URL, value: "https://tessera.example.com" }
          livenessProbe:
            httpGet: { path: /api/auth/me, port: 3000 }
            periodSeconds: 30
            failureThreshold: 3
          readinessProbe:
            httpGet: { path: /api/auth/me, port: 3000 }
            periodSeconds: 5
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits:   { cpu: 500m, memory: 512Mi }
```

You'll need a Postgres operator (CloudNative-PG, Zalando, etc.) and an S3
bucket. The app's statelessness makes it easy to scale horizontally.

## 3. Reverse-proxy configuration

The app reads `x-forwarded-for` to determine the client IP (used for
rate-limiting and audit logging). Your reverse proxy must set this header
**and** strip any client-supplied version of it. The most paranoid
configuration:

- Caddy: no extra config — Caddy does this correctly by default.
- nginx: `proxy_set_header X-Forwarded-For $remote_addr;` (overwrites
  anything the client sent).
- Cloudflare: same; use `$cf-connecting-ip` if you prefer.

If you run the app behind multiple proxies, edit `app/api/auth/login/route.ts`
to use the right header index for your chain.

## 4. Database

Tessera supports any Postgres 15+. We test against 16.

Connection-pool size: the default Prisma + `pg` adapter uses the connection
string directly. For serverless deployments, wrap with PgBouncer in
transaction mode or use Prisma Accelerate. For long-running deployments,
the defaults are fine.

For migrations: the entrypoint script runs `prisma migrate deploy` on every
boot. To skip migrations on a particular replica (e.g. a read-scaling
sidecar), set `SKIP_MIGRATIONS=1`.

## 5. Object storage

Any S3-compatible store works. The only real requirement is that the
`S3_*` credentials have read/write access to the configured bucket.

For AWS S3, drop `S3_FORCE_PATH_STYLE` (or set it to `"false"`). For
self-hosted MinIO, leave it as `"true"`. The default endpoint `http://minio:9000`
is only valid inside the docker-compose network.

## 6. Backups

There is no built-in backup tool. Set up your own:

- **Postgres** — `pg_dump` to S3 nightly. `automated-backup` and
  `wal-g` both work well.
- **S3** — enable versioning on the bucket. S3 lifecycle rules can
  expire old versions after N days.
- **Session secret** — back up the `SESSION_SECRET` somewhere safe. If
  you lose it, everyone gets logged out. You can rotate it, but it's
  annoying.

Test your restore procedure quarterly.

## 7. Monitoring

Tessera exposes `/api/auth/me` as a liveness/readiness probe. A
`200 OK` means the app is up and Prisma can talk to the database. A
`401 Unauthorized` is also a valid response (it means the app is up but
the probe is unauthenticated) — healthcheck configurations should
treat both as healthy.

To enable error tracking, point `console.error` output at your
collector (Vector, Fluent Bit, etc.) and forward it to Sentry, Highlight,
or your tool of choice.

## 8. Upgrading

The upgrade process is:

1. Pull the new image / rebuild from source.
2. `docker compose up -d` (or `kubectl rollout restart`).
3. The new container runs `prisma migrate deploy` on boot.
4. Once the new pod is ready, traffic shifts over.

There is no in-place schema migration that requires downtime. The only
caveat is: if a migration adds a `NOT NULL` column, the column will be
populated with the column's default (or you must backfill in a separate
migration). This is standard Postgres migration hygiene.
