import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
import type { UserRoutine } from '@/lib/db/types';

const anthropic = new Anthropic();

interface RoutineContext {
  todayDate: string;
  todayNarrative?: string | null;
  recentSessions?: Array<{ app: string; duration_minutes: number; summary?: string }>;
}

export async function generateRoutineOutput(
  routine: UserRoutine,
  context: RoutineContext
): Promise<{ content: string; model: string; durationMs: number }> {
  const startedAt = Date.now();

  const { content: sanitisedInstructions } = sanitiseContent(
    routine.instructions,
    `routine:${routine.id}`
  );

  const narrativeText = context.todayNarrative
    ? sanitiseContent(context.todayNarrative, `day_narrative:${routine.user_id}`).content
    : null;

  const contextLines: string[] = [
    `Today's date: ${context.todayDate}`,
  ];

  if (narrativeText) {
    contextLines.push(`\nDay narrative:\n${narrativeText}`);
  }

  if (context.recentSessions && context.recentSessions.length > 0) {
    const sessionLines = context.recentSessions.map(s => {
      const summaryText = s.summary
        ? sanitiseContent(s.summary, `activity_session:${s.app}`).content
        : null;
      return `- ${s.app}: ${s.duration_minutes} min${summaryText ? ` — ${summaryText}` : ''}`;
    });
    contextLines.push(`\nRecent activity sessions:\n${sessionLines.join('\n')}`);
  }

  const contextBlock = contextLines.filter(Boolean).join('\n');

  const systemPrompt = `You are Donna, a personal intelligence assistant. You generate scheduled routine reports for the user.

The user has configured this routine:
- Name: ${routine.name}
- Type: ${routine.routine_type.replace(/_/g, ' ')}
- Frequency: ${routine.frequency}

User's custom instructions:
${sanitisedInstructions || '(No custom instructions provided — use sensible defaults for this routine type.)'}

Generate a well-structured, insightful response based on the context provided. Use markdown formatting. Be concise and actionable. Do not make up facts — only use information from the context provided.`;

  const userPrompt = contextBlock || `Generate a ${routine.routine_type.replace(/_/g, ' ')} routine report for the user.`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.STANDARD,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let content = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      content = block.text;
      break;
    }
  }

  return {
    content,
    model: AI_MODELS.STANDARD,
    durationMs: Date.now() - startedAt,
  };
}
