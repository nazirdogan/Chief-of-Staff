import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { CHAT_TOOL_DEFINITIONS } from '@/lib/ai/tools/chat-tools';

// ── Intent Categories ──────────────────────────────────────────────────
export type QueryIntent =
  | 'briefing_query'
  | 'task_query'
  | 'relationship_query'
  | 'screen_context_query'
  | 'meeting_prep_query'
  | 'calendar_query'
  | 'inbox_query'
  | 'deep_research'
  | 'reflection_query'
  | 'general';

// ── Route Configuration ────────────────────────────────────────────────
export interface AgentRoute {
  intent: QueryIntent;
  confidence: number;
  model: string;
  tools: Anthropic.Messages.Tool[];
  systemPromptAddendum: string;
  contextStrategy: ContextStrategy;
  maxToolRounds: number;
}

export type ContextStrategy =
  | 'briefing'        // Load today's briefing context
  | 'tasks'           // Load task records + related interactions
  | 'relationships'   // Load contact data + interaction history
  | 'screen_context'  // Load desktop observer snapshot + recent sessions
  | 'meeting_prep'    // Load calendar event + attendee context + related docs
  | 'calendar'        // Load calendar events
  | 'inbox'           // Load inbox items
  | 'deep_research'   // Load broad semantic search results
  | 'reflection'      // Load patterns + snapshots + history
  | 'general';        // Default proactive context search

// ── Tool subsets by intent ─────────────────────────────────────────────
const ALL_TOOL_NAMES = CHAT_TOOL_DEFINITIONS.map(t => t.name);

const TOOL_SETS: Record<QueryIntent, string[]> = {
  briefing_query: [
    'get_briefing', 'give_briefing_feedback', 'search_memory',
  ],
  task_query: [
    'list_tasks', 'resolve_task', 'snooze_task',
    'dismiss_task', 'search_memory', 'search_by_person',
  ],
  relationship_query: [
    'list_contacts', 'get_contact_detail', 'search_by_person',
    'search_memory', 'what_happened',
  ],
  screen_context_query: [
    'get_screen_snapshot', 'get_activity_timeline', 'get_day_summary',
    'what_happened', 'search_memory',
  ],
  meeting_prep_query: [
    'generate_meeting_prep', 'search_memory', 'search_by_person', 'get_contact_detail',
    'list_tasks', 'get_activity_timeline', 'what_happened', 'web_search',
  ],
  calendar_query: [
    'search_memory', 'get_activity_timeline', 'get_day_summary',
    'what_happened', 'create_calendar_event', 'reschedule_calendar_event',
    'suggest_meeting_time', 'set_reminder',
  ],
  inbox_query: [
    'list_inbox', 'get_inbox_item', 'draft_reply', 'compose_email',
    'list_pending_actions', 'search_memory', 'web_search',
  ],
  deep_research: ALL_TOOL_NAMES,
  reflection_query: [
    'get_working_patterns', 'get_day_summary', 'what_happened',
    'search_memory', 'list_tasks', 'list_contacts', 'generate_report',
  ],
  general: ALL_TOOL_NAMES,
};

// ── System prompt addenda per intent ───────────────────────────────────
const INTENT_PROMPTS: Record<QueryIntent, string> = {
  briefing_query: `
## Specialist Mode: Briefing
You are answering a question about the user's daily briefing. Focus on what matters today — priorities, deadlines, and action items. Lead with the most important item. If the briefing hasn't been generated yet, say so and offer to summarize what you know.`,

  task_query: `
## Specialist Mode: Tasks
You are answering about the user's tasks — promises they made or requests they received. Always include:
- Who the task is to/from
- The source (email, meeting, message) with a natural reference
- Any deadline (explicit or inferred)
- Current status
When searching, check both task records AND raw context for promises that may not have been extracted yet.`,

  relationship_query: `
## Specialist Mode: Relationships
You are answering about the user's contacts and relationships. Provide relationship context:
- VIP status, relationship score, interaction frequency
- Last interaction and channel
- Whether the relationship is going cold
- Key shared projects or topics
Be conversational — "You last spoke with Sarah 12 days ago on WhatsApp about the Q2 plan" not "contact_id: 123, last_interaction_at: 2026-03-01".`,

  screen_context_query: `
## Specialist Mode: Screen Context
You are answering about what the user is currently doing or recently did on their screen.
IMPORTANT: For questions about "right now" or "what's on my screen", ALWAYS call get_screen_snapshot FIRST to get a live view of their current screen state. Pass the user's question to get a focused answer.
For questions about recent activity over time, use get_activity_timeline or what_happened.
Be specific — reference actual app names, file names, URLs, page headings, OCR text, and conversation content you see.`,

  meeting_prep_query: `
## Specialist Mode: Meeting Prep
You are preparing the user for an upcoming meeting. Build a comprehensive brief:
1. Meeting details (time, attendees, agenda if available)
2. Recent interactions with each attendee
3. Open commitments involving attendees
4. Relevant project context
5. Suggested talking points
6. Any unresolved threads that might come up
Search broadly — check emails, messages, commitments, and calendar context for each attendee.`,

  calendar_query: `
## Specialist Mode: Calendar
You are answering about the user's schedule and calendar events. Be precise about times and attendees. If asking about availability, check for gaps. Mention prep time needed for important meetings.`,

  inbox_query: `
## Specialist Mode: Inbox
You are helping the user manage their inbox. Prioritize by urgency and importance. For draft replies, match the user's communication style. Always mention the sender and a brief subject context so the user knows exactly which message you're referring to.`,

  deep_research: `
## Specialist Mode: Deep Research
The user is asking a complex question that requires searching across multiple data sources. Take your time — use multiple tools, cross-reference results, and synthesize a thorough answer. Don't rush to respond with partial information.`,

  reflection_query: `
## Specialist Mode: Reflection
You are helping the user reflect on their work patterns, progress, or habits. Draw from working patterns, day summaries, commitment history, and relationship data. Be insightful — identify trends, highlight wins, flag concerns. This is where you add the most value by connecting dots the user might miss.`,

  general: '',
};

// ── Classification prompt ──────────────────────────────────────────────
const CLASSIFICATION_PROMPT = `You are a query intent classifier for Donna, an AI personal intelligence assistant. Classify the user's query into exactly one intent category.

Categories:
- briefing_query: Questions about today's briefing, priorities, "what matters today", "what should I focus on"
- task_query: Questions about promises, tasks, "what did I promise", "what's overdue", resolving/snoozing tasks
- relationship_query: Questions about people, contacts, "how's my relationship with", "who haven't I talked to", VIP contacts, going cold
- screen_context_query: Questions about current screen activity, "what am I working on", "what app am I in", recent desktop activity
- meeting_prep_query: Questions like "prep me for", "brief me on my call with", "what should I know before my meeting"
- calendar_query: Questions about schedule, meetings, availability, "what's on my calendar", "when is my next meeting"
- inbox_query: Questions about emails, messages in inbox, "any important emails", "draft a reply", inbox management
- deep_research: Complex multi-source questions like "summarize everything about project X", "what's the full history of", questions needing extensive search
- reflection_query: Questions about patterns, habits, "how am I doing", "what did I accomplish this week", weekly/monthly reviews
- general: Casual conversation, greetings, questions that don't fit other categories, meta questions about Donna

Respond with ONLY a JSON object: {"intent": "<category>", "confidence": <0.0-1.0>}
No explanation. No markdown. Just the JSON.`;

// ── Fast-path: detect trivially conversational messages without an API call ──
// Greetings, acknowledgements, and short conversational phrases don't need
// classification or context loading — skip straight to a lightweight general route.
const TRIVIAL_PATTERN = /^(hi|hello|hey|thanks|thank you|thx|ok|okay|sure|yes|no|nope|yep|yup|bye|good morning|good afternoon|good evening|what's up|whats up|how are you|how's it going|yo|sup|great|cool|nice|perfect|got it|sounds good|makes sense|alright)\b[!?.]*$/i;

function isTrivialConversational(msg: string): boolean {
  return msg.trim().length <= 60 && TRIVIAL_PATTERN.test(msg.trim());
}

// ── Router function ────────────────────────────────────────────────────
export async function routeQuery(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<AgentRoute> {
  // Fast-path: skip classification API call for trivial conversational messages
  if (isTrivialConversational(userMessage)) {
    return buildRoute('general', 1.0);
  }

  // Build classification context from recent conversation
  const recentContext = conversationHistory
    .slice(-4)
    .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
    .join('\n');

  const classificationInput = recentContext
    ? `Recent conversation:\n${recentContext}\n\nLatest message: ${userMessage}`
    : userMessage;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 100,
      system: CLASSIFICATION_PROMPT,
      messages: [{ role: 'user', content: classificationInput }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const parsed = JSON.parse(text) as { intent: QueryIntent; confidence: number };

    // Validate the intent is a known category
    if (!TOOL_SETS[parsed.intent]) {
      return buildRoute('general', 0.5);
    }

    return buildRoute(parsed.intent, parsed.confidence);
  } catch {
    // Classification failed — fall back to general with all tools
    return buildRoute('general', 0.5);
  }
}

// ── Build a route config from an intent ────────────────────────────────
function buildRoute(intent: QueryIntent, confidence: number): AgentRoute {
  const toolNames = TOOL_SETS[intent];
  const tools = CHAT_TOOL_DEFINITIONS.filter(t => toolNames.includes(t.name));

  // Model selection:
  // - screen_context_query and general use FAST (Haiku) for speed
  // - deep_research and meeting_prep use STANDARD (Sonnet) with more tool rounds
  // - everything else uses STANDARD
  const model = (intent === 'screen_context_query' || intent === 'general')
    ? AI_MODELS.FAST
    : AI_MODELS.STANDARD;

  const maxToolRounds = (intent === 'deep_research' || intent === 'meeting_prep_query')
    ? 8
    : 5;

  return {
    intent,
    confidence,
    model,
    tools,
    systemPromptAddendum: INTENT_PROMPTS[intent],
    contextStrategy: intentToContextStrategy(intent),
    maxToolRounds,
  };
}

function intentToContextStrategy(intent: QueryIntent): ContextStrategy {
  const map: Record<QueryIntent, ContextStrategy> = {
    briefing_query: 'briefing',
    task_query: 'tasks',
    relationship_query: 'relationships',
    screen_context_query: 'screen_context',
    meeting_prep_query: 'meeting_prep',
    calendar_query: 'calendar',
    inbox_query: 'inbox',
    deep_research: 'deep_research',
    reflection_query: 'reflection',
    general: 'general',
  };
  return map[intent];
}
