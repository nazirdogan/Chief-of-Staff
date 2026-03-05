import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import type { InboxItem, Commitment, Contact, BriefingItemType, BriefingItemSection, SourceRef } from '@/lib/db/types';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';

const anthropic = new Anthropic();

export interface UserContext {
  vipEmails: string[];
  activeProjects: string[];
  weeklyPriority: string | null;
}

export interface BriefingItemCandidate {
  item_type: BriefingItemType;
  section: BriefingItemSection;
  title: string;
  summary: string;
  source_ref: SourceRef;
  action_suggestion?: string;
  from_email?: string;
  raw_urgency?: number;
}

export interface RankedBriefingItem extends BriefingItemCandidate {
  rank: number;
  urgency_score: number;
  importance_score: number;
  risk_score: number;
  composite_score: number;
  reasoning: string;
}

// ── Dimension scoring functions ──

function scoreUrgency(item: BriefingItemCandidate): number {
  let score = 5;

  if (item.raw_urgency) {
    score = item.raw_urgency;
  }

  if (item.item_type === 'calendar_event') {
    score = Math.max(score, 8);
  }

  if (item.item_type === 'commitment') {
    score = Math.max(score, 7);
  }

  return Math.min(10, Math.max(1, score));
}

function scoreImportance(item: BriefingItemCandidate, ctx: UserContext): number {
  let score = 5;

  if (item.from_email && ctx.vipEmails.includes(item.from_email)) {
    score += 3;
  }

  if (ctx.activeProjects.some(p =>
    item.title?.toLowerCase().includes(p.toLowerCase()) ||
    item.summary?.toLowerCase().includes(p.toLowerCase())
  )) {
    score += 2;
  }

  return Math.min(10, Math.max(1, score));
}

function scoreRisk(item: BriefingItemCandidate): number {
  let score = 3;

  if (item.item_type === 'commitment') {
    score += 4;
  }

  if (item.item_type === 'relationship_alert') {
    score += 3;
  }

  return Math.min(10, Math.max(1, score));
}

function scoreEffort(item: BriefingItemCandidate): number {
  // Quick wins get higher priority — inverted scale (10 = easiest)
  if (item.item_type === 'relationship_alert') return 8;
  if (item.item_type === 'email') return 7;
  if (item.item_type === 'commitment') return 5;
  if (item.item_type === 'calendar_event') return 4;
  return 5;
}

// ── Composite scoring ──

function computeCompositeScore(item: BriefingItemCandidate, ctx: UserContext) {
  const urgency = scoreUrgency(item);
  const importance = scoreImportance(item, ctx);
  const risk = scoreRisk(item);
  const effort = scoreEffort(item);

  const composite =
    urgency * 0.30 +
    importance * 0.25 +
    risk * 0.35 +
    effort * 0.10;

  return { urgency, importance, risk, effort, composite };
}

// ── AI reasoning generation ──

function extractText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

const REASONING_PROMPT = `You are generating brief ranking explanations for a daily briefing.
For each item, write ONE sentence explaining why it was ranked at this position.
Start with "Ranked #N because..." and reference the specific signal (VIP sender, approaching deadline, at-risk commitment, etc.).

Return a JSON array of objects: [{ "rank": 1, "reasoning": "..." }, ...]
Respond ONLY with JSON.`;

async function generateReasoning(
  scored: Array<BriefingItemCandidate & {
    rank: number;
    urgency_score: number;
    importance_score: number;
    risk_score: number;
    composite_score: number;
  }>,
  ctx: UserContext
): Promise<RankedBriefingItem[]> {
  const topItems = scored.slice(0, 15);

  if (topItems.length === 0) return [];

  const itemSummaries = topItems.map(item => ({
    rank: item.rank,
    type: item.item_type,
    title: item.title,
    summary: item.summary,
    urgency: item.urgency_score,
    importance: item.importance_score,
    risk: item.risk_score,
    is_vip: item.from_email ? ctx.vipEmails.includes(item.from_email) : false,
  }));

  const context = buildSafeAIContext(
    REASONING_PROMPT,
    [{
      label: 'ranked_items',
      content: JSON.stringify(itemSummaries),
      source: 'prioritisation-engine',
    }]
  );

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.STANDARD,
      max_tokens: 800,
      messages: [{ role: 'user', content: context }],
    });

    const text = extractText(response.content)
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const reasonings: Array<{ rank: number; reasoning: string }> = JSON.parse(text);

    const reasoningMap = new Map(reasonings.map(r => [r.rank, r.reasoning]));

    return topItems.map(item => ({
      ...item,
      reasoning: reasoningMap.get(item.rank) ?? `Ranked #${item.rank} based on composite score of ${item.composite_score.toFixed(1)}`,
    }));
  } catch {
    // Fallback reasoning if AI fails
    return topItems.map(item => ({
      ...item,
      reasoning: `Ranked #${item.rank} based on composite score of ${item.composite_score.toFixed(1)}`,
    }));
  }
}

// ── Main prioritisation function ──

export async function prioritiseItems(
  candidates: BriefingItemCandidate[],
  userContext: UserContext
): Promise<RankedBriefingItem[]> {
  const scored = candidates.map(item => {
    const scores = computeCompositeScore(item, userContext);
    return {
      ...item,
      urgency_score: scores.urgency,
      importance_score: scores.importance,
      risk_score: scores.risk,
      composite_score: scores.composite,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.composite_score - a.composite_score);

  scored.forEach((item, index) => {
    item.rank = index + 1;
  });

  return generateReasoning(scored, userContext);
}

// ── Candidate mapping functions ──

export function mapInboxItemToCandidate(item: InboxItem): BriefingItemCandidate {
  return {
    item_type: 'email',
    section: 'priority_inbox',
    title: item.subject ?? '(No subject)',
    summary: item.ai_summary ?? '',
    source_ref: {
      provider: item.provider,
      message_id: item.external_id,
      excerpt: item.ai_summary ?? '',
      sent_at: item.received_at,
      from_name: item.from_name ?? undefined,
      thread_id: item.thread_id ?? undefined,
    },
    action_suggestion: item.needs_reply ? 'Reply needed' : undefined,
    from_email: item.from_email,
    raw_urgency: item.urgency_score ?? undefined,
  };
}

export function mapCommitmentToCandidate(commitment: Commitment): BriefingItemCandidate {
  return {
    item_type: 'commitment',
    section: 'commitment_queue',
    title: commitment.commitment_text,
    summary: `Promised to ${commitment.recipient_name ?? commitment.recipient_email}`,
    source_ref: commitment.source_ref,
    action_suggestion: commitment.implied_deadline
      ? `Due: ${new Date(commitment.implied_deadline).toLocaleDateString()}`
      : 'Follow up',
    from_email: commitment.recipient_email,
    raw_urgency: commitment.explicit_deadline ? 9 : 7,
  };
}

export function mapEventToCandidate(event: ParsedCalendarEvent): BriefingItemCandidate {
  const attendeeNames = event.attendees.map(a => a.name).slice(0, 3).join(', ');
  const timeStr = event.isAllDay
    ? 'All day'
    : new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return {
    item_type: 'calendar_event',
    section: 'todays_schedule',
    title: event.summary,
    summary: `${timeStr}${attendeeNames ? ` with ${attendeeNames}` : ''}`,
    source_ref: {
      provider: 'google_calendar',
      message_id: event.id,
      excerpt: `${event.summary} at ${timeStr}`,
      sent_at: event.start,
    },
    action_suggestion: event.meetingLink ? 'Join meeting' : undefined,
    raw_urgency: 8,
  };
}

export function mapColdContactToCandidate(contact: Contact): BriefingItemCandidate {
  const daysSince = contact.last_interaction_at
    ? Math.floor((Date.now() - new Date(contact.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    item_type: 'relationship_alert',
    section: 'at_risk',
    title: `Reconnect with ${contact.name ?? contact.email}`,
    summary: daysSince
      ? `No contact in ${daysSince} days${contact.is_vip ? ' (VIP)' : ''}`
      : `Relationship going cold${contact.is_vip ? ' (VIP)' : ''}`,
    source_ref: {
      provider: contact.last_interaction_channel ?? 'gmail',
      message_id: contact.id,
      excerpt: `Last interaction: ${contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString() : 'unknown'}`,
    },
    action_suggestion: 'Send a quick check-in',
    from_email: contact.email,
    raw_urgency: contact.is_vip ? 7 : 5,
  };
}
