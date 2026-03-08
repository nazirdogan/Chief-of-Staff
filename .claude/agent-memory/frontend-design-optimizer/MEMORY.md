# Frontend Design Optimizer — Agent Memory

## Project Structure
- Source under `src/` (not root-level)
- shadcn/ui base components: `src/components/ui/`
- Shared components: `src/components/shared/`
- Page-level components organized by domain: `briefing/`, `commitments/`, `people/`, `operations/`

## Color System Convention
Each component file defines a local `const c = { ... }` block with all color tokens.
This is the established pattern — do NOT move to global CSS variables or Tailwind tokens.

## Dark Theme Token Map (applied session 1)
All 11 shared component files have been converted to dark theme. The canonical mapping:

| Light | Dark |
|---|---|
| `'#FFFFFF'` (surface) | `'rgba(255,255,255,0.04)'` |
| `'#FAFAF8'` (bg) | `'#0A0A0B'` |
| `'rgba(120,110,80,0.1)'` (border) | `'rgba(255,255,255,0.07)'` |
| `'rgba(120,110,80,0.22)'` (borderHover) | `'rgba(255,255,255,0.14)'` |
| `'#8C7A4A'` (brass) | `'#A89968'` |
| `'rgba(140,122,74,0.06)'` (brassSubtle) | `'rgba(168,153,104,0.15)'` |
| `'rgba(140,122,74,0.12)'` (brassBorder) | `'rgba(168,153,104,0.25)'` |
| `'#1A1917'` (text) | `'#FFFFFF'` |
| `'#3D3C37'` (textSecondary) | `'rgba(255,255,255,0.85)'` |
| `'#6E6D65'` (textTertiary) | `'rgba(255,255,255,0.55)'` |
| `'#9C9B93'` (textQuaternary) | `'rgba(255,255,255,0.35)'` |
| `'#C8C7C0'` (textGhost) | `'rgba(255,255,255,0.2)'` |
| `'#2D6A4F'` (green) | `'#4ADE80'` |
| `'#C0392B'` / `'#9C3A2A'` (red) | `'#F87171'` |
| `'#2563EB'` (blue) | `'#60A5FA'` |
| `'rgba(180,60,40,0.04)'` (error bg) | `'rgba(248,113,113,0.08)'` |
| `'rgba(180,60,40,0.12)'` (error border) | `'rgba(248,113,113,0.2)'` |
| `background: '#fff'` (inline card bg) | `'rgba(255,255,255,0.04)'` |
| `shadow rgba(26,25,23,...)` | `rgba(0,0,0,...)` with higher opacity |

## Button Pattern (dark)
Primary action buttons: `background: '#A89968', color: '#0A0A0B'` (brass bg, near-black text)
NOT `background: c.text, color: '#FAFAF8'` — that inverts poorly on dark backgrounds.

Green CTA buttons (dispatch, confirm schedule): `background: c.green, color: '#0A0A0B'`

## Files Converted to Dark Theme
1. `src/components/briefing/BriefingItem.tsx`
2. `src/components/briefing/BriefingSection.tsx`
3. `src/components/briefing/CitationDrawer.tsx`
4. `src/components/commitments/CommitmentCard.tsx`
5. `src/components/commitments/CommitmentQueue.tsx`
6. `src/components/people/ContactCard.tsx`
7. `src/components/people/MeetingPrepCard.tsx`
8. `src/components/operations/AMSweepPanel.tsx`
9. `src/components/operations/TimeBlockPanel.tsx`
10. `src/components/operations/CompletionReport.tsx`
11. `src/components/shared/FeedbackWidget.tsx`

## Inline Hardcoded Colors to Watch
Some files had `background: '#fff'` and `background: '#FEF2F2'` etc. outside the `c` block.
Always search for these after editing `c` tokens — they will not update automatically.
Pattern: grep for `'#fff'`, `'#FFFF'`, `'#FEF2F2'`, `'#F0FDF4'`, `'#FFFBEB'` before finishing.

## Dashboard Page Files Converted to Dark Theme (session 2)
All 7 dashboard page files updated. Token rename: `textQuaternary` → `textMuted`, `brassSubtle` → `brassMuted`.

1. `src/app/(dashboard)/dashboard/page.tsx`
2. `src/app/(dashboard)/inbox/page.tsx`
3. `src/app/(dashboard)/calendar/page.tsx`
4. `src/app/(dashboard)/commitments/page.tsx`
5. `src/app/(dashboard)/people/page.tsx`
6. `src/app/(dashboard)/heartbeat/page.tsx`
7. `src/app/(dashboard)/operations/page.tsx`

Additional inline mappings applied in this pass:
- Unread inbox item bg: `'#FDFCFB'` → `'rgba(255,255,255,0.06)'`
- Connected integration badge: `rgba(45,106,79,0.06)` bg / `#2D6A4F` text → `rgba(74,222,128,0.1)` / `#4ADE80`
- Operations overnight-done success state: `'#F0FDF4'` / `'#2D6A4F'` → `'rgba(74,222,128,0.1)'` / `'#4ADE80'`
- `textSecondary: '#4A4940'` (operations variant) → `'rgba(255,255,255,0.85)'`

## Tailwind Setup
Tailwind v4 — NO `tailwind.config.ts`. All design tokens live in `src/app/globals.css` under `@theme inline {}` and `:root {}`. Gold/brass: `--color-gold` / `--gold`. Border radius base: `--radius: 0.5rem`.

## Font
Dashboard shell loads Satoshi from Fontshare via a `<link>` tag inside the component render. `globals.css` references `var(--font-geist-sans)`. Page components inline `fontFamily: "'Satoshi', sans-serif"` via style props.

## Animation Utilities (globals.css)
`animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`, `animate-drawer-slide-up`, `.stagger-children`. Use these — don't invent new keyframes.

## Dashboard Shell Structure
- Sidebar: `fixed`, `w-[240px]`, `z-30`, surface bg, right border
- Main: `ml-[240px]`, `max-w-[1400px]`, `px-8 py-10`
- Logo mark still shows "CS" (not "D") — vestige of rename
- FeedbackWidget floats as fixed overlay

## Token Naming Inconsistency (known)
`textQuaternary` vs `textMuted` (both = `rgba(255,255,255,0.35)`). `brassSubtle` vs `brassMuted` (both = `rgba(168,153,104,0.15)`). Not yet unified — be aware when building new components.

## Page Layout Pattern
`space-y-10` between major sections. Section headers: icon-in-6x6-box + h2 semibold 13px + count pill. Cards at page level: `rounded-xl`. Component cards: `rounded-xl` (BriefingItem) or inline `borderRadius: 10` (CommitmentCard, ContactCard).

## NOT Yet Converted
- `src/app/(dashboard)/settings/operations/page.tsx` — still light theme (out of scope for session 2)
- All other `src/app/(dashboard)/settings/` pages — not audited

## Gotcha: replace_all misses different indentation
`replace_all` on indented multi-line strings will silently skip blocks with different leading
whitespace. Always run a grep sanity check after bulk replacements to catch stragglers.
Error blocks appear multiple times per file (loading, empty, content states) — all must be caught.

## TypeScript
`npm run typecheck` passes cleanly after color-only changes.
Color value strings are typed as plain string literals — no type issues from token changes.

## Landing Page Project — my-landing-page/
Separate Next.js 16 / Tailwind v4 app at `/Users/nazir/donna/my-landing-page/`.
- Layout loads Satoshi (Fontshare) + Playfair Display (Google Fonts) globally
- Additional fonts (Cormorant Garamond, JetBrains Mono) injected via inline `<link>` inside page components
- `"use client"` required on all interactive pages
- Three.js / @react-three/fiber already installed but should NOT be used in V1 (pure CSS)

## Landing Page V1 — "Dawn" variant
File: `/Users/nazir/donna/my-landing-page/app/v1/page.tsx`
Brand palette: midnight=#1B1F3A, dawn=#E8845C, dusk=#4E7DAA, paper=#FBF7F4, sage=#52B788, gold=#F4C896, deep=#0E1225, charcoal=#2D3154, mist=#9BAFC4, stone=#F0EDE9
Fonts: Cormorant Garamond (headings, italic for emphasis), Inter (body), JetBrains Mono (labels/mono)
Key patterns: `useReveal` IntersectionObserver hook, `Counter` animated stat hook, `Reveal` wrapper component, `BriefingBlock` sub-component for Telegram card
Build verified clean: `npm run build` passes, route `/v1` pre-renders as static.
