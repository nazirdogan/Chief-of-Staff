# Donna Dashboard UX Enhancement Plan
*Analysis date: March 8, 2026*

---

## Executive Summary

The Donna dashboard is technically well-built but carries significant UX debt primarily around **navigation architecture** and **visual consistency**. The product's core promise — a proactive intelligence layer — is delivered excellently on the Briefing page, but the surrounding 9 additional pages create cognitive overload and some redundancy. This document identifies what's working, what's redundant, and what to fix, plus the one change already implemented.

---

## Page-by-Page Analysis

### ✅ Briefing (`/dashboard`) — The Heart of the Product

**What it does well:**
- Greeting + greeting context line sets the tone perfectly
- Day at a Glance card and stat cards give immediate spatial orientation
- Intent-based grouping (Reply Now / Follow Up / Review / FYI) is an excellent UX pattern — users know exactly what to do
- Action Plan checklist with scroll-to-section is clever and useful
- Urgent items with left-border treatment is visually distinct and clear
- FYI collapse prevents the page from feeling overwhelming
- Yesterday's Recap and CitationDrawer round out the experience

**What needs work:**
- No keyboard navigation between sections (other than ⌘K palette)
- The "Refresh briefing" button label could be clearer — it actually re-syncs AND regenerates, which is slow. Consider "Re-sync & regenerate" or a last-synced timestamp so users know whether they even need to refresh.
- `max-w-[1400px]` on the shell conflicts with the 3-column grid on wide screens — at very large viewports some columns become too wide to scan comfortably

---

### ✅ Inbox (`/inbox`) — Useful, Mostly Non-Redundant

**What it does well:**
- Filter tabs (All / Unread / Needs Reply / Starred / Archived by Donna) are well-structured
- "Archived by Donna" tab is a differentiating feature — the weekly summary banner and bulk undo are great
- AI summary preview line helps users triage without opening items
- Urgency priority badges (P1/P2) are useful

**What needs work:**
- **Partial redundancy with Briefing**: The Briefing's "Reply Now" and "Follow Up" sections already surface the most important inbox items. The raw Inbox page serves a different use-case (bulk browsing), but this distinction is not communicated to the user. Consider adding a subtle "Top picks are in your Briefing" hint on the Inbox page.
- Inline `style={{}}` mixed with Tailwind class names throughout — inconsistent with the Briefing page's approach. Not functional, but adds maintenance cost.
- No pagination or virtual scroll for large inboxes.

---

### ⚠️ Calendar (`/calendar`) — Partial Redundancy

**What it does well:**
- Day-navigation (prev/next/today) makes it useful for planning ahead
- "Join meeting" link is a real time-saver not available on the Briefing
- "Currently in progress" highlight (blue left-border) is effective

**The redundancy problem:**
- For today, the Briefing already shows Today's Schedule with meeting cards and time. The Calendar page adds no new information for today.
- The Calendar page's value is entirely in the day-navigation — browsing yesterday or tomorrow. This should be the page's headline message, not buried in a prev/next control.

**Recommendation:** Reframe Calendar as "Schedule" and default to a week view or at minimum surface "you're viewing today — the Briefing also has today's schedule" to explain why this page exists.

---

### ✅ Commitments (`/commitments`) — Correct, Non-Redundant

**What it does well:**
- Clear, focused purpose: manage extracted promises
- The Briefing surfaces the top commitment items but this page is the full queue

**What needs work:** Nothing structural. This page is well-placed and non-redundant.

---

### ✅ People (`/people`) — Correct, Non-Redundant

**What it does well:**
- Relationship score ordering is the right default
- Cold filter directly supports the "who have I gone cold with" use case
- VIP filter for priority contacts

**What needs work:** No critical issues. The page is well-structured.

---

### ❌ Heartbeat (`/heartbeat`) — MISPLACED in Main Nav

**The problem:**
Heartbeat is a **settings/configuration page**, not a daily-use feature. It configures sync frequency and shows run history. Users set this once and check it occasionally for debugging. Placing it alongside Briefing and Inbox in the primary nav implies it has daily value — it does not.

**Recommendation:** Move Heartbeat under `/settings/heartbeat` and add it as a card in the Settings index page. This removes a confusing nav item without removing the feature.

---

### ⚠️ Operations (`/operations`) — Power User Feature, Borderline Redundant

**What it does well:**
- AM Sweep gives visibility into what Donna processed each morning
- Time Blocker is a useful scheduling tool
- Completion Report shows daily throughput

**Problems:**
- "Run History (placeholder)" is still a placeholder — shows nothing yet and wastes screen space
- The `runOvernight` function calls `GET /api/operations/am-sweep` — this should be a `POST` (semantic bug: GET should be idempotent, not trigger side effects)
- Operations overlaps with the Briefing's intelligence layer — the AM Sweep is essentially what generates the Briefing. Users may be confused about which one to use.
- Setting `maxWidth: 800, margin: '0 auto', padding: '24px 16px'` inside the page while the shell already applies `px-8 py-10` creates double-padding.

**Recommendation:** This page belongs in the "Intelligence" nav group (already moved by the implemented change). Consider removing the placeholder Run History section until it's real data.

---

### ✅ Ask Donna (`/chat`) — Correct, High Value

**What it does well:**
- Provides a direct interface to act on the briefing and answer context questions
- Correctly separate from the proactive Briefing

**What needs work:** Nothing structural. Well-placed.

---

### 🔬 Memory (`/memory`) — Advanced, Low Daily Use

**What it does well:**
- Transparency into Donna's context is valuable for power users and for building trust

**The problem:** Most users will never visit this page during normal use. It's a debugging/transparency tool. Keeping it in the nav creates visual clutter for the 95% of users who don't need it daily.

**Recommendation:** Keep in nav under "Intelligence" group (already done). Long-term, consider surfacing a "What does Donna know about X?" shortcut from the Briefing or People pages instead.

---

### 🔬 Patterns (`/patterns`) — Advanced, Low Daily Use

Same assessment as Memory. Useful for power users, but not a daily-use page. Correctly placed in the Intelligence group.

---

## Layout Issues

### 1. Heading Style Inconsistency (High Priority)

The Briefing page uses Cormorant Garamond at 32px, weight 300, with careful tracking — this feels premium and matches the brand. Every other page uses Inter at 22px, weight 700 — this is jarring when navigating between pages.

**All these pages need the heading treatment fixed:**
- Inbox, Calendar, Commitments, People, Heartbeat, Operations

The fix is simple: replace the `<h1 style={{ fontSize: 22, fontWeight: 700 }}>` pattern with the brand-consistent serif heading used on the Briefing page.

### 2. Settings Page Style Mismatch (Medium Priority)

The Settings index page uses `shadcn/ui Card` components with Tailwind utility classes, while every other page uses inline `style={{}}` objects. This creates a visual break. The Settings page uses a white/light theme via `text-muted-foreground` which doesn't render correctly against the dark `#0E1225` sidebar background.

### 3. Operations Page Double-Padding (Low Priority)

`/operations/page.tsx` applies `padding: '24px 16px'` internally while the shell's `<main>` already applies `px-8 py-10`. This creates uneven spacing at the top of the Operations page.

### 4. Command Palette Not Surfaced (Medium Priority)

The `⌘K` command palette is implemented and works, but there is no hint in the UI that it exists. Users who don't discover it never get the benefit. Consider adding a small `⌘K` keyboard shortcut hint in the sidebar, near the bottom or beside the logo.

### 5. No Active Section Indicator for Settings Sub-pages

When navigating to `/settings/integrations` or `/settings/security`, the "Settings" nav item in the sidebar shows as active — but there's no breadcrumb or sub-nav indicating which settings section you're in. This is minor but creates mild disorientation.

---

## Redundancy Summary

| Page | Redundant With | Verdict |
|------|---------------|---------|
| Inbox | Briefing (Reply Now / Follow Up sections) | Partial — different use case (bulk vs. briefed). Keep, but add context hint. |
| Calendar | Briefing (Today's Schedule section) | Partial — add day-navigation value. Reframe as "Schedule" for multi-day view. |
| Heartbeat | Settings | Full redundancy — move to Settings. |
| Operations | Briefing (indirect) | Low — keep in Intelligence group as power tool. |

---

## The One Change Implemented

**File changed:** `src/components/dashboard/dashboard-shell.tsx`

**What changed:** The flat `navItems` array of 10 items was replaced with a `navGroups` structure that splits the navigation into two logical groups:

**No label (primary, daily-use):** Briefing, Inbox, Calendar, Commitments, People

**"Intelligence" (tools/advanced):** Ask Donna, Operations, Heartbeat, Memory, Patterns

A subtle section label `INTELLIGENCE` in `textQuaternary` opacity separates the groups with no divider line, keeping the visual weight low.

**Why this change:** 10 undifferentiated items at the same visual weight creates cognitive overload. Users coming to Donna for their morning briefing have to scan past Heartbeat, Memory, and Patterns to reach their actual destination. Grouping communicates the hierarchy: "here are your daily tools; here are Donna's deeper capabilities." The change is purely additive — no pages were removed.

**Visual result:**
```
donna (logo)
───────────────
Briefing
Inbox
Calendar
Commitments
People

INTELLIGENCE
Ask Donna
Operations
Heartbeat
Memory
Patterns
───────────────
Settings
Sign out
```

---

## Recommended Next Steps (Priority Order)

1. **Fix heading style inconsistency** across all pages — use Cormorant Garamond + Inter pairing from the Briefing page as the standard page header component. High impact, low effort.

2. **Move Heartbeat to Settings** — Add a "Heartbeat" card to `/settings/page.tsx` and move the page to `/settings/heartbeat`. Update the nav accordingly. Cleans up the primary nav.

3. **Fix Operations double-padding** — Remove the internal `padding` and `margin: '0 auto'` from `/operations/page.tsx` since the shell handles this.

4. **Surface the ⌘K palette** — Add a small keyboard shortcut badge near the bottom of the sidebar so users discover the command palette.

5. **Fix the semantic POST bug** in Operations — `runOvernight` calls `GET /api/operations/am-sweep` but should call `POST` since it triggers a side effect.

6. **Remove the "Run History (placeholder)"** section from Operations until it's real data.

7. **Reframe Calendar as "Schedule"** — Change label from "Calendar" to "Schedule" and open to a week view by default so the page's value proposition (multi-day planning) is immediately clear.
