---
target: "http://localhost:3000/dashboard"
total_score: 25
p0_count: 1
p1_count: 2
timestamp: 2026-06-11T21-57-13Z
slug: localhost-dashboard
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast notifications work; loading states exist. Console shows unhandled 400s when no team is selected. Missing progress for multi-step flows. |
| 2 | Match System / Real World | 3 | "Username or email" label is clear. "Taskboard" is slightly non-standard vs "Board". Nav labels follow conventions. |
| 3 | User Control and Freedom | 3 | Logout, sidebar collapse, back navigation work. No undo on delete visible. No cancel on simple forms (acceptable). |
| 4 | Consistency and Standards | 3 | Card radius, button shapes, and spacing are consistent across pages. Minor padding differences between dashboard and settings. |
| 5 | Error Prevention | 2 | Login has rate limiting. No confirmation dialogs for destructive actions tested. No smart defaults on empty forms. |
| 6 | Recognition Rather Than Recall | 3 | Sidebar labels are clear when expanded. Collapsed sidebar is icon-only (requires memory / muscle learning). |
| 7 | Flexibility and Efficiency | 2 | Dashboard shows `Cmd+N` shortcut in tiny text. No bulk actions, no keyboard nav for sidebar, no power-user paths. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained palette, flat surfaces, no clutter. Empty-state dashboard feels barren rather than intentionally minimal. |
| 9 | Error Recovery | 2 | 404 and global error pages exist with recovery buttons. Toast errors on API failure. No inline retry on failed cards. |
| 10 | Help and Documentation | 1 | Zero help, tooltips, onboarding, or documentation links. First-time admin sees empty dashboard with no guidance. |
| **Total** | | **25/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment**: The interface does NOT read as AI-generated. The restrained amber accent, flat card treatment, custom SVG logo, and charcoal dark palette all feel intentional and brand-consistent. The login page avoids the icon-in-a-box template after the recent fix. Typography has adequate contrast (30px heading vs 14px subtitle). No gradient text, no glassmorphism, no side-stripe borders, no numbered section markers.

**Deterministic scan**: Source scan returned zero findings. The `detect.mjs` CLI produced an empty array for `app/` and `components/`.

**Browser inspection**: No visual anti-patterns detected. The accent amber occupies well under 5% of any screen. Cards are flat. Focus rings use warm glow, not harsh outlines.

## Overall Impression

A calm, restrained admin tool that largely succeeds at its "Quiet Workshop" design goal. The visual system is cohesive and the color restraint is genuinely disciplined. The biggest gap is the first-run experience: a brand-new admin logs in to a wall of zeros with no guidance on what to do next. The product is well-dressed but poorly introduced.

## What's Working

1. **Color discipline**: The Whisper Rule is actually working. The amber accent appears only as micro-glow on focus rings and hover states. No large solid amber surfaces. Dark and light tokens are both first-class.

2. **Custom logo integration**: The four-tile tessera SVG replaces the generic "M" and Zap icons throughout. It reads as intentional identity, not a placeholder.

3. **Flat elevation philosophy**: Cards use tonal separation (bg → surface → elevated) rather than drop shadows. This is consistent across login, dashboard, settings, and error pages.

## Priority Issues

**[P0] No onboarding for first-run admin**
- **What**: A fresh admin with no teams, notes, or tasks sees a dashboard full of "0" counts and "No X yet" messages. There is no guidance on how to create a team, invite users, or understand the permission model.
- **Why it matters**: Self-hosters are often technical but not familiar with this specific product's workflow. Without a first-run guide, they may abandon before discovering the value.
- **Fix**: Add a contextual onboarding banner or empty-state CTA on the dashboard when `teams.length === 0`. Something like: "Create your first team to get started →" with a 2-sentence explanation.
- **Suggested command**: `$impeccable onboard dashboard`

**[P1] Unhandled API errors when no team is selected**
- **What**: The dashboard fires `GET /api/notes?teamId=`, `/api/tasks?teamId=`, and `/api/calendar?teamId=&start=...` with an empty `teamId`, causing 400 Bad Request errors in the console. The UI shows "0" counts but the backend is erroring.
- **Why it matters**: Console errors indicate broken state. The frontend should either skip the request when no team is selected, or the backend should handle empty `teamId` gracefully.
- **Fix**: Gate the `useQuery` hooks in `dashboard/page.tsx` behind `currentTeamId` truthiness. Don't fire team-scoped requests until a team exists.
- **Suggested command**: `$impeccable harden dashboard`

**[P1] Team selector shows "Select Team" when no teams exist**
- **What**: The top bar displays a "Select Team" dropdown that does nothing (no teams to select). It's visually prominent but functionally dead.
- **Why it matters**: It signals brokenness. New users see a control that looks interactive but isn't, creating confusion.
- **Fix**: Hide the team selector entirely when `teams.length === 0`. Replace it with a "Create Team" button or a contextual prompt.
- **Suggested command**: `$impeccable harden topbar`

**[P2] No help, tooltips, or documentation anywhere**
- **What**: Zero contextual help. The Roles page has a dense permission matrix with no explanation of what each permission does. The Audit page has filter controls with no labels. The Settings page has toggles with no explanations.
- **Why it matters**: Self-hosted tools often have a solo admin who must figure out the permission model alone. Without inline help, they'll either over-permiss or under-permiss.
- **Fix**: Add `title` attributes or small info icons with tooltips on permission checkboxes, filter controls, and ambiguous toggles. A single "Documentation" link in the sidebar footer would also help.
- **Suggested command**: `$impeccable clarify permissions`

**[P2] Keyboard shortcuts are invisible**
- **What**: The dashboard shows `Cmd+N New note` in tiny 10px text at the top right. Other shortcuts exist in code but aren't surfaced. No keyboard navigation for the sidebar.
- **Why it matters**: Power users (the primary audience for a self-hosted tool) expect keyboard efficiency. Hidden shortcuts are missed opportunities.
- **Fix**: Surface shortcuts more prominently in a keyboard-help modal (triggered by `?`). Add `aria-keyshortcuts` to interactive elements. Make sidebar items focusable with arrow-key navigation.
- **Suggested command**: `$impeccable harden keyboard`

## Persona Red Flags

**Alex (Power User)**
- No keyboard shortcut modal. The `Cmd+N` hint is microscopic and easy to miss.
- No bulk actions on the Users or Teams pages. Must click one-by-one.
- Sidebar requires mouse to collapse; no `Cmd+\` or similar toggle.
- The "New Note / New Task / New Event" quick actions are links, not hotkey-driven.

**Jordan (First-Timer)**
- Empty dashboard with no "what do I do now?" guidance. The "Create your first note" link is buried under a "No notes yet" paragraph.
- "Taskboard" label is slightly jargon-y; "Tasks" or "Board" would be more familiar.
- The Roles page permission matrix is a wall of checkboxes with no explanation of scope or consequence.
- No visible help or support channel. A self-hoster stuck on permissions has nowhere to turn.

**Sam (Accessibility-Dependent)**
- Sidebar icons in collapsed mode have `title` attributes (good) but no `aria-label` on the `<Link>` elements themselves. Screen readers may not announce the destination.
- Focus rings use `box-shadow` which may be invisible in Windows High Contrast mode. A `outline` fallback is needed.
- The team selector and notification dropdowns use `absolute` positioning inside scroll containers; may be clipped in zoomed views.

## Minor Observations

- The dashboard stats cards have a hover border that shifts to amber (`hover:border-primary/30`) — this is a solid, intentional use of the accent.
- The "No notes yet" and "No upcoming events" empty states use a dashed border card. This reads as temporary/decorative, which is appropriate.
- The settings page uses a different max-width (`max-w-md` vs the dashboard's `max-w-7xl`) — consistent internal form width, good.
- Mobile view (375px) shows the hamburger menu and stacks content cleanly. The stats grid becomes 2×2, which works.
- The toast notification styling now uses CSS variables instead of hardcoded HSL — good token discipline.

## Questions to Consider

- What if the first-run dashboard were a single "Set up your team" CTA instead of four empty stat cards?
- Does the permission matrix need to be visible to all admins, or could it be progressively disclosed behind an "Advanced" toggle?
- What would a "power user" version of the sidebar look like — pinned favorites, recent items, keyboard shortcuts?
