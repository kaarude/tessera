# Changelog

All notable changes to Tessera are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2025-06-06

### Security
- **Account-takeaway fix.** `POST /api/users/change-password` now requires
  either a current password (for self-service changes) or an authenticated
  admin session (for forced resets). Previously, any unauthenticated caller
  could set any user's password if they knew the `userId`.
- **Permission enforcement.** Every mutating API route now calls
  `requirePermission(...)` against the role-permission matrix. The full
  permission set defined in `lib/permissions.ts` is finally enforced; before,
  only the `isAdmin` boolean was checked.
- **Database-backed rate limiter.** Login attempts are now tracked in the
  new `LoginAttempt` table instead of an in-process `Map`. The old limiter
  was wiped on every serverless cold start and bypassable by header
  spoofing.
- **Note-share authorization.** The `DELETE /api/notes/[id]/share` handler
  now verifies the requester owns the parent note (or is an admin) before
  removing a share. Previously, any authenticated user could revoke any
  share by enumerating share IDs.
- **Upload ownership check.** `POST /api/upload` validates that the
  `noteId` in the body belongs to the caller, or omits the `noteId` to
  upload to a user-scoped prefix.
- **Hardened session secrets.** The app refuses to start if
  `SESSION_SECRET` is the example value or shorter than 32 characters.
- **Standardized error responses.** All routes return the
  `{ error: string }` shape; the raw exception message is no longer
  leaked to the client in production.

### Changed
- **Project rename to Tessera.** Cookie, S3 bucket, DB schema, seed
  emails, package name, and docs all reflect the new brand.
- **Smaller blast radius on data deletion.** Soft semantics for note
  and task deletion are now impossible — there is a single hard-delete
  path, audited end-to-end.
- **Zod validation on every API route.** Request bodies are parsed and
  validated by Zod schemas; bad input returns a 400 with details.
- **Client API helper.** `lib/api.ts` provides `apiGet`, `apiPost`,
  `apiPatch`, `apiDelete` that throw on non-2xx with the server-provided
  error message. Use this instead of raw `fetch`.

### Fixed
- Calendar day-view now constructs fresh `Date` instances instead of
  mutating React state. (Bug: `currentDate.setDate(...)` mutated the
  state object held by reference.)
- Calendar `datetime-local` form inputs use local time, not UTC, so the
  picker shows the time the user actually picked.
- Notes search no longer silently returns notes from every team when
  both `search` and `teamId` query parameters are present.
- `mustChangePassword` flow now logs the user in after a successful
  password change instead of leaving them on the login form.
- Login form redirects to the dashboard on success; the old behavior
  left a "Welcome back!" toast but didn't navigate.

### Added
- `app/error.tsx` and `app/not-found.tsx` for graceful failures.
- LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY files.
- GitHub Actions CI: lint, typecheck, build on every PR.
- Dependabot for `npm` updates.
- Docker / docker-compose for one-command self-hosting (Postgres + MinIO
  + app).
- Vitest + Playwright test scaffolding with a smoke test for the login
  → create note → share flow.
- `Dockerfile` with multi-stage build, non-root runtime user, and
  healthcheck.

## [0.1.0] — 2025-05-24

Initial private build.
