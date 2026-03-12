/**
 * Synthesis prompt for AI-powered briefing generation.
 * 3-section briefing: Priorities, Yesterday's Summary, Today's Schedule.
 */

import type { BriefingItemSection, BriefingItemType, MessageSentiment } from '@/lib/db/types';
import { DONNA_PERSONA } from './persona';

export interface SynthesisInputItem {
  /** Unique index for mapping back to source_ref after synthesis */
  idx: number;
  item_type: BriefingItemType;
  suggested_section: BriefingItemSection;
  title: string;
  summary: string;
  from_email?: string;
  raw_urgency?: number;
  sentiment?: MessageSentiment | null;
  action_suggestion?: string;
}

export interface SynthesisOutputItem {
  idx: number;
  rank: number;
  section: BriefingItemSection;
  title: string;
  summary: string;
  reasoning: string;
  action_suggestion: string | null;
  sentiment: MessageSentiment | null;
  urgency_score: number;
  importance_score: number;
  risk_score: number;
  composite_score: number;
}

export const VALID_SECTIONS: BriefingItemSection[] = [
  'priorities',
  'yesterday_completed',
  'yesterday_carried_over',
  'todays_schedule',
];

export const VALID_ITEM_TYPES: BriefingItemType[] = [
  'email',
  'calendar_event',
  'commitment',
  'relationship_alert',
  'document',
  'task',
  'slack_message',
  'dm',
  'calendar_booking',
  'pull_request',
];

export const VALID_SENTIMENTS: MessageSentiment[] = [
  'positive',
  'negative',
  'neutral',
  'urgent',
];

export const SYNTHESIS_SYSTEM_PROMPT = `${DONNA_PERSONA}

---

## Your Task

You are the intelligence engine for an executive's AI chief of staff called Donna.

Your job is to take raw data items from the executive's digital life — emails, calendar events, commitments, relationship alerts, desktop observations — along with contextual intelligence (yesterday's open loops, working patterns, conversation threads, person/project history), and produce a SYNTHESISED, RANKED morning briefing.

The briefing has exactly THREE sections. Every item goes into one of them:

## SECTION 1: PRIORITIES (section = "priorities")
A ranked action list of what needs doing today. This is the hero of the briefing.
Each item should have:
- A clear, concise title
- A one-line summary explaining WHY it matters (e.g. "Overdue by 2 days", "Meeting at 2pm requires this", "VIP waiting on your response")
- A concrete action_suggestion (e.g. "Reply to Sarah with pricing approval", "Review deck before 2pm meeting")

Include: VIP emails needing replies, open tasks at risk, action-required items, decisions to make, quick wins, relationship alerts.
Do NOT include calendar events here — those go in todays_schedule.

**TASK ESCALATION RULES:**
- Overdue tasks (past their deadline) MUST appear in the top 3 priorities. Always.
- Tasks due today MUST appear in the top 5 priorities.
- Use strong, direct language for overdue items: "OVERDUE: You promised X to Y — N days late"
- For overdue items: urgency_score = 10, risk_score >= 9, composite_score >= 9
- If there are overdue tasks, your opening summary tone should acknowledge them: e.g. "You have 3 overdue promises that need attention."

## SECTION 2: YESTERDAY'S SUMMARY
Split into two sub-sections:
- **Completed** (section = "yesterday_completed"): What got done yesterday — resolved tasks, sent replies, completed tasks, key decisions made.
- **Carried Over** (section = "yesterday_carried_over"): What didn't get done and why it's still relevant — open tasks, unanswered threads, stalled items.

Use the contextual intelligence (yesterday's narrative, resolved tasks, activity sessions) to populate this section. If no yesterday data is available, omit these items entirely.

## SECTION 3: TODAY'S SCHEDULE (section = "todays_schedule")
Calendar events for the day. Each item should include:
- Event title and time
- Participants (in summary or from_name)
- A brief prep note if context is available (e.g. "Last spoke 3 weeks ago about X")

## RULES

1. **Never invent items.** Every output item MUST reference an \`idx\` from the input candidates. You can rewrite titles and summaries for clarity, but you cannot create items that don't exist in the input.
2. **Group related items when it helps.** If 3 emails from Sarah are all about the same project, consolidate into one item. Use the LOWEST idx among the grouped items as the output idx. Mention the other items in the summary.
3. **Cap priorities at 8 items.** Quality over quantity. The executive should feel clarity, not overwhelm.
4. **Cap total output at 25 items** across all sections.
5. **Score each item 1-10 on four dimensions:**
   - \`urgency_score\`: How time-sensitive? Calendar events today = high. Informational = low.
   - \`importance_score\`: How much does this matter to the executive's goals, relationships, and projects?
   - \`risk_score\`: What happens if they ignore this? Broken tasks and cold VIPs = high risk.
   - \`composite_score\`: Your overall priority score (not a formula — your holistic judgment).
6. **Always include sentiment** for each item: "positive", "negative", "neutral", or "urgent".
7. **Always include action_suggestion** for priorities — a concrete next step. Can be null for yesterday items and schedule items where no action is needed.
8. **Rank within each section.** Priorities ranked by importance. Schedule ranked by time. Yesterday items ranked by relevance.

## OUTPUT FORMAT

Return ONLY a JSON array of objects. No markdown, no explanation outside the JSON.

Each object:
{
  "idx": <number — must match an input candidate idx>,
  "rank": <number — rank within the item's section, 1 = most important/earliest>,
  "section": <"priorities" | "yesterday_completed" | "yesterday_carried_over" | "todays_schedule">,
  "title": <string — concise, may be rewritten for clarity>,
  "summary": <string — 1-2 sentences, contextualised with enrichment data where relevant>,
  "reasoning": <string — one sentence: why this item matters>,
  "action_suggestion": <string | null>,
  "sentiment": <"positive" | "negative" | "neutral" | "urgent">,
  "urgency_score": <1-10>,
  "importance_score": <1-10>,
  "risk_score": <1-10>,
  "composite_score": <1-10>
}`;

/** Additional stats passed into the synthesis prompt for ranking/toning */
export interface BriefingStats {
  /** Number of overdue tasks (past implied_deadline, still open) */
  overdueTaskCount: number;
  /** Number of tasks due today */
  dueTodayTaskCount: number;
  /** Top relationship scores: [{name, email, score}] */
  topRelationshipScores: Array<{ name: string; email: string; score: number }>;
  /** Contacts with declining scores: [{name, email, score, previousScore}] */
  decliningRelationships: Array<{ name: string; email: string; score: number; previousScore: number }>;
  /** Peak productivity hours from working patterns */
  peakHours: Array<{ hour: number; activityScore: number }>;
  /** Typical work hours */
  workHours: { start: string; end: string } | null;
}

/**
 * Build the user message for the synthesis call.
 * Keeps candidates and context clearly separated.
 */
export function buildSynthesisUserMessage(
  candidates: SynthesisInputItem[],
  enrichedContext: string,
  vipEmails: string[],
  activeProjects: string[],
  weeklyPriority: string | null,
  stats?: BriefingStats,
): string {
  const parts: string[] = [];

  // User profile
  parts.push('## EXECUTIVE PROFILE');
  if (vipEmails.length > 0) {
    parts.push(`VIP contacts: ${vipEmails.join(', ')}`);
  }
  if (activeProjects.length > 0) {
    parts.push(`Active projects: ${activeProjects.join(', ')}`);
  }
  if (weeklyPriority) {
    parts.push(`This week's priority: ${weeklyPriority}`);
  }

  // Briefing stats — working patterns, relationships, overdue tasks
  if (stats) {
    const statParts: string[] = [];
    if (stats.overdueTaskCount > 0) {
      statParts.push(`**${stats.overdueTaskCount} OVERDUE tasks** — these MUST be the top priorities. The executive has broken promises that need immediate resolution.`);
    }
    if (stats.dueTodayTaskCount > 0) {
      statParts.push(`**${stats.dueTodayTaskCount} tasks due TODAY** — these must appear in top 5 priorities.`);
    }
    if (stats.workHours) {
      statParts.push(`Work hours: ${stats.workHours.start} – ${stats.workHours.end}`);
    }
    if (stats.peakHours.length > 0) {
      const peakStr = stats.peakHours
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 3)
        .map(h => `${h.hour}:00 (score: ${h.activityScore})`)
        .join(', ');
      statParts.push(`Peak productivity hours: ${peakStr}. Schedule deep work and important tasks during these windows.`);
    }
    if (stats.topRelationshipScores.length > 0) {
      statParts.push('Strongest relationships: ' +
        stats.topRelationshipScores.map(r => `${r.name} (${r.score})`).join(', '));
    }
    if (stats.decliningRelationships.length > 0) {
      statParts.push('Declining relationships (needs attention): ' +
        stats.decliningRelationships.map(r => `${r.name} (${r.score}, was ${r.previousScore})`).join(', '));
    }
    if (statParts.length > 0) {
      parts.push('\n## EXECUTIVE STATS\n' + statParts.join('\n'));
    }
  }

  // Enriched context
  if (enrichedContext) {
    parts.push('\n## CONTEXTUAL INTELLIGENCE\n' + enrichedContext);
  }

  // Candidates
  parts.push('\n## CANDIDATES TO RANK\n' + JSON.stringify(candidates, null, 2));

  return parts.join('\n');
}
