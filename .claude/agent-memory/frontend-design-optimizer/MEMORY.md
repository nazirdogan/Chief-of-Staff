# Frontend Design Optimizer — Agent Memory

## Project Structure
- Source under `src/` (not `app/` at root) — full path: `/Users/nazir/donna/src/`
- shadcn/ui base components: `src/components/ui/`
- Shared components: `src/components/shared/`
- Domain components: `src/components/briefing/`, `commitments/`, `people/`, `operations/`, `dashboard/`, `onboarding/`

## Current Brand: "The Editor"
Applied in session 3. All public-facing and interior pages use this palette.

### The Editor Token Reference
| Token | Value | Usage |
|---|---|---|
| Parchment | `#FAF9F6` | Page background |
| Linen | `#F1EDEA` | Sidebar, secondary surfaces, cards on parchment |
| Charcoal | `#2D2D2D` | Primary text |
| Slate | `#8D99AE` | Muted/secondary text |
| Dawn | `#E8845C` | Accent — CTAs, active nav, period in wordmark |
| Steel | `#457B9D` | Secondary accent (dusk) |
| White | `#FFFFFF` | Card surfaces on parchment bg |
| Borders | `rgba(45,45,45,0.08)` | Light mode borders |
| Border hover | `rgba(45,45,45,0.16)` | Hover state borders |

### The Editor Fonts
- Display: `var(--font-playfair), 'Playfair Display', Georgia, serif` — Playfair Display 700
- Body: `var(--font-dm-sans), 'DM Sans', system-ui, sans-serif`
- Mono: `var(--font-jetbrains-mono), 'JetBrains Mono', monospace`
- OLD names that are gone: `var(--font-cormorant)`, `var(--font-inter)` — do not use

### Donna Wordmark Pattern
`Donna<span style={{ color: '#E8845C' }}>.</span>` in Playfair Display 700 italic.
NOT lowercase "donna". NOT an SVG Meridian mark (that was the old brand).

### Dark Accent Sections (intentional, light-brand pages can still have these)
Landing page: Briefing preview section, Stats section, CTA/Waitlist section — use `#1C2B38` as bg.
GettingReadyScreen: parchment background, NOT dark.

## Theme Switching (added session 5)
- `next-themes` wired up: `ThemeProvider` at `src/components/providers/ThemeProvider.tsx`
- Root layout wraps children in `<ThemeProvider>` with `suppressHydrationWarning` on `<html>`
- `dashboard-shell.tsx` uses `lightT` / `darkT` module-level objects; picks via `resolvedTheme`
- Appearance settings page: `src/app/(dashboard)/settings/appearance/page.tsx`
- Dark palette: bg `#0E1225`, sidebar `#111728`, card surfaces `#1B1F3A`, text `#FBF7F4`
- Lint rule `react-hooks/set-state-in-effect` fires on bare `setMounted(true)` in useEffect —
  wrap with `requestAnimationFrame` to satisfy it: `const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id);`

## Color System Convention
Each component file defines a local `const c = { ... }` block (or `t`/`lightT`/`darkT`) with all color tokens.
This is the established pattern — do NOT move to global CSS variables or Tailwind tokens.

## Dark Mode CSS Variable System (session 6)
To make dark mode work across all main dashboard pages, the following CSS variables were added to `globals.css`.
See [dark-mode-variables.md](./dark-mode-variables.md) for the full migration guide.

New tokens: `--foreground-secondary`, `--foreground-tertiary`, `--foreground-quaternary`,
`--surface`, `--surface-hover`, `--surface-active` (in both `:root` and `.dark`).

Files migrated in session 6: today, inbox, calendar, people, reflections, tasks pages + BriefingItem,
ActionCard, ChatInput, TaskQueue, ContactCard components.

Settings pages (general, integrations, notifications, chat, privacy, security, data, autonomy, billing)
already used Tailwind semantic classes and required no changes.

## Tailwind Setup
Tailwind v4 — NO `tailwind.config.ts`. All design tokens live in `src/app/globals.css`.
`--background: #FAF9F6` (parchment), `--font-sans: var(--font-dm-sans)`, `--font-display: var(--font-playfair)`.

## Files Updated to The Editor Brand (session 3)
1. `src/app/page.tsx` — landing page (full brand overhaul, hero tagline: "Before you ask.")
2. `src/app/(auth)/layout.tsx` — auth shell, web panel now linen/parchment
3. `src/app/(auth)/login/page.tsx` — mobile wordmark, no SVG mark
4. `src/app/(auth)/signup/page.tsx` — same
5. `src/components/dashboard/dashboard-shell.tsx` — sidebar now linen, wordmark updated
6. `src/components/onboarding/OnboardingFlow.tsx` — Playfair heading, Dawn step indicators
7. `src/components/onboarding/desktop/WelcomeStep.tsx` — light bg, new headline
8. `src/app/(dashboard)/dashboard/page.tsx` — token block + Playfair fonts
9. `src/components/onboarding/desktop/GettingReadyScreen.tsx` — parchment bg, cleaned of grain/glows

## Routine Outputs on Today Page (added session 4)
- API: `src/app/api/routines/today/route.ts` — GET, 30/min rate limit
- Dashboard: accordion section using `ChevronUp`/`ChevronDown`, `renderMarkdown` fn

## Pre-existing lint failures (do not report as regressions)
Files with lint errors that predate this project: `demo-video/`, `im-donna-film/`, `reflections/page.tsx`, billing routes, `PauseBanner.tsx`, `text-shimmer.tsx`. These are NOT caused by frontend-design work.

## Files NOT Yet Updated to The Editor Brand
- `src/app/download/page.tsx` — Cormorant/Inter still used
- `src/app/(admin)/admin/page.tsx` — Cormorant/Inter still used

## Animation Utilities (globals.css)
`animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`, `animate-drawer-slide-up`, `.stagger-children`.

## Dashboard Shell Structure
- Sidebar: `fixed`, `w-[220px]`, `z-30`, linen bg (#F1EDEA), right border (rgba 45,45,45 0.08)
- Main: `ml-[220px]`, `max-w-[1200px]`, `px-8 py-8`
- FeedbackWidget floats as fixed overlay

## Gotcha: replace_all misses different indentation
`replace_all` on indented multi-line strings will silently skip blocks with different leading
whitespace. Always run a grep sanity check after bulk replacements to catch stragglers.

## TypeScript
`npm run typecheck` passes cleanly after color-only changes.
`npm run lint` also passes. Always run both before reporting done.
