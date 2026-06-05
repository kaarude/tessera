# Security policy

## Supported versions

Only the latest minor release receives security updates. Older versions
will not be patched.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security bugs.**

Email `security@tessera.app` (or, if you don't trust the email channel,
DM the maintainer via the GitHub account listed in the README). Include:

- A clear description of the issue
- Steps to reproduce
- Impact (what an attacker can do)
- Any known mitigations

You can expect an acknowledgement within 72 hours. We aim to ship a fix
within 14 days for high-severity issues, longer for lower-severity ones.

## Out-of-scope

The following are **not** security issues and should be filed as regular
bug reports:

- Rate-limit tuning (acceptable as-is for v1)
- Brute-force protection on the login endpoint (already covered by
  per-IP and per-email throttling in `lib/rate-limit.ts`)
- CSRF on the JSON API (defended by `sameSite=strict` on the session
  cookie)

## Hardening checklist for self-hosters

When you deploy Tessera yourself:

- [ ] Set a strong, random `SESSION_SECRET` (32+ bytes).
      The app will refuse to start if you use the example value.
- [ ] Use TLS in front of the app (Caddy, Traefik, or your CDN).
- [ ] Put the Postgres port behind a firewall — only the app needs to
      reach it.
- [ ] If you use the bundled MinIO, change the root credentials and put
      it behind the same auth proxy.
- [ ] Configure your reverse proxy to set only one trusted
      `x-forwarded-for` hop. The rate limiter and audit log trust
      whichever IP the proxy forwards.
- [ ] Rotate `SESSION_SECRET` periodically. Rotating it invalidates all
      active sessions, which is the desired behavior.
- [ ] Run `npm audit --omit=dev` regularly and apply security updates.
- [ ] Set up database backups. There is no built-in backup tool.
