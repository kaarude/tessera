---
target: app/dashboard/page.tsx
total_score: 28
p0_count: 0
p1_count: 3
timestamp: 2026-06-11T22-34-41Z
slug: app-dashboard-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading and toast feedback exist, but dashboard data appears as zero before queries resolve. |
| 2 | Match System / Real World | 3 | Familiar productivity patterns; “New Note/Task/Event” links do not directly create the named object. |
| 3 | User Control and Freedom | 3 | Sidebar and dismissible notifications are solid; contextual menus and overlays have uneven escape behavior. |
| 4 | Consistency and Standards | 3 | Shared shell is coherent, but primary buttons alternate between amber, secondary gray, and bordered treatments. |
| 5 | Error Prevention | 3 | Password validation and disabled submits help; destructive/admin flows need stronger confirmation and context. |
| 6 | Recognition Rather Than Recall | 3 | Navigation is clear, but collapsed navigation relies on browser title tooltips and shortcut discovery is peripheral. |
| 7 | Flexibility and Efficiency | 3 | Keyboard shortcuts and drag-and-drop support power users; platform-specific “Cmd” copy excludes Windows/Linux cues. |
| 8 | Aesthetic and Minimalist Design | 3 | Calm, restrained foundation; excessive empty space and repeated outlined containers weaken hierarchy. |
| 9 | Error Recovery | 2 | Toasts report failures, but recovery guidance is usually generic or absent. |
| 10 | Help and Documentation | 2 | A first-team docs link exists, but most empty and high-stakes states provide little embedded guidance. |
| **Total** | | **28/40** | **Good foundation, meaningful usability gaps** |

## Anti-Patterns Verdict

**LLM assessment:** The interface does not immediately look AI-generated. Its restrained palette, conventional app shell, modest radii, and flat surfaces are credible product choices. The weaker tell is generic product scaffolding: four metric cards, three equal quick actions, and large dashed empty-state boxes. These are familiar but not yet tailored to Tessera’s actual workflow.

**Deterministic scan:** Clean. The detector returned zero findings across `app` and `components`. It did not flag gradient text, over-rounding, decorative eyebrows, ghost cards, or other banned patterns.

**Visual overlays:** No reliable overlay is available because the in-app browser runtime was unavailable. Existing repository screenshots and source inspection were used as fallback evidence.

## Overall Impression

Tessera already feels calm, legible, and trustworthy. The biggest opportunity is to make empty and first-run screens actively teach the product instead of presenting polished but inert containers.

## What’s Working

- The shared navigation shell is visually stable and easy to scan. Active state, spacing, icon treatment, and tonal separation support orientation without noise.
- Typography and color mostly fit the “Quiet Workshop” direction. The UI stays readable and restrained, with no gratuitous display styling.
- Accessibility intent is visible in skip navigation, focus treatment, reduced-motion support, labels, keyboard navigation, and semantic status feedback.

## Priority Issues

### [P1] Empty states do not establish a usable first-run path

**Why it matters:** The dashboard shows four zero metrics, three quick actions, and two empty panels simultaneously. The taskboard shows “No taskboard found” while still offering “New Task,” an action that cannot succeed without a board. First-time users must infer setup order.

**Fix:** Replace the zero-state dashboard with one guided setup sequence: create/select team, create first workspace object, invite collaborators. On the taskboard, make board creation the sole primary action until a board exists. Suppress redundant zero metrics and quick actions until they are meaningful.

**Suggested command:** `$impeccable onboard`

### [P1] Action labels promise creation but often only navigate

**Why it matters:** “New Note,” “New Task,” and “New Event” read as direct actions. Navigating to a section adds an unexpected step and weakens trust in the interface vocabulary.

**Fix:** Either open the creation surface directly, or relabel these links “Open Notes,” “Open Taskboard,” and “Open Calendar.” Use one direct primary action per page and make its outcome predictable.

**Suggested command:** `$impeccable clarify`

### [P1] Primary-action styling is inconsistent and overuses the accent

**Why it matters:** Users cannot reliably identify the primary action when amber-filled buttons, gray-filled buttons, and bordered buttons all serve that role. Solid amber buttons on Tasks, Users, and Settings also conflict with the design system’s Whisper Rule.

**Fix:** Standardize a neutral elevated primary button across screens, reserving amber for focus, hover glow, selection tint, and micro-indicators. Document and apply primary, secondary, ghost, and destructive variants.

**Suggested command:** `$impeccable extract`

### [P2] System status is briefly misleading during data fetches

**Why it matters:** Dashboard values derive from undefined data as zero, so users can see an apparently empty workspace before requests finish. This is especially damaging for a self-hosted product where users may already suspect configuration or connectivity problems.

**Fix:** Add compact skeletons or preserve the previous values while fetching. Distinguish empty, loading, error, and disconnected states. Replace generic “Failed” errors with actionable recovery copy.

**Suggested command:** `$impeccable harden`

### [P2] Dense product functionality is visually under-explained

**Why it matters:** Teams, roles, audit logs, and taskboards are powerful but receive nearly identical visual weight. New users get navigation labels without enough explanation of relationships, permissions, or consequences.

**Fix:** Add concise contextual descriptions on complex admin pages, clearer destructive-action consequences, and embedded help at decision points. Keep this inline rather than defaulting to modals.

**Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Jordan, first-time self-hoster:** After login, Jordan sees multiple zeros and equally weighted actions but no clear setup order. “New Task” is offered before a taskboard exists. They may interpret this as incomplete seeding or a broken installation.

**Alex, keyboard-focused power user:** Alex benefits from shortcuts and sidebar arrow navigation, but the dashboard advertises `Cmd` specifically and collapsed navigation uses delayed native title tooltips. Windows/Linux users and keyboard users receive weaker shortcut and label discovery.

**Morgan, team administrator:** Morgan can create users and grant admin privileges in the same inline form, but the privilege impact is barely explained. Generic toast errors do not explain how to recover from permission, password, or server failures.

## Minor Observations

- Dashboard quick actions repeat destinations already visible in the sidebar and nearby “View all” links.
- The top bar has low information value when no team exists, while still consuming fixed vertical space.
- “Team productivity platform” on login is generic; self-hosted/private positioning would better establish product identity.
- Uppercase tracked table headers are semantically defensible, but the uppercase “Notifications” dropdown label feels more decorative.
- The global custom scrollbar conflicts with the product register’s preference for standard affordances.

## Questions to Consider

- Should the dashboard be a status overview for established teams, or a setup guide for empty installations? It currently tries to be both.
- What is the one action a user should take immediately after first login?
- Can every “New…” control create the object without an intermediate navigation step?
- Which actions truly deserve amber, if the accent is meant to remain a whisper?
