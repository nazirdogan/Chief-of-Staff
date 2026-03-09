/**
 * Session Summariser — periodically summarises the active session's text buffer
 * using the AI extraction pipeline. Runs in the background after ingest.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, redactPII } from '@/lib/ai/safety/sanitise';
import { getSessionTextBuffer, updateSessionSummary } from './session-manager';

const anthropic = new Anthropic();

/** Minimum text buffer size before triggering summarisation */
const MIN_BUFFER_SIZE = 3;

const SESSION_SUMMARY_PROMPT = `You are an activity summariser for a desktop observer. Given screen content captured from the user's current activity session, produce:

1. A concise 1-3 sentence summary of what the user is doing
2. Importance level (critical, important, background, noise)
3. Importance score (1-10)
4. Topics (lowercase slugs)
5. Projects mentioned

Rules:
- Focus on WHAT the user is doing and WHY it matters
- Be specific: mention names, subjects, projects when visible
- "critical" = user needs to act urgently (deadline, VIP message)
- "important" = meaningful work activity (code review, email to client)
- "background" = general browsing, ambient activity
- "noise" = idle, screensaver, system UI

Return JSON only:
{
  "summary": "<1-3 sentences>",
  "importance": "critical|important|background|noise",
  "importance_score": <1-10>,
  "topics": ["lowercase-slug"],
  "projects": ["project-name"]
}`;

/**
 * Summarise the active session's accumulated text buffer.
 * Only runs if the buffer has enough content.
 */
export async function summariseActiveSession(userId: string): Promise<void> {
  const buffer = getSessionTextBuffer(userId);
  if (buffer.length < MIN_BUFFER_SIZE) return;

  const combinedText = buffer.join('\n---\n').slice(0, 3000);
  const redactedText = redactPII(combinedText);
  const { content: safeContent } = sanitiseContent(redactedText, `session:${userId}`);

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `${SESSION_SUMMARY_PROMPT}\n\n--- SCREEN CONTENT ---\n${safeContent}`,
        },
      ],
    });

    const textBlock = response.content.find(c => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return;

    const cleaned = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    await updateSessionSummary(
      userId,
      parsed.summary || 'Activity in progress.',
      {
        level: parsed.importance || 'background',
        score: Math.min(10, Math.max(1, parsed.importance_score || 5)),
      },
      Array.isArray(parsed.topics) ? parsed.topics : [],
      Array.isArray(parsed.projects) ? parsed.projects : []
    );
  } catch (err) {
    console.error(
      '[session-summariser] Failed:',
      err instanceof Error ? err.message : 'unknown'
    );
  }
}
