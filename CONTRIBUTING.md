# Contributing to Tessera

Thanks for your interest in making Tessera better. This is a working
document — if something here is wrong, please open a PR fixing it.

## Quick start

```bash
git clone https://github.com/kaarude/tessera
cd tessera
npx --yes docker compose up -d db minio     # Postgres + MinIO for local dev
cp .env.example .env                         # then edit secrets
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open <http://localhost:3000> and log in with `admin@tessera.app` and the random password printed by `npm run seed`.

## Project layout

```
app/
  api/        # Route handlers. Every file should use lib/route.ts#withRoute.
  dashboard/  # Dashboard widgets
  notes/      # Markdown notes list + editor
  calendar/   # Calendar views
  tasks/      # Kanban taskboard
  teams/      # Team CRUD
  roles/      # Roles & permission editor
  audit/      # Audit log viewer
  users/      # Admin user management
  settings/   # Self-service profile / password
  login/      # Auth
components/   # Shared client components
lib/          # Server-side helpers (auth, permissions, S3, ...)
prisma/       # Schema, migrations, seed
scripts/      # One-off codemods (e.g. fix-fetch-pattern.mjs)
docs/         # Long-form docs
```

## Code style

- TypeScript everywhere; `any` is banned in `app/api/**` and `lib/**` (enforced
  by ESLint — see `eslint.config.mjs`). Client pages still tolerate `any`
  for legacy code; new code should be fully typed.
- Use Zod for request validation on every API route. See any route in
  `app/api/notes/` for the pattern.
- Wrap route handlers with `withRoute` from `lib/route.ts` to get auth +
  permission checks + error mapping for free.
- Tailwind for styling. Shared UI primitives live in `components/ui/`.
- Dark theme + orange accent is the default. Don't ship light theme without
  coordinating with the rest of the design system.
- Run `npm run lint && npm run typecheck` before opening a PR.

## Database / Prisma

- Schema is in `prisma/schema.prisma`. To change it, edit the schema and run
  `npx prisma migrate dev --name <short-description>`.
- All migrations must be backwards-compatible with the previous release
  (we don't yet do online migrations, so column renames need a two-step
  add-copy-drop).
- Don't edit existing migrations in `prisma/migrations/` once they've been
  shipped.

## Permissions

The full permission matrix lives in `lib/permissions.ts`. To add a new
permission:

1. Add the string to `ALL_PERMISSIONS` in `lib/permissions.ts`.
2. Use it via `await hasPermission(user.id, "your:new:perm", teamId)` in
   the relevant route.
3. Add a checkbox in `app/roles/page.tsx` so admins can grant it.

Run `npm run typecheck` — the routes enforce the permission at the type
level by the time you wire it in.

## Testing

- `npm test` runs the Vitest unit suite (`tests/unit/**`).
- `npm run test:e2e` runs the Playwright smoke test (`tests/e2e/**`).
  Requires a running dev server (the script starts one).
- New code should add at least one test. Endpoints with non-trivial
  permission logic especially need them.

## Security

Found a security issue? **Do not open a public issue.** See
[SECURITY.md](./SECURITY.md) for the disclosure policy.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) so
release-please can cut versions automatically. Examples:

- `feat(notes): add version history`
- `fix(api): require auth on calendar DELETE`
- `docs: document permission matrix`
- `chore: bump next to 16.3`

## Pull request process

1. Make sure CI is green.
2. Update the relevant docs in `docs/` or the README if the user-visible
   behavior changes.
3. Add a changeset (or get a reviewer to add one). `release-please` will
   pick it up.
4. A maintainer will review. PRs without tests for new behavior will
   likely be sent back for them.

## Community

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
Be patient with newcomers and uncharitable with bad faith.
