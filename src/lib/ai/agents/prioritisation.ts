import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import type { InboxItem, Task, Contact, BriefingItemType, BriefingItemSection, SourceRef, MessageSentiment } from '@/lib/db/types';
import type { ParsedCalendarEvent } from '@/lib/integrations/google-calendar';
import type { ParsedGmailMessage } from '@/lib/integrations/gmail';
import type { ParsedOutlookMessage } from '@/lib/integrations/outlook';
import type { ContextChunk } from '@/lib/context/types';
import type { EnrichedContext } from './briefing-context';
import { serializeEnrichedContext } from './briefing-context';
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserMessage,
  VALID_SECTIONS,
  VALID_SENTIMENTS,
  type SynthesisInputItem,
  type SynthesisOutputItem,
  type BriefingStats,
} from '@/lib/ai/prompts/briefing-synthesis';

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

// ── AI Synthesis (primary path) ──

function extractText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

/**
 * Synthesise and rank briefing items using AI.
 * Falls back to formula-based scoring if the AI call fails.
 */
export async function synthesiseBriefing(
  candidates: BriefingItemCandidate[],
  userContext: UserContext,
  enrichedContext: EnrichedContext,
  stats?: BriefingStats,
): Promise<RankedBriefingItem[]> {
  if (candidates.length === 0) return [];

  try {
    return await runAISynthesis(candidates, userContext, enrichedContext, stats);
  } catch (err) {
    console.error('[briefing] AI synthesis failed, falling back to formula scoring:', err);
    return fallbackPrioritise(candidates, userContext);
  }
}

async function runAISynthesis(
  candidates: BriefingItemCandidate[],
  userContext: UserContext,
  enrichedContext: EnrichedContext,
  stats?: BriefingStats,
): Promise<RankedBriefingItem[]> {
  // Cap candidates to avoid exceeding token limits
  const capped = candidates.slice(0, 50);

  // Build indexed input items (strip source_ref to save tokens — we'll reattach after)
  const inputItems: SynthesisInputItem[] = capped.map((c, i) => ({
    idx: i,
    item_type: c.item_type,
    suggested_section: c.section,
    title: c.title,
    summary: c.summary,
    from_email: c.from_email,
    raw_urgency: c.raw_urgency,
    sentiment: c.sentiment,
    action_suggestion: c.action_suggestion,
  }));

  const contextStr = serializeEnrichedContext(enrichedContext);

  const userMessage = buildSynthesisUserMessage(
    inputItems,
    contextStr,
    userContext.vipEmails,
    userContext.activeProjects,
    userContext.weeklyPriority,
    stats,
  );

  const safeContent = buildSafeAIContext(
    SYNTHESIS_SYSTEM_PROMPT,
    [{ label: 'briefing_input', content: userMessage, source: 'briefing-synthesis' }]
  );

  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 4096,
    messages: [{ role: 'user', content: safeContent }],
  });

  const text = extractText(response.content)
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const parsed: SynthesisOutputItem[] = JSON.parse(text);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI synthesis returned empty or invalid result');
  }

  // Map AI output back to full RankedBriefingItem with original source_ref
  const ranked: RankedBriefingItem[] = [];

  for (const output of parsed) {
    const original = capped[output.idx];
    if (!original) {
      // AI referenced a non-existent idx — skip
      continue;
    }

    // Validate section
    const section = VALID_SECTIONS.includes(output.section)
      ? output.section
      : original.section;

    // Validate sentiment
    const sentiment = output.sentiment && VALID_SENTIMENTS.includes(output.sentiment)
      ? output.sentiment
      : original.sentiment ?? null;

    ranked.push({
      item_type: original.item_type,
      section,
      title: output.title || original.title,
      summary: output.summary || original.summary,
      source_ref: original.source_ref,
      action_suggestion: output.action_suggestion ?? original.action_suggestion,
      from_email: original.from_email,
      raw_urgency: original.raw_urgency,
      sentiment,
      rank: output.rank,
      urgency_score: clampScore(output.urgency_score),
      importance_score: clampScore(output.importance_score),
      risk_score: clampScore(output.risk_score),
      composite_score: clampScore(output.composite_score),
      reasoning: output.reasoning || `Ranked #${output.rank}`,
    });
  }

  // Ensure ranks are sequential (AI might skip numbers)
  ranked.sort((a, b) => a.rank - b.rank);
  ranked.forEach((item, i) => { item.rank = i + 1; });

  return ranked;
}

function clampScore(score: number | undefined): number {
  if (typeof score !== 'number' || isNaN(score)) return 5;
  return Math.min(10, Math.max(1, Math.round(score)));
}

// ── Formula-based fallback (used when AI synthesis fails) ──

function scoreUrgency(item: BriefingItemCandidate): number {
  let score = 5;
  if (item.raw_urgency) score = item.raw_urgency;
  if (item.item_type === 'calendar_event') score = Math.max(score, 8);
  if (item.item_type === 'commitment') score = Math.max(score, 7);
  if (item.section === 'priorities') score = Math.max(score, 7);
  if (item.sentiment === 'urgent') score += 2;
  if (item.sentiment === 'negative') score += 1;
  // Yesterday items are lower urgency
  if (item.section === 'yesterday_completed' || item.section === 'yesterday_carried_over') score = Math.max(3, score - 2);
  return Math.min(10, Math.max(1, score));
}

function scoreImportance(item: BriefingItemCandidate, ctx: UserContext): number {
  let score = 5;
  if (item.from_email && ctx.vipEmails.includes(item.from_email)) score += 3;
  if (ctx.activeProjects.some(p =>
    item.title?.toLowerCase().includes(p.toLowerCase()) ||
    item.summary?.toLowerCase().includes(p.toLowerCase())
  )) score += 2;
  return Math.min(10, Math.max(1, score));
}

function scoreRisk(item: BriefingItemCandidate): number {
  let score = 3;
  if (item.item_type === 'commitment') score += 4;
  if (item.item_type === 'relationship_alert') score += 3;
  if (item.section === 'yesterday_carried_over') score += 2;
  if (item.sentiment === 'negative') score += 2;
  if (item.sentiment === 'urgent') score += 1;
  return Math.min(10, Math.max(1, score));
}

function fallbackPrioritise(
  candidates: BriefingItemCandidate[],
  ctx: UserContext,
): RankedBriefingItem[] {
  const scored = candidates.map(item => {
    const urgency = scoreUrgency(item);
    const importance = scoreImportance(item, ctx);
    const risk = scoreRisk(item);
    // Effort inverted: low-effort items get higher boost (quick wins surface)
    const effortRaw = item.item_type === 'relationship_alert' ? 8
      : item.item_type === 'email' ? 7
      : item.item_type === 'commitment' ? 5
      : item.item_type === 'calendar_event' ? 4
      : 5;
    const effortInverted = 11 - effortRaw;

    const composite =
      urgency * 0.30 +
      importance * 0.25 +
      risk * 0.35 +
      effortInverted * 0.10;

    return {
      ...item,
      urgency_score: urgency,
      importance_score: importance,
      risk_score: risk,
      composite_score: Math.round(composite * 10) / 10,
      rank: 0,
      reasoning: '',
    };
  });

  scored.sort((a, b) => b.composite_score - a.composite_score);
  scored.forEach((item, i) => {
    item.rank = i + 1;
    item.reasoning = `Ranked #${i + 1} based on composite score of ${item.composite_score.toFixed(1)}`;
  });

  return scored.slice(0, 25);
}

// Keep the old function name as a compatibility alias that uses fallback scoring
export async function prioritiseItems(
  candidates: BriefingItemCandidate[],
  userContext: UserContext
): Promise<RankedBriefingItem[]> {
  return fallbackPrioritise(candidates, userContext);
}

// ── Candidate mapping functions (unchanged) ──

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

export function mapTaskToCandidate(task: Task): BriefingItemCandidate {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = task.implied_deadline ? new Date(task.implied_deadline) : null;
  const isOverdue = deadline ? deadline < today : false;
  const isDueToday = deadline
    ? deadline >= today && deadline < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    : false;

  // Overdue = highest urgency, due today = very high, explicit deadline = high
  let urgency = 7;
  if (isOverdue) urgency = 10;
  else if (isDueToday) urgency = 9;
  else if (task.explicit_deadline) urgency = 9;

  let summary = `Promised to ${task.recipient_name ?? task.recipient_email}`;
  if (isOverdue && deadline) {
    const daysOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
    summary = `OVERDUE by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} — promised to ${task.recipient_name ?? task.recipient_email}`;
  } else if (isDueToday) {
    summary = `DUE TODAY — promised to ${task.recipient_name ?? task.recipient_email}`;
  }

  let actionSuggestion = 'Follow up';
  if (isOverdue) {
    actionSuggestion = 'Urgent: fulfill this overdue task now';
  } else if (isDueToday) {
    actionSuggestion = 'Due today — complete before end of day';
  } else if (task.implied_deadline) {
    actionSuggestion = `Due: ${new Date(task.implied_deadline).toLocaleDateString()}`;
  }

  return {
    item_type: 'commitment',
    section: 'commitment_queue',
    title: task.task_text,
    summary,
    source_ref: task.source_ref,
    action_suggestion: actionSuggestion,
    from_email: task.recipient_email,
    raw_urgency: urgency,
    sentiment: isOverdue ? 'urgent' : isDueToday ? 'urgent' : undefined,
  };
}

/** @deprecated Use mapTaskToCandidate instead */
export const mapCommitmentToCandidate = mapTaskToCandidate;

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

export function mapDecliningContactToCandidate(contact: Contact): BriefingItemCandidate {
  const history = contact.score_history ?? [];
  const prevScore = history.length >= 2 ? history[1].score : null;
  const currentScore = history.length >= 1 ? history[0].score : contact.relationship_score;
  const drop = prevScore !== null && currentScore !== null ? prevScore - currentScore : 0;

  return {
    item_type: 'relationship_alert',
    section: 'priorities',
    title: `${contact.name ?? contact.email} — relationship declining`,
    summary: `Score dropped ${drop} points${contact.is_vip ? ' (VIP)' : ''}. Consider reaching out.`,
    source_ref: {
      provider: contact.last_interaction_channel ?? 'gmail',
      message_id: contact.id,
      excerpt: `Score: ${currentScore} (was ${prevScore}). Last interaction: ${contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString() : 'unknown'}`,
    },
    action_suggestion: 'Send a quick check-in to reverse the trend',
    from_email: contact.email,
    raw_urgency: contact.is_vip ? 8 : 6,
  };
}

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

export function mapDesktopObservationToCandidate(
  chunk: ContextChunk,
  vipEmails: string[] = []
): BriefingItemCandidate {
  const sourceRef = chunk.source_ref as Record<string, unknown>;
  const app = (sourceRef.app as string) ?? 'Desktop';
  const activityType = (sourceRef.activity_type as string) ?? 'unknown';
  const capturedAt = (sourceRef.captured_at as string) ?? chunk.occurred_at;

  const hasVip = chunk.people.some((p) => vipEmails.includes(p));

  let section: BriefingItemSection = 'priority_inbox';
  if (hasVip) {
    section = 'vip_inbox';
  } else if (chunk.importance === 'critical' || chunk.importance === 'important') {
    section = 'action_required';
  }

  const itemType: BriefingItemType = activityType === 'communicating' ? 'email' : activityType === 'coding' ? 'document' : activityType === 'planning' ? 'task' : 'document';

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
