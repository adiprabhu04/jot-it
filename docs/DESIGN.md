# Jot It Design System

> **Design is not decoration. Design is how Jot It thinks.**

------------------------------------------------------------------------

# Design Philosophy

Jot It should feel calm, intelligent, and effortless.

The interface exists to remove friction between a user's thoughts and
their knowledge. Every interaction should feel intentional. Nothing
should compete for attention unless it genuinely helps the user.

Our goal is not to build the most feature-rich notes application. Our
goal is to build the most enjoyable and intuitive place to think.

------------------------------------------------------------------------

# Brand Personality

Jot It should always feel:

-   Minimal
-   Intelligent
-   Calm
-   Premium
-   Modern
-   Fast
-   Trustworthy
-   Human

It should never feel:

-   Overwhelming
-   Gimmicky
-   Corporate
-   Noisy
-   Over-animated
-   Cluttered

------------------------------------------------------------------------

# Core Design Principles

## Clarity Over Complexity

Every screen should answer one question:

> "What should the user do next?"

If that answer isn't obvious, simplify the interface.

------------------------------------------------------------------------

## Motion Has Purpose

Animation should communicate state, hierarchy, or feedback.

Never animate simply because something can move.

------------------------------------------------------------------------

## AI Should Feel Invisible

AI is an assistant, not the main character.

Suggestions should appear naturally without interrupting the user's
workflow.

------------------------------------------------------------------------

## Reduce Cognitive Load

Users shouldn't think about the interface.

They should think about their ideas.

------------------------------------------------------------------------

## Consistency Creates Confidence

Components should behave the same everywhere.

Predictability builds trust.

------------------------------------------------------------------------

# Visual Language

The interface should communicate sophistication through restraint.

Design characteristics:

-   Dark-first interface
-   Large whitespace
-   Soft gradients
-   Thin borders
-   Rounded corners
-   Subtle shadows
-   Clean layouts
-   Premium feel

Avoid visual noise.

------------------------------------------------------------------------

# Color System

## Background

Near-black rather than pure black.

## Surface

Slightly elevated using subtle contrast.

## Accent

A single primary accent color for actions and highlights.

## Semantic Colors

-   Success
-   Warning
-   Error
-   Information

Keep these muted rather than saturated.

------------------------------------------------------------------------

# Typography

Typography should be readable before it is expressive.

## Headings

-   Large
-   Bold
-   Confident

## Body

-   Comfortable line spacing
-   Medium weight
-   Highly readable

## Buttons

-   Medium weight
-   Sentence case
-   Never ALL CAPS

## Code

Use a monospaced font.

------------------------------------------------------------------------

# Layout

Every page should follow the same spacing rhythm.

Guidelines:

-   Consistent margins
-   Consistent card spacing
-   Predictable hierarchy
-   Responsive layouts
-   Plenty of breathing room

------------------------------------------------------------------------

# Components

Every component should have one clear purpose.

Components include:

-   Navigation
-   Buttons
-   Cards
-   Inputs
-   Modals
-   Tooltips
-   Dropdowns
-   Command Palette
-   Search
-   AI Panel

Never create multiple visual styles for the same component unless there
is a strong reason.

------------------------------------------------------------------------

# Motion

Motion should feel smooth and subtle.

General principles:

-   Fast interactions
-   Ease-out transitions
-   No exaggerated bouncing
-   No unnecessary delays

Animations should reinforce understanding.

Examples:

-   Cards gently elevate on hover.
-   Pages fade and slide naturally.
-   AI responses feel alive without being distracting.
-   Loading indicators remain calm and minimal.

------------------------------------------------------------------------

# AI Experience

The AI should feel like a thoughtful assistant.

It should:

-   Suggest instead of interrupt.
-   Explain instead of overwhelm.
-   Stay out of the way until needed.
-   Respect the user's flow.

The user should always remain in control.

------------------------------------------------------------------------

# Empty States

Empty screens should encourage action.

Examples:

Instead of:

"No notes found."

Prefer:

"Ready to capture your next idea?"

Instead of:

"Nothing here."

Prefer:

"Your workspace is waiting."

------------------------------------------------------------------------

# Accessibility

Accessibility is part of good design.

Requirements:

-   Keyboard-friendly navigation
-   High contrast
-   Readable typography
-   Reduced-motion support
-   Visible focus states
-   Responsive layouts

------------------------------------------------------------------------

# Things We Will Never Do

-   Add AI pop-ups that interrupt users.
-   Use motion without purpose.
-   Overload screens with controls.
-   Sacrifice performance for visual effects.
-   Hide essential functionality behind AI.
-   Add features that increase complexity without clear value.

------------------------------------------------------------------------

# Future Direction

As Jot It evolves, every new feature should answer at least one of these
questions:

-   Does this make capturing knowledge easier?
-   Does this help users understand information better?
-   Does this reduce effort?
-   Does this make the experience feel calmer?
-   Would we use this ourselves every day?

If the answer is "no," rethink the feature before building it.

------------------------------------------------------------------------

# Final Principle

> **Capture less. Remember more.**

Every design decision should move Jot It closer to becoming a workspace
that helps people think, not just store information.

------------------------------------------------------------------------
------------------------------------------------------------------------

# Design System — Reference Specification

> The sections above define the **philosophy**. The sections below
> define the **system**: exact tokens, component specs, and behavior an
> AI agent or developer can build from without guessing. Where a value
> exists in code today, it is documented as-is; where a component is
> planned for V2 it is marked **(Planned — V2)**.

**Status legend:** ✅ Implemented (v1) · 🔭 Planned (V2). See
[ROADMAP.md](./Roadmap.md) for sequencing and [ARCHITECTURE.md](./Architecture.md)
for how the UI connects to services.

------------------------------------------------------------------------

## Design Tokens

These are the canonical CSS custom properties. They are the single
source of truth for color, radius, elevation, and layout metrics. The
current implementation defines them in `frontend/index.html`; the V2
frontend modularization (see [ARCHITECTURE.md](./Architecture.md)) will
move them into a dedicated `tokens.css` **without changing the values**.

### Color — Dark (default)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0A0A0F` | App background (near-black, never pure black) |
| `--surface` | `#111118` | Primary elevated surface (cards, panels) |
| `--surface-2` | `#18181F` | Higher elevation (hover, nested surfaces) |
| `--border` | `#252530` | Default hairline border |
| `--border-light` | `#2E2E3A` | Emphasized border |
| `--text` | `#F0F0F5` | Primary text |
| `--text-secondary` | `#8888A0` | Secondary / supporting text |
| `--text-tertiary` | `#55556A` | Disabled / faint text |
| `--accent` | `#5B6EF5` | Single primary accent (actions, highlights) |
| `--accent-hover` | `#4A5DE4` | Accent hover/pressed |
| `--cyan` | `#06B6D4` | Secondary decorative accent (used sparingly) |
| `--purple` | `#A855F7` | Secondary decorative accent (used sparingly) |

### Color — Light

| Token | Value |
|-------|-------|
| `--bg` | `#F0F0F5` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#F5F5FA` |
| `--border` | `#E0E0EA` |
| `--text` | `#0A0A14` |
| `--text-secondary` | `#555565` |
| `--text-tertiary` | `#8888A0` |

The accent stays `#5B6EF5` across themes. Light mode is a full first-class
theme, not an afterthought — every component must be verified in both.

### Semantic colors

| Token | Value | Meaning |
|-------|-------|---------|
| `--success` | `#22C55E` | Success / confirmation |
| `--warning` | `#F59E0B` | Warning / caution |
| `--error` | `#EF4444` | Error / destructive |
| `--info` | `#3B82F6` | Information / neutral notice |

Keep semantic colors **muted in use** — apply them to icons, borders,
and small fills, not large saturated backgrounds.

### Spacing system

Jot It uses a **4px base grid**. All margins, padding, and gaps are
multiples of 4px. Canonical steps:

| Step | Value |
|------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `2xl` | 32px |
| `3xl` | 48px |

Layout metrics: `--nav-h: 70px` (mobile bottom nav), `--header-h: 70px`
(top header). Base font size is `15px`; body `line-height: 1.5`.

### Border radius system

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Inputs, small buttons, chips, toasts |
| `--radius-md` | `12px` | Cards, dropdowns, context menus |
| `--radius-lg` | `16px` | Modals, large panels, auth card |
| `--radius-xl` | `20px` | Hero / feature surfaces |
| pill | `999px` | Tags, filter chips, avatars |

### Elevation system

Elevation is expressed through shadow, not heavy borders. Higher
elevation = softer, larger shadow. Dark mode shadows are deeper; light
mode shadows are subtle.

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | `0 1px 3px rgba(0,0,0,0.06)` | Resting cards |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.4)` | `0 2px 8px rgba(0,0,0,0.08)` | Hover, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, popovers |
| `--shadow-fab` | `0 4px 16px rgba(91,110,245,0.4)` | `0 4px 16px rgba(91,110,245,0.3)` | Floating action button (accent glow) |

Elevation ladder (low → high): background → surface → surface-2 →
`shadow-sm` cards → `shadow-md` menus → `shadow-lg` modals → toasts →
command palette.

### Typography

- **Family:** `Inter`, with `-apple-system, "SF Pro Display", "Segoe UI",
  Roboto` fallbacks. Monospace for code and OCR raw text.
- **Scale (recommended):** display 32/40, h1 24/32, h2 20/28, h3 16/24,
  body 15/22 (base), small 13/20, caption 12/16.
- **Weights:** 400 body, 500 medium (buttons, labels), 600 semibold
  (headings), 700 bold (display).
- **Rules:** headings are confident but never shouty; buttons use
  sentence case, never ALL CAPS; body favors readability over
  expression.

### Motion & animation timing

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Micro (button/toolbar state) | 120–150ms | `ease` |
| Standard (hover, fade, small transforms) | 150–200ms | `ease-out` |
| Entrance (cards, panels rising) | 300–400ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Modal / page transition | 400–600ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

Principles: ease-out for entrances, no exaggerated bounce, no gratuitous
delays. Every animation must communicate state, hierarchy, or feedback.
All motion must be disabled under `prefers-reduced-motion`.

### Iconography

- **Library:** Font Awesome 6 (current implementation). Line/regular
  weight preferred for a calm, modern feel.
- **Sizing:** 16px inline, 20px in buttons/nav, 24px for primary actions.
- **Color:** inherit `currentColor`; use semantic colors only to convey
  status.
- Icons support labels; they never replace them for primary actions.

### Illustrations

- Minimal, geometric, monochrome-leaning; accent color used sparingly.
- Reserved for empty states, onboarding, and error states — never
  decorative filler.
- Must render acceptably in both themes; avoid photographic or
  "floating astronaut" clichés (see project design constraints).

------------------------------------------------------------------------

## Layout Systems

### Desktop (≥1024px) ✅

- Persistent left **sidebar** + main content region + optional right
  panel (AI Chat / details, Planned V2).
- Content max-width for readability; generous margins.
- Notes render as a responsive card grid.

### Tablet (768–1023px) ✅

- Sidebar collapses to an icon rail or a toggle-driven drawer.
- Card grid reduces column count; touch targets grow to ≥44px.

### Mobile (<768px) ✅

- Bottom navigation (`--nav-h: 70px`), top header (`--header-h: 70px`).
- Single-column card list; floating action button (FAB) for capture.
- Full-screen modals and sheets; native-feeling gestures (swipe, pull-to-refresh).
- Respect safe-area insets (`env(safe-area-inset-*)`).

Responsiveness is a requirement, not a nicety (see
[SRS.md](./SRS.md) NFR-3).

------------------------------------------------------------------------

## Component Specifications

Each component lists its purpose, anatomy, states, and behavior. One
component = one clear purpose; never create multiple visual styles for
the same component without strong reason.

### Sidebar ✅

- **Purpose:** primary navigation and workspace context.
- **Anatomy:** brand/logo, primary nav items (Notes, Search, Scan),
  category/filter list, user menu at the bottom. **(Planned — V2:**
  Folders/Collections tree, AI Chat entry 🔭).
- **States:** default, hover (item background → `--surface-2`), active
  (accent text + subtle accent-tinted background), collapsed (icons only).
- **Behavior:** collapsible on desktop/tablet; becomes a drawer or bottom
  nav on mobile. Selection is always visibly indicated.

### Dashboard ✅

- **Purpose:** the notes workspace — capture entry points + note grid.
- **Anatomy:** header (title, search toggle, view controls), capture
  actions (new note, scan), pinned section, note card grid, empty state.
- **Behavior:** pinned notes sort first, then most-recently-updated
  (mirrors the backend ordering). Skeleton loaders on first load.

### Navigation ✅

- Desktop: sidebar. Mobile: bottom nav bar (70px). Command palette
  (`Cmd/Ctrl+K`) is a navigation accelerator on all platforms.
- Current location is always unambiguous.

### Cards ✅

- **Radius:** `--radius-md` (12px). **Elevation:** `--shadow-sm` resting,
  `--shadow-md` on hover with a gentle lift (`translateY(-2px)`).
- **Anatomy:** color strip/label, title, content preview, tags,
  timestamp (relative), pin indicator, quick actions (menu / long-press).
- **States:** default, hover, pinned, dragging (reorder), selected.
- Content is truncated with a clear preview; never overflow.

### Inputs ✅

- **Radius:** `--radius-sm`. Border `--border`; focus → accent border +
  subtle accent ring. Placeholder in `--text-tertiary`.
- Comfortable padding (≥12px), 15px text, visible focus state (required
  for accessibility). Clear affordance for clearing/searching where
  relevant.

### Buttons ✅

- **Variants:** primary (accent fill, white text), secondary (surface +
  border), ghost (text only), destructive (error color, used sparingly).
- **Radius:** `--radius-sm`. Height ≥40px desktop, ≥44px touch.
- Sentence case, medium weight, icon+label. Loading state swaps content
  for an inline spinner and disables the button (existing
  `setButtonLoading` pattern). Disabled = 50% opacity.

### Modals ✅

- **Radius:** `--radius-lg` (16px). **Elevation:** `--shadow-lg`, over a
  dimmed backdrop. Entrance rises + fades (300–400ms, standard easing).
- Focus is trapped; `Esc` closes; backdrop click closes (unless
  unsaved-changes guard). Full-screen on mobile.
- One primary action, clearly emphasized.

### Context menus ✅

- **Radius:** `--radius-md`. **Elevation:** `--shadow-md`.
- Triggered by right-click (desktop) or long-press (mobile → quick
  actions sheet). Items: Edit, Duplicate, Pin, Delete (destructive last,
  in error color). Keyboard navigable.

### Command palette ✅

- **Purpose:** keyboard-first access to actions and navigation.
- **Trigger:** `Cmd/Ctrl+K`. Highest elevation; centered overlay.
- **Anatomy:** search input, grouped command list, keyboard hints.
- **Behavior:** fuzzy filter, arrow-key navigation, `Enter` executes,
  `Esc` closes. **(Planned — V2:** surface semantic search results and
  AI actions inside the palette 🔭.)

### Search UI ✅ / 🔭

- **Today (v1):** keyword search over title/content; instant client-side
  filtering plus server search.
- **Planned (V2):** **semantic search** — a unified search surface that
  returns meaning-ranked results with snippets and a "Related notes"
  affordance, powered by the embedding pipeline (see [AI.md](./AI.md)).
  Search suggestions appear as the user types.
- Empty query shows recent/pinned; no-results uses an encouraging empty
  state, never a dead end.

### AI Chat panel 🔭 (Planned — V2)

- **Purpose:** conversational Q&A grounded strictly in the user's notes
  (RAG). Never an open-domain chatbot (see [VISION.md](./VISION.md) Non
  Goals).
- **Placement:** right-side panel on desktop/tablet; full-screen sheet on
  mobile. Non-blocking — the workspace stays usable.
- **Anatomy:** message thread (user + assistant), streaming assistant
  responses, **source citations** linking back to the notes used,
  input box, suggested prompts.
- **Behavior:** responses **stream** token-by-token; every answer shows
  its grounding sources; when no relevant notes exist the assistant says
  so rather than hallucinating (see [AI.md](./AI.md) hallucination
  prevention). AI suggests, never interrupts.

### OCR workflow ✅

- **Purpose:** turn handwriting/images into editable text.
- **Steps:** (1) capture — draw on canvas, upload, or use camera;
  (2) processing — calm loading indicator while the AI service runs;
  (3) review — extracted text with **per-word confidence pills**
  (color-coded), inline editing of low-confidence words; (4) save as
  note or feedback (accurate / corrected).
- **States:** capturing, uploading, processing, review, error, empty.
- Confidence pills use muted semantic colors; editing a word updates the
  full text. Feedback feeds OCR accuracy stats.

------------------------------------------------------------------------

## System States

### Empty states ✅

Empty screens encourage action, never dead-end. Prefer voice-driven copy
(see philosophy above): "Ready to capture your next idea?" over "No
notes found." Pair a minimal illustration with a single clear CTA.

### Error states ✅

- **Inline errors** (forms): concise, specific, in `--error`, next to the
  field; never blame the user.
- **Blocking errors** (failed load): friendly message + retry action.
- **Service errors** (OCR/AI unavailable): reassure and offer retry;
  degrade gracefully (e.g., summary/OCR fallbacks — see [AI.md](./AI.md)).
- Never expose stack traces or raw status codes to users.

### Loading states ✅

- **Skeleton loaders** for content whose shape is known (note grid on
  first load): animated placeholder blocks matching final layout, calm
  shimmer, no spinners for full-page content.
- **Inline spinners** for button actions (`setButtonLoading`).
- **Progress feedback** for OCR/AI (calm, minimal — never a jarring
  full-screen block).

### Toast notifications ✅

- **Radius:** `--radius-sm`. **Elevation:** above modals. Positioned
  consistently (bottom on mobile, corner on desktop).
- **Types:** success, error, info (muted semantic colors + icon).
- Auto-dismiss (~3–4s) with manual dismiss; never stack more than a few;
  never use for critical, action-required messaging.

### Skeleton loaders ✅

Covered above — match the final component's geometry (card grid), use
theme-aware placeholder color between `--surface` and `--surface-2`,
animate subtly, and disable animation under reduced-motion.

------------------------------------------------------------------------

## Accessibility (system-level)

Reiterating the requirements above as build criteria: keyboard-navigable
everywhere (including command palette, modals, menus), visible focus
states on all interactive elements, WCAG-AA contrast in both themes,
respect for `prefers-reduced-motion`, and touch targets ≥44px on mobile.
Accessibility is part of "done," not a later pass (see
[SRS.md](./SRS.md) NFR-4).

------------------------------------------------------------------------

## How to use this document

- **Building UI?** Start from the tokens, then the component spec, then
  the relevant system-state section. Do not introduce new colors, radii,
  or shadows outside the token set.
- **Adding a V2 feature?** Confirm it is not a Non Goal
  ([VISION.md](./VISION.md)), find its component spec here, and cross-check
  the data/API contract in [DATABASE.md](./Database.md) and
  [API.md](./API.md).
- **Unsure about motion or spacing?** Defaults live in the token tables
  above; when in doubt, choose the calmer, more restrained option.
