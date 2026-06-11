# Product

## Register

product

## Users

Self-hosting teams, developers, and small-to-medium organisations that refuse SaaS lock-in. They run their own infrastructure, value data sovereignty, and want a tool that works without phoning home. Typical context: setting up via `docker compose up`, managing notes, tasks, and calendars for a team of 2–200.

## Product Purpose

Tessera is a self-hostable, multi-tenant team productivity platform. It combines private markdown notes, a real calendar, drag-and-drop kanban, custom roles and permissions, and full audit logs. Success means a team can `docker compose up` and have a polished, private alternative to Notion, Trello, and Google Calendar that they fully control.

## Brand Personality

**Chill, Easy, Reliable.**

Voice is calm and helpful, never demanding or alarmist. Confidence comes from simplicity, not noise. The interface should feel like a tool that has been quietly refined over time—not one shouting for attention.

## Anti-references

- **Cyberpunk / neon dashboards:** High-saturation blues, purples, glow effects, terminal-green-on-black. Tessera is infrastructure, not a sci-fi film.
- **Ultra-high-contrast “AI-generated” UIs:** Harsh whites, aggressive shadows, oversaturated gradients, and visual noise that feels algorithmic rather than designed.
- **Corporate enterprise grey:** Soulless, dense, overwhelming interfaces that bury humanity under data density.
- **Bland Bootstrap defaults:** Uncommitted styling that feels temporary.

## Design Principles

1. **Calm first** — Interfaces reduce cognitive load, not add to it. Information density is intentional, never accidental.
2. **Self-hosted dignity** — The UI should be polished enough that teams are proud to run it, not apologetic. It competes with SaaS polish on its own terms.
3. **Progressive disclosure** — Complex features (RBAC, audit logs) are powerful but never intimidating. Complexity is available; it is never forced.
4. **Mode respect** — Dark and light are both first-class citizens. Neither is an afterthought or a dimmed version of the other.
5. **Markdown honesty** — The notes feature celebrates plain text. The UI does not try to “upgrade” markdown into something richer.

## Accessibility & Inclusion

- Target **WCAG 2.2 AA** as the baseline.
- Respect `prefers-reduced-motion`. Animations must enhance; they must never gate functionality.
- Maintain sufficient colour contrast in both dark and light themes.
- Ensure full keyboard navigability for power users and headless environments.
- Design for colour independence: critical states must not rely on colour alone.
