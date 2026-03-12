import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { createServiceClient } from '@/lib/db/client';
import {
  getContextChunksByUser,
  upsertMemorySnapshot,
} from '@/lib/db/queries/context';

const anthropic = new Anthropic();

export async function generateDailySnapshot(
  userId: string,
  date?: string
): Promise<void> {
  const supabase = createServiceClient();
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  const dayStart = `${targetDate}T00:00:00.000Z`;
  const dayEnd = `${targetDate}T23:59:59.999Z`;

  const chunks = await getContextChunksByUser(supabase, userId, {
    after: dayStart,
    before: dayEnd,
    limit: 500,
  });

  if (chunks.length === 0) {
    // Still create a minimal snapshot
    await upsertMemorySnapshot(supabase, userId, {
      snapshot_date: targetDate,
      emails_received: 0,
      emails_sent: 0,
      slack_messages: 0,
      meetings_attended: 0,
      tasks_completed: 0,
      documents_edited: 0,
      code_prs_opened: 0,
      day_narrative: 'No activity recorded today.',
      key_decisions: [],
      open_loops: [],
      notable_interactions: [],
      embedding: null,
    });
    return;
  }

  // Aggregate counts
  let emails_received = 0;
  const emails_sent = 0;
  let slack_messages = 0;
  let meetings_attended = 0;
  let tasks_completed = 0;
  let documents_edited = 0;
  let code_prs_opened = 0;

  for (const c of chunks) {
    switch (c.chunk_type) {
      case 'email_thread': emails_received++; break;
      case 'slack_conversation': slack_messages++; break;
      case 'calendar_event': meetings_attended++; break;
      case 'task_update': tasks_completed++; break;
      case 'document_edit': documents_edited++; break;
      case 'code_activity': code_prs_opened++; break;
    }
  }

  // Build context for AI
  const chunkSummaries = chunks
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    .slice(0, 50) // Cap for prompt length
    .map((c) => {
      const time = new Date(c.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `[${time}] (${c.chunk_type}, ${c.importance}) ${c.title ?? ''}: ${c.content_summary}`;
    });

  const response = await anthropic.messages.create({
    model: AI_MODELS.FAST,
    max_tokens: 1200,
    system: `You are generating a daily memory snapshot for a personal intelligence assistant. Given a chronological list of today's activity, generate a structured extraction.

Return JSON only — no markdown, no explanation:
{
  "day_narrative": "3-5 sentence flowing narrative of the day. Be SPECIFIC — use real names, project names, outcomes, and times. NOT a list. Example: 'Most of the morning was consumed by the Product Review meeting, where the team decided to push the launch to April. After that, you had a back-and-forth with Sarah about the pricing model.'",
  "key_decisions": [
    {"decision": "What was decided", "context": "Why it matters or what led to it", "source_ref": {"provider": "...", "message_id": "...", "excerpt": "..."}}
  ],
  "open_loops": [
    {"description": "Specific unresolved item — e.g. 'Unread email from David re: contract terms', 'PR #142 review requested but not started', 'Meeting with Ops team had no follow-up action assigned'"}
  ],
  "notable_interactions": [
    {"person": "Name or email", "summary": "What you discussed, decided, or what they need from you"}
  ]
}

Rules:
- key_decisions: Extract REAL decisions from the activity — approvals given, directions chosen, deadlines set, scope changes agreed. If no decisions were made, return an empty array. Never fabricate.
- open_loops: Look for emails not replied to, tasks started but not finished, meetings that ended without clear next steps, promises made without follow-through. Be specific — include the person's name and the topic.
- notable_interactions: Focus on back-and-forth conversations, not one-way notifications. Include what was discussed and any outcomes.
- Maximum 5 items per array.
- Every key_decision must have a source_ref with provider and excerpt from the input data.`,
    messages: [
      {
        role: 'user',
        content: `Today's activity (${targetDate}):\n\nActivity counts: ${emails_received} emails, ${slack_messages} Slack messages, ${meetings_attended} meetings, ${tasks_completed} tasks, ${documents_edited} docs, ${code_prs_opened} PRs\n\nChronological events:\n${chunkSummaries.join('\n')}`,
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  let day_narrative = 'Activity recorded but summary generation failed.';
  let key_decisions: Array<{ decision: string; context: string; source_ref: Record<string, unknown> }> = [];
  let open_loops: Array<{ description: string }> = [];
  let notable_interactions: Array<{ person: string; summary: string; source_ref: Record<string, unknown> }> = [];

  if (textBlock && textBlock.type === 'text') {
    try {
      const cleaned = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      day_narrative = parsed.day_narrative || day_narrative;
      key_decisions = Array.isArray(parsed.key_decisions) ? parsed.key_decisions : [];
      open_loops = Array.isArray(parsed.open_loops) ? parsed.open_loops : [];
      notable_interactions = Array.isArray(parsed.notable_interactions) ? parsed.notable_interactions : [];
    } catch {
      day_narrative = textBlock.text;
    }
  }

  // Generate embedding for semantic search across days
  const embedding = await generateEmbedding(day_narrative);

  await upsertMemorySnapshot(supabase, userId, {
    snapshot_date: targetDate,
    emails_received,
    emails_sent,
    slack_messages,
    meetings_attended,
    tasks_completed,
    documents_edited,
    code_prs_opened,
    day_narrative,
    key_decisions,
    open_loops,
    notable_interactions,
    embedding,
  });
}
