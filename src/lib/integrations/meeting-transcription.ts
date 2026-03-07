import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import { processContextFromScan } from '@/lib/context/pipeline';
import { createServiceClient } from '@/lib/db/client';

const anthropic = new Anthropic();

export interface MeetingTranscript {
  source: 'otter' | 'google_meet' | 'zoom' | 'manual';
  meetingTitle: string;
  startTime: string;
  endTime?: string;
  attendees: string[];
  transcript: string;
  calendarEventId?: string;
}

export interface ProcessedTranscript {
  summary: string;
  key_decisions: Array<{ decision: string; context: string }>;
  action_items: Array<{ assignee: string; task: string; deadline?: string }>;
  topics_discussed: string[];
  open_questions: string[];
}

async function extractTranscriptInsights(
  transcript: string,
  meetingTitle: string
): Promise<ProcessedTranscript> {
  const { content: safeTranscript } = sanitiseContent(transcript, `transcript:${meetingTitle}`);

  const context = buildSafeAIContext(
    `You are analyzing a meeting transcript. Extract structured insights.

Return JSON only:
{
  "summary": "<5-10 sentence meeting summary>",
  "key_decisions": [{"decision": "...", "context": "..."}],
  "action_items": [{"assignee": "...", "task": "...", "deadline": "..."}],
  "topics_discussed": ["..."],
  "open_questions": ["..."]
}`,
    [{ label: 'meeting_transcript', content: safeTranscript.slice(0, 30000), source: `transcript:${meetingTitle}` }]
  );

  // Use Haiku for extraction pass
  const extractionResponse = await anthropic.messages.create({
    model: AI_MODELS.FAST,
    max_tokens: 1000,
    messages: [{ role: 'user', content: context }],
  });

  const extractionText = extractionResponse.content.find((c) => c.type === 'text');
  let extraction: Partial<ProcessedTranscript> = {};

  if (extractionText && extractionText.type === 'text') {
    try {
      const cleaned = extractionText.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      extraction = JSON.parse(cleaned);
    } catch {
      // fallthrough
    }
  }

  // Use Sonnet for the summary (higher quality synthesis)
  const summaryResponse = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 600,
    system: 'Write a concise 5-10 sentence meeting summary. Be specific about decisions, action items, and outcomes. Reference who said what when relevant.',
    messages: [
      { role: 'user', content: `Meeting: ${meetingTitle}\n\nTranscript excerpt:\n${safeTranscript.slice(0, 15000)}` },
    ],
  });

  const summaryText = summaryResponse.content.find((c) => c.type === 'text');

  return {
    summary: (summaryText && summaryText.type === 'text' ? summaryText.text : extraction.summary) ?? 'Summary generation failed.',
    key_decisions: Array.isArray(extraction.key_decisions) ? extraction.key_decisions : [],
    action_items: Array.isArray(extraction.action_items) ? extraction.action_items : [],
    topics_discussed: Array.isArray(extraction.topics_discussed) ? extraction.topics_discussed : [],
    open_questions: Array.isArray(extraction.open_questions) ? extraction.open_questions : [],
  };
}

export async function processMeetingTranscript(
  userId: string,
  transcript: MeetingTranscript
): Promise<ProcessedTranscript> {
  // Extract insights from the transcript
  const insights = await extractTranscriptInsights(
    transcript.transcript,
    transcript.meetingTitle
  );

  // Store as context chunk via the pipeline
  const contextContent = [
    `Meeting: ${transcript.meetingTitle}`,
    `Summary: ${insights.summary}`,
    insights.key_decisions.length > 0
      ? `Decisions: ${insights.key_decisions.map((d) => d.decision).join('; ')}`
      : '',
    insights.action_items.length > 0
      ? `Action items: ${insights.action_items.map((a) => `${a.assignee}: ${a.task}`).join('; ')}`
      : '',
    insights.topics_discussed.length > 0
      ? `Topics: ${insights.topics_discussed.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  await processContextFromScan({
    userId,
    provider: transcript.source,
    items: [
      {
        sourceId: transcript.calendarEventId ?? `transcript-${Date.now()}`,
        sourceRef: {
          provider: transcript.source,
          meeting_title: transcript.meetingTitle,
          calendar_event_id: transcript.calendarEventId,
          start_time: transcript.startTime,
        },
        title: transcript.meetingTitle,
        rawContent: contextContent,
        occurredAt: transcript.startTime,
        people: transcript.attendees,
        chunkType: 'calendar_event',
      },
    ],
  });

  // Update contact interactions for all attendees
  const supabase = createServiceClient();
  for (const attendeeEmail of transcript.attendees) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contact } = await (supabase as any)
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', attendeeEmail)
      .single();

    if (contact) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('contact_interactions').insert({
        user_id: userId,
        contact_id: contact.id,
        direction: 'inbound',
        channel: 'meeting',
        message_ref: {
          meeting_title: transcript.meetingTitle,
          source: transcript.source,
          calendar_event_id: transcript.calendarEventId,
        },
        subject: transcript.meetingTitle,
        interacted_at: transcript.startTime,
      });
    }
  }

  return insights;
}
