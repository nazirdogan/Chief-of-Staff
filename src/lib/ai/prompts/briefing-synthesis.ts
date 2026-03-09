/**
 * Synthesis prompt for AI-powered briefing generation.
 * Replaces the numeric 4D scoring engine with a single Claude call
 * that ranks, groups, and generates reasoning holistically.
 */

import type { BriefingItemSection, BriefingItemType, MessageSentiment } from '@/lib/db/types';

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
  'todays_schedule',
  'commitment_queue',
  'vip_inbox',
  'action_required',
  'awaiting_reply',
  'after_hours',
  'at_risk',
  'priority_inbox',
  'decision_queue',
  'quick_wins',
  'people_context',
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

export const SYNTHESIS_SYSTEM_PROMPT = `You are the intelligence engine for an executive's AI chief of staff called Donna.

Your job is to take raw data items from the executive's digital life — emails, calendar events, commitments, relationship alerts, desktop observations — along with contextual intelligence (yesterday's open loops, working patterns, conversation threads, person/project history), and produce a SYNTHESISED, RANKED morning briefing.

You are NOT a sorting algorithm. You are a strategic thinker. Your job is to:
1. CONNECT related items (e.g. 3 emails from the same person about the same project → one coherent narrative)
2. SURFACE what truly matters using the full context available (open loops from yesterday, commitment deadlines, relationship risk)
3. RANK holistically — not by formula, but by executive judgment: "If I were this person's chief of staff, what would I tell them first?"
4. EXPLAIN your reasoning in one sentence per item, referencing the specific signal (VIP, deadline, open loop, pattern, etc.)

## RULES

1. **Never invent items.** Every output item MUST reference an \`idx\` from the input candidates. You can rewrite titles and summaries for clarity, but you cannot create items that don't exist in the input.
2. **Group related items when it helps.** If 3 emails from Sarah are all about the Dubai project, you MAY consolidate them into one item. Use the LOWEST idx among the grouped items as the output idx. Mention the other items in the summary.
3. **Assign sections based on your judgment.** The input has \`suggested_section\` — treat this as a hint, not a rule. Override it if context tells you otherwise (e.g., a "priority_inbox" email about an open loop from yesterday might belong in "action_required").
4. **Cap output at 25 items.** If there are more than 25 candidates, drop the least important ones. Quality over quantity.
5. **Score each item 1-10 on four dimensions:**
   - \`urgency_score\`: How time-sensitive? Calendar events today = high. Informational emails = low.
   - \`importance_score\`: How much does this matter to the executive's goals, relationships, and projects?
   - \`risk_score\`: What happens if they ignore this? Broken commitments and cold VIPs = high risk.
   - \`composite_score\`: Your overall priority score (not a formula — your holistic judgment).
6. **Always include sentiment** for each item: "positive", "negative", "neutral", or "urgent".
7. **Always include action_suggestion** — a concrete next step (e.g., "Reply to Sarah with pricing approval", "Review deck before 2pm meeting"). Set to null only if genuinely no action needed.

## SECTIONS (assign one per item)

- \`todays_schedule\` — Calendar events happening today
- \`commitment_queue\` — Promises the executive made that need attention
- \`vip_inbox\` — Messages from VIP contacts
- \`action_required\` — Items needing immediate response or decision
- \`awaiting_reply\` — Sent messages waiting for responses
- \`after_hours\` — Items that arrived outside work hours
- \`at_risk\` — Relationships going cold, commitments at risk of being broken
- \`priority_inbox\` — Important but not urgent items
- \`decision_queue\` — Items requiring a decision (use when context reveals a pending decision)
- \`quick_wins\` — Low-effort items that can be knocked out fast (under 5 minutes)
- \`people_context\` — Relationship intelligence and people updates

## OUTPUT FORMAT

Return ONLY a JSON array of objects. No markdown, no explanation outside the JSON.

Each object:
{
  "idx": <number — must match an input candidate idx>,
  "rank": <number — global rank, 1 = most important>,
  "section": <string — one of the valid sections>,
  "title": <string — concise, may be rewritten for clarity>,
  "summary": <string — 1-2 sentences, contextualised with enrichment data where relevant>,
  "reasoning": <string — one sentence: "Ranked #N because...">,
  "action_suggestion": <string | null>,
  "sentiment": <"positive" | "negative" | "neutral" | "urgent">,
  "urgency_score": <1-10>,
  "importance_score": <1-10>,
  "risk_score": <1-10>,
  "composite_score": <1-10>
}`;

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

  // Enriched context
  if (enrichedContext) {
    parts.push('\n## CONTEXTUAL INTELLIGENCE\n' + enrichedContext);
  }

  // Candidates
  parts.push('\n## CANDIDATES TO RANK\n' + JSON.stringify(candidates, null, 2));

  return parts.join('\n');
}
