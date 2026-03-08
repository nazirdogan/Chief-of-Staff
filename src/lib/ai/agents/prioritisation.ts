import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import type { InboxItem, Commitment, Contact, BriefingItemType, BriefingItemSection, SourceRef, MessageSentiment } from '@/lib/db/types';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';
import type { ParsedGmailMessage } from '@/lib/integrations/gmail';
import type { ParsedOutlookMessage } from '@/lib/integrations/outlook';
import type { ContextChunk } from '@/lib/context/types';

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
  sentiment?: MessageSentiment | null;
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

  // VIP inbox items get urgency boost
  if (item.section === 'vip_inbox') {
    score = Math.max(score, 8);
  }

  // Action-required items are inherently urgent
  if (item.section === 'action_required') {
    score = Math.max(score, 7);
  }

  // Negative or urgent sentiment boosts urgency
  if (item.sentiment === 'urgent') score += 2;
  if (item.sentiment === 'negative') score += 1;

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

  // VIP items are always important
  if (item.section === 'vip_inbox') {
    score = Math.max(score, 9);
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

  // Awaiting reply = risk of dropped ball
  if (item.section === 'awaiting_reply') {
    score += 3;
  }

  // Negative sentiment = risk of relationship damage
  if (item.sentiment === 'negative') score += 2;
  if (item.sentiment === 'urgent') score += 1;

  return Math.min(10, Math.max(1, score));
}

function scoreEffort(item: BriefingItemCandidate): number {
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

const REASONING_PROMPT = `You are generating brief ranking explanations for a C-Suite executive's daily briefing.
For each item, write ONE sentence explaining why it was ranked at this position.
Start with "Ranked #N because..." and reference the specific signal (VIP sender, approaching deadline, at-risk commitment, awaiting reply, etc.).

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
  const topItems = scored.slice(0, 20);

  if (topItems.length === 0) return [];

  const itemSummaries = topItems.map(item => ({
    rank: item.rank,
    type: item.item_type,
    section: item.section,
    title: item.title,
    summary: item.summary,
    urgency: item.urgency_score,
    importance: item.importance_score,
    risk: item.risk_score,
    sentiment: item.sentiment ?? 'neutral',
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
      max_tokens: 1000,
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

/**
 * Map an inbox item to the appropriate section based on executive priorities.
 * VIP senders → vip_inbox, needs_reply → action_required, otherwise → priority_inbox
 */
export function mapInboxItemToCandidate(
  item: InboxItem,
  vipEmails: string[] = []
): BriefingItemCandidate {
  const isVip = vipEmails.includes(item.from_email);
  const section: BriefingItemSection = isVip
    ? 'vip_inbox'
    : item.needs_reply
      ? 'action_required'
      : 'priority_inbox';

  return {
    item_type: 'email',
    section,
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
    sentiment: item.sentiment,
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

/**
 * Map a sent message awaiting reply to the awaiting_reply section.
 */
export function mapSentAwaitingReplyToCandidate(
  message: ParsedGmailMessage | ParsedOutlookMessage,
  provider: 'gmail' | 'outlook'
): BriefingItemCandidate {
  const isGmail = provider === 'gmail';
  const subject = isGmail
    ? (message as ParsedGmailMessage).subject
    : (message as ParsedOutlookMessage).subject;
  const to = isGmail
    ? (message as ParsedGmailMessage).to
    : (message as ParsedOutlookMessage).to;
  const id = isGmail
    ? (message as ParsedGmailMessage).id
    : (message as ParsedOutlookMessage).id;
  const date = isGmail
    ? (message as ParsedGmailMessage).date
    : (message as ParsedOutlookMessage).date;
  const snippet = isGmail
    ? (message as ParsedGmailMessage).snippet
    : (message as ParsedOutlookMessage).bodyPreview;

  return {
    item_type: 'email',
    section: 'awaiting_reply',
    title: subject || '(No subject)',
    summary: `Sent to ${to} — no reply yet`,
    source_ref: {
      provider,
      message_id: id,
      excerpt: snippet,
      sent_at: date ? new Date(date).toISOString() : undefined,
    },
    action_suggestion: 'Consider following up',
    raw_urgency: 6,
  };
}

/**
 * Map an after-hours email to the after_hours section.
 */
export function mapAfterHoursToCandidate(
  message: ParsedGmailMessage
): BriefingItemCandidate {
  const receivedDate = new Date(message.date);
  const timeStr = receivedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return {
    item_type: 'email',
    section: 'after_hours',
    title: message.subject || '(No subject)',
    summary: `From ${message.fromName || message.from} at ${timeStr}`,
    source_ref: {
      provider: 'gmail',
      message_id: message.id,
      excerpt: message.snippet,
      sent_at: message.date ? new Date(message.date).toISOString() : undefined,
      from_name: message.fromName,
      thread_id: message.threadId,
    },
    action_suggestion: 'Review',
    from_email: message.from,
    raw_urgency: 5,
  };
}

/**
 * Map a desktop observer context chunk (WhatsApp, Messages, Slack desktop, etc.)
 * to a briefing candidate. Communication activity goes to priority_inbox;
 * high-importance observations go to action_required.
 */
export function mapDesktopObservationToCandidate(
  chunk: ContextChunk,
  vipEmails: string[] = []
): BriefingItemCandidate {
  const sourceRef = chunk.source_ref as Record<string, unknown>;
  const app = (sourceRef.app as string) ?? 'Desktop';
  const activityType = (sourceRef.activity_type as string) ?? 'unknown';
  const capturedAt = (sourceRef.captured_at as string) ?? chunk.occurred_at;

  // Determine if any people in this chunk are VIPs
  const hasVip = chunk.people.some((p) => vipEmails.includes(p));

  // Section assignment based on importance and VIP status
  let section: BriefingItemSection = 'priority_inbox';
  if (hasVip) {
    section = 'vip_inbox';
  } else if (chunk.importance === 'critical' || chunk.importance === 'important') {
    section = 'action_required';
  }

  // Determine item type based on activity
  const itemType: BriefingItemType = activityType === 'communicating' ? 'email' : 'email';

  // Build a descriptive title
  const title = chunk.title ?? `${app} activity`;

  return {
    item_type: itemType,
    section,
    title,
    summary: chunk.content_summary,
    source_ref: {
      provider: 'desktop_observer',
      message_id: chunk.source_id,
      excerpt: chunk.content_summary,
      sent_at: capturedAt,
      from_name: app,
    },
    action_suggestion: activityType === 'communicating' ? 'Review and respond' : 'Review',
    raw_urgency: chunk.importance === 'critical' ? 9 : chunk.importance === 'important' ? 7 : 5,
    sentiment: chunk.sentiment as MessageSentiment | null,
  };
}
