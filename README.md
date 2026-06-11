# Tessera

A self-hostable, multi-tenant team productivity platform. Private markdown
notes, a real calendar, a drag-and-drop kanban taskboard, custom roles and
permissions, full audit logs, and S3-backed attachments. Built so a team of
two or a team of two hundred can run it on their own infrastructure.

Tessera is the Latin word for the small tiles that fit together to make a
mosaic. Each feature is its own tile; together they're a single coherent
product.

---

## Highlights

- **Private-by-default notes.** Real markdown in, real markdown out. No
  abstraction layer, no rich-text-to-markdown conversion. The raw text is
  the source of truth and you can download any note as a `.md` file at any
  time. Sharing is explicit: you can share a note with specific users, or
  with a whole team, or keep it private forever.
- **Calendar with month / week / day views.** All-day events, timed events,
  team calendars, per-user assignment. Local-time-aware. No third-party
  calendar sync (yet).
- **Drag-and-drop kanban.** Multiple boards per team, customisable columns,
  right-click to reassign to a different user or team. Task
  permissions are honoured server-side.
- **Custom roles per team.** Every permission — note, calendar, task, audit,
  platform — is a checkbox in a fully editable matrix. There are no hidden
  role tiers.
- **Audit logs that mean something.** Every mutation is logged with the
  actor, target, before/after state, and team context. Filterable by
  anything you'd want to filter by. Admin-only by default.
- **Self-hostable in one command.** Postgres + MinIO + Tessera via
  `docker compose up`. No vendor lock-in. Bring your own S3 if you prefer.
- **No telemetry.** Nothing in the app phones home.

## Quick start (self-hosted)

You need Docker and Docker Compose. That's it.

```bash
# 1. Clone
git clone https://github.com/kaarude/tessera
cd tessera

# 2. Generate a strong session secret
cp .env.example .env
sed -i '' "s|SESSION_SECRET=.*|SESSION_SECRET=\"$(openssl rand -base64 48)\"|" .env
# (or run: openssl rand -base64 48  and paste the output into .env)

# 3. Boot
docker compose up -d

# 4. Visit http://localhost:3000 and log in
#    email:    admin
#    password: admin123
#
#    The seed generates random passwords and sets mustChangePassword=true,
#    so the accounts must set a real password on first login. Save the
#    credentials from the seed output.
```

The compose file brings up:

- **`db`** — Postgres 16 with a persistent volume.
- **`minio`** — S3-compatible object storage with a persistent volume and a
  web console on port 9001.
- **`minio-bucket-init`** — a one-shot job that creates the `tessera`
  bucket on first boot.
- **`app`** — the Next.js server. Runs migrations on boot, then listens on
  port 3000.

To run without Docker, see [CONTRIBUTING.md](./CONTRIBUTING.md) for the
local-dev setup.

## Quick start (development)

```bash
nvm use                    # Node 22
cp .env.example .env       # fill in SESSION_SECRET
npm install                # also runs `prisma generate`
npx prisma migrate dev     # create the schema
npm run seed               # demo data
npm run dev                # http://localhost:3000
```

## Configuration

Every environment variable is documented in [`.env.example`](./.env.example).
The most important one is `SESSION_SECRET` — the app will refuse to start
if it's missing, set to the example value, or shorter than 32 characters.

| Variable             | Required | Notes                                                |
| -------------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL`       | yes      | Postgres connection string                            |
| `SESSION_SECRET`     | yes      | 32+ char random string                               |
| `S3_ENDPOINT`        | yes      | MinIO default: `http://minio:9000`                   |
| `S3_ACCESS_KEY_ID`   | yes      |                                                      |
| `S3_SECRET_ACCESS_KEY` | yes    |                                                      |
| `S3_BUCKET`          | yes      | Created automatically by `minio-bucket-init`         |
| `S3_FORCE_PATH_STYLE`| no       | `true` for MinIO, unset for AWS S3                   |
| `NEXT_PUBLIC_APP_URL`| yes      | Absolute URL of the app, used in notifications        |
| `AUTO_SEED`          | no       | `1` seeds demo data on first boot if DB is empty     |
| `APP_PORT`           | no       | Host port for the app (default 3000)                 |

See [SECURITY.md](./SECURITY.md) for the full self-hosting hardening
checklist.

## Architecture

```
                       ┌─────────────────────────┐
                       │        Browser          │
                       └───────────┬─────────────┘
                                   │ HTTPS
                                   ▼
            ┌──────────────────────────────────────────────┐
            │            Reverse proxy (Caddy,             │
            │          Traefik, Cloudflare, etc.)          │
            └──────────────────────┬───────────────────────┘
                                   │
                                   ▼
                       ┌─────────────────────────┐
                       │      Tessera (Next.js)  │
                       │  iron-session, Prisma,  │
                       │    S3 SDK, Zod, RBAC    │
                       └────┬──────────────┬─────┘
                            │              │
              ┌─────────────┘              └────────────┐
              ▼                                        ▼
       ┌─────────────┐                         ┌─────────────┐
       │ PostgreSQL  │                         │   MinIO /   │
       │  (data)     │                         │  AWS S3     │
       └─────────────┘                         │ (blobs)     │
                                               └─────────────┘
```

- **App tier** is stateless; you can run multiple replicas behind a load
  balancer. The session is a signed cookie; no Redis is required.
- **Database tier** should be backed up. There is no built-in backup tool.
- **Object storage** is the only place attachments live. Keep the bucket
  private.

### Data model at a glance

- `User` — has many `Note`, `Task`, `CalendarEntry`, `TeamMembership`, `UserRole`
- `Team` — has many `Role`, `Note`, `CalendarEntry`, `Task`, `TaskBoard`
- `Role` — has many `RolePermission`; granted to a `User` via `UserRole`
  scoped to a `Team` or platform-wide
- `Note` — has many `NoteShare` (per-user or per-team) and `NoteAttachment`
- `TaskBoard` — has many `TaskColumn`; `Task` belongs to a `Column` and a
  `Board`
- `CalendarEntry` — owned by a `User`, optionally scoped to a `Team`,
  optionally `assignedTo` a `User`
- `AuditLog` — append-only; one row per mutation
- `Notification` — in-app per-user; surfaced by the bell in the topbar and
  by the Web Notifications API
- `LoginAttempt` — sliding-window rate-limit data for the login endpoint

### Permission model

The full permission matrix lives in [`lib/permissions.ts`](./lib/permissions.ts).
Every API route that mutates data calls `requirePermission(user.id, "perm",
teamId)` (via the `withRoute` wrapper in [`lib/route.ts`](./lib/route.ts)).
Admins (the `isAdmin` boolean on `User`) bypass every permission check.

To add a new permission:

1. Add the string to `ALL_PERMISSIONS` in `lib/permissions.ts`.
2. Use it via `hasPermission(user.id, "your:new:perm", teamId)` in the
   relevant route.
3. Add a checkbox in [`app/roles/page.tsx`](./app/roles/page.tsx) so admins
   can grant it.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

## Development

```bash
npm run dev          # Next.js dev server with HMR
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
npm run test:e2e     # Playwright (requires `docker compose up -d db minio` first)
npm run seed         # Re-seed the dev database (destructive)
npx prisma studio    # Open the DB in a browser
```

The CI pipeline on every PR runs `lint`, `typecheck`, `build`, and the
unit tests against a live Postgres. The E2E suite runs nightly.

## Deployment

The `Dockerfile` is production-ready: multi-stage, runs as a non-root user
(`tessera`), uses Next.js's `output: "standalone"` for a small final image,
and has a healthcheck.

```bash
docker build -t tessera:latest .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=... \
  -e SESSION_SECRET=... \
  -e S3_ENDPOINT=... \
  -e S3_ACCESS_KEY_ID=... \
  -e S3_SECRET_ACCESS_KEY=... \
  -e S3_BUCKET=... \
  -e NEXT_PUBLIC_APP_URL=https://tessera.example.com \
  tessera:latest
```

Or just `docker compose up -d` on the host.

A pre-built image is published to
`ghcr.io/kaarude/tessera` on every push to `main` and every tag. Pin to a
specific version in production.

## Migrating from another tool

There is no importer yet. A `.zip` of `.md` files can be uploaded via the
API in a few lines of `curl`. PRs welcome for Notion / Evernote / Obsidian
importers.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). TL;DR: open an issue first if
the change is non-trivial, follow Conventional Commits, run the lint +
typecheck + tests before opening a PR.

## Security

Found a security issue? **Do not file a public issue.** Email
[katana.have.drip@gmail.com](mailto:katana.have.drip@gmail.com). See
[SECURITY.md](./SECURITY.md) for the full policy.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

Tessera is built on top of an enormous amount of open-source work. The
non-obvious dependencies that made this project possible:

- [iron-session](https://github.com/vvo/iron-session) for stateless session
  encryption.
- [Prisma](https://prisma.io) for the ORM and migrations.
- [dnd-kit](https://dndkit.com) for the kanban drag-and-drop.
- [Next.js](https://nextjs.org) for, well, everything.
- [react-markdown](https://github.com/remarkjs/react-markdown) +
  [remark-gfm](https://github.com/remarkjs/remark-gfm) +
  [rehype-highlight](https://github.com/rehypejs/rehype-highlight) for the
  notes rendering.
- [Zod](https://zod.dev) for request validation.
- [TanStack Query](https://tanstack.com/query) for client-side data
  fetching.

And [MinIO](https://min.io) for making self-hostable S3 trivial.
