---
name: Tessera
description: Self-hostable team productivity platform — calm utility, barely-there warmth
colors:
  background: "#161514"
  foreground: "#f0eeeb"
  surface: "#1f1d1b"
  surface-elevated: "#272522"
  muted: "#34322f"
  muted-foreground: "#96938e"
  accent: "#bfa06e"
  accent-foreground: "#161514"
  border: "#34322f"
  destructive: "#b05c5c"
  success: "#7da87d"
  warning: "#c4a46a"
  light-background: "#f7f7f6"
  light-foreground: "#1c1b19"
  light-surface: "#ffffff"
  light-muted: "#e6e4e0"
  light-muted-foreground: "#6e6b66"
  light-border: "#e6e4e0"
  light-accent: "#bfa06e"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "rgba(191, 160, 110, 0.08)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Tessera

## 1. Overview

**Creative North Star: "The Quiet Workshop"**

Tessera is a tool people run on their own servers. The interface should feel like walking into a well-kept workshop: everything has a place, nothing shouts for attention, and the warmth comes from use, not decoration. The aesthetic is deliberately restrained because the user's work — their notes, their tasks, their team's calendar — is what deserves attention.

The visual system is built on a near-monochrome foundation. Warmth exists only as a whisper: a muted amber-orange that appears almost exclusively as ambient glow and micro-indicators. Solid fills of the accent are forbidden in all but the tiniest badges. This restraint makes the few warm moments feel earned rather than default.

**Key Characteristics:**
- Neutral-first: every surface begins as greyscale; warmth must be invited
- Flat by default: depth comes from tonal separation, not drop shadows
- Glow as language: the accent color speaks through `box-shadow`, not background-fill
- Calm density: comfortable spacing, generous whitespace, no visual shouting
- Earned familiarity: components behave predictably, consistently, and quietly

## 2. Colors

The palette is anchored in warm charcoal neutrals with a single muted amber-orange accent. Both dark and light modes are first-class citizens; neither is a dimmed inversion of the other.

### Primary
- **Muted Amber** (`#bfa06e` / oklch(70% 0.08 55)): The sole accent. Used exclusively for hover glows, focus halos, micro-indicators (2px dots, thin left-edge bars), and selection tints at very low opacity. Never as a solid button fill or large surface. In dark mode it reads as a warm candle-glow; in light mode it reads as a soft tan.

### Neutral (Dark Mode)
- **Deep Charcoal** (`#161514` / oklch(16% 0.008 45)): The root background. Near-black with a hair of warmth so it doesn't feel sterile.
- **Surface Charcoal** (`#1f1d1b` / oklch(21% 0.008 45)): Card and panel backgrounds. Slightly lifted from the root.
- **Elevated Charcoal** (`#272522` / oklch(26% 0.008 45)): Popovers, dialogs, and raised surfaces.
- **Warm White** (`#f0eeeb` / oklch(95% 0.005 50)): Primary text. Off-white with barely perceptible warmth.
- **Warm Grey** (`#96938e` / oklch(62% 0.012 50)): Secondary text, placeholders, icons at rest.
- **Border Grey** (`#34322f` / oklch(28% 0.01 50)): Dividers, input borders, subtle separators.

### Neutral (Light Mode)
- **Clean Off-White** (`#f7f7f6` / oklch(98% 0.002 80)): Root background. Not cream, not warm-tinted paper — a neutral, intentional near-white.
- **Pure White** (`#ffffff`): Cards and surfaces.
- **Near Black** (`#1c1b19` / oklch(20% 0.01 45)): Primary text. Slightly warm to avoid the harshness of pure #000.
- **Medium Grey** (`#6e6b66` / oklch(48% 0.01 55)): Secondary text.
- **Light Border** (`#e6e4e0` / oklch(90% 0.01 80)): Dividers and borders.

### Semantic
- **Destructive** (`#b05c5c`): Muted brick red. Errors, destructive actions. Kept desaturated so it doesn't compete with the accent.
- **Success** (`#7da87d`): Muted sage green. Success states, confirmations.
- **Warning** (`#c4a46a`): Muted gold. Warnings. Intentionally close to the accent hue so the palette stays tight.

### Named Rules
**The Whisper Rule.** The accent color (`#bfa06e`) may occupy no more than 5% of any viewport at rest. Its presence must be ambient — a glow, a faint tint, a tiny indicator — never a dominant solid. If a screen reads "orange" at a glance, the proportion is wrong.

**The Neutral Floor Rule.** Every surface starts neutral. Warmth must be invited by state (hover, focus, active) or by a deliberate design choice, never inherited from the base palette. No warm-tinted body backgrounds in either mode.

## 3. Typography

**Primary Font:** Inter (with system-ui fallback)

**Character:** A single-family system. Product UI doesn't need display/body pairing; Inter carries headings, body, labels, and data with clarity. The personality is neutral, legible, and quietly confident.

### Hierarchy
- **Display** (600, 2rem / 32px, line-height 1.2, -0.02em tracking): Page titles, hero headings. Max one per view.
- **Headline** (600, 1.5rem / 24px, line-height 1.3, -0.01em tracking): Section headers, card titles.
- **Title** (500, 1.125rem / 18px, line-height 1.4): Form labels, sub-headings, list titles.
- **Body** (400, 0.9375rem / 15px, line-height 1.6): Paragraphs, descriptions, notes content. Cap line length at 70ch.
- **Label** (500, 0.8125rem / 13px, line-height 1.4, +0.01em tracking): Badges, meta text, timestamps, small caps. Uppercase only when semantically appropriate (e.g., column headers), never as decorative scaffolding.

### Named Rules
**The One Family Rule.** Do not introduce a second font family. The tool should disappear into the task, and type contrast draws attention that belongs to the content.

## 4. Elevation

The system is flat by default. Depth is conveyed through tonal separation (background → surface → elevated surface), not through shadow.

### Shadow Vocabulary
- **None** (default): Cards, panels, and containers sit flat. No shadow at rest.
- **Ambient Hover** (`0 2px 8px rgba(0, 0, 0, 0.06)`): Optional, sparingly used on interactive cards when hovered. Extremely subtle.
- **Warm Glow** (`0 0 16px rgba(191, 160, 110, 0.10), 0 0 4px rgba(191, 160, 110, 0.06)`): The primary elevation language. Applied to focused inputs, active nav items, and hovered primary buttons. This is how the accent manifests.
- **Focus Ring** (`0 0 0 3px rgba(191, 160, 110, 0.15)`): Keyboard focus. A warm halo, not a harsh outline.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, active). Do not pair a border with a soft wide shadow on the same element — pick one.

## 5. Components

### Buttons
- **Shape:** Medium rounded corners (10px). Pill shape reserved for tags/filters only.
- **Primary:** Surface-elevated background (`#272522` dark / `#ffffff` light), warm white/near-black text. Hover: warm glow + background shifts to muted amber (`#bfa06e`) with dark text. Transition 150ms.
- **Secondary:** Transparent background, subtle border. Hover: faint warm tint background (`rgba(191, 160, 110, 0.06)`).
- **Ghost:** Transparent, text only. Hover: same faint warm tint as secondary.
- **Disabled:** Muted-foreground text, no hover effect, cursor not-allowed.

### Cards / Containers
- **Corner Style:** 12px radius. No sharper, no rounder.
- **Background:** Surface color (`#1f1d1b` dark / `#ffffff` light).
- **Border:** 1px solid border-grey. Used to separate cards from same-toned backgrounds.
- **Shadow:** None at rest. Optional ambient hover on clickable cards.
- **Internal Padding:** 16px–24px depending on content density.

### Inputs / Fields
- **Style:** Surface background, 1px border-grey border, 10px radius.
- **Focus:** Border transitions to accent at low opacity, plus warm glow (`0 0 0 3px rgba(191, 160, 110, 0.15)`). Outline is never a harsh ring.
- **Placeholder:** Muted-foreground color. Must maintain 4.5:1 contrast.
- **Error:** Border shifts to destructive color; no additional decoration.

### Navigation
- **Sidebar nav:** Transparent background items. Active state: faint warm tint background (`rgba(191, 160, 110, 0.08)`) + a 2px warm left-edge indicator. Text stays foreground-colored; never bright orange.
- **Top bar:** Surface-elevated background, subtle bottom border. Fixed position with `backdrop-blur` at `md` strength.
- **Mobile overlay:** Full-screen dark overlay with sidebar sliding in from left.

### Chips / Tags
- **Style:** Small radius (6px), muted background, label-sized text. No borders.
- **Selected:** Faint warm tint background, no border color change.

## 6. Do's and Don'ts

### Do:
- **Do** use the accent exclusively as glow, micro-indicators, and faint tints. Solid fills are the exception, not the rule.
- **Do** keep both dark and light mode visually consistent in proportion — the accent whisper should be equally quiet in both.
- **Do** use tonal separation (bg → surface → elevated) to create hierarchy before reaching for shadows.
- **Do** maintain 4.5:1 minimum contrast for all body text and placeholders.
- **Do** respect `prefers-reduced-motion`. Transitions become instant; glow becomes solid state change.

### Don't:
- **Don't** use the accent as a large solid fill (buttons, hero backgrounds, card headers). The Whisper Rule prohibits this.
- **Don't** pair a 1px border with a soft wide shadow (`blur ≥ 16px`) on the same element. Pick one.
- **Don't** use border-radius larger than 16px on cards or sections. Full-pill is reserved for tags and filter chips.
- **Don't** use gradient text (`background-clip: text`). Decorative, never meaningful. Use weight or size for emphasis.
- **Don't** use side-stripe borders (thick colored `border-left` on cards, callouts, or alerts). Rewrite with background tints or leading icons.
- **Don't** use glassmorphism as a default. Blurs and glass cards are rare and purposeful, or nothing.
- **Don't** add tiny uppercase tracked eyebrows above every section. One named label system is voice; an eyebrow on every section is AI grammar.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding. Numbers earn their place only when order carries information the reader needs.
- **Don't** create a cyberpunk or neon aesthetic. No high-saturation blues, purples, or glow effects. No terminal-green-on-black.
- **Don't** ship a near-white warm-tinted background that reads as cream, sand, or parchment in light mode. The light background is intentionally neutral.
- **Don't** use display fonts in UI labels, buttons, or data. Inter carries everything.
- **Don't** animate layout properties (width, height, top, left). Use transform and opacity only.
