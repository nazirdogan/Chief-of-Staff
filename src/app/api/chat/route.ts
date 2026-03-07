import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { AI_MODELS } from '@/lib/ai/models';
import { buildContextAwareSystemPrompt } from '@/lib/ai/prompts/chat';
import { CHAT_TOOL_DEFINITIONS, executeChatTool } from '@/lib/ai/tools/chat-tools';
import { createServiceClient } from '@/lib/db/client';
import { getWorkingPatterns } from '@/lib/db/queries/context';
import { queryContext } from '@/lib/context/query-engine';

const MAX_TOOL_ROUNDS = 5;
const PROACTIVE_CONTEXT_COUNT = 5;

export const POST = withAuth(withRateLimit(20, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { messages } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic();
    const userId = req.user.id;
    const supabase = createServiceClient();

    // Pre-fetch working patterns for context-aware system prompt
    const patterns = await getWorkingPatterns(supabase, userId);

    // Proactive context injection: fetch relevant context based on user's last message
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    let recentContext: Array<{ title?: string | null; content_summary: string; provider: string }> = [];

    if (lastUserMessage) {
      try {
        const contextResult = await queryContext({
          userId,
          query: lastUserMessage.content,
          limit: PROACTIVE_CONTEXT_COUNT,
        });
        recentContext = contextResult.chunks.map((c) => ({
          title: c.title,
          content_summary: c.content_summary,
          provider: c.provider,
        }));
      } catch {
        // Non-fatal: continue without proactive context
      }
    }

    const systemPrompt = buildContextAwareSystemPrompt(patterns, recentContext);

    // Build the conversation messages for Anthropic
    let anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Agentic loop: call the model, execute tools, repeat until we get a final text response
    let finalText = '';
    let toolRound = 0;

    // Use higher max_tokens when context tools are available (richer answers)
    const maxTokens = 4096;

    while (toolRound < MAX_TOOL_ROUNDS) {
      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: CHAT_TOOL_DEFINITIONS,
        messages: anthropicMessages,
      });

      // Check if the model wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
      );

      if (toolUseBlocks.length === 0) {
        // No tools — we have our final answer
        finalText = textBlocks.map((b) => b.text).join('\n');
        break;
      }

      // Execute all tool calls
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        try {
          const result = await executeChatTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            userId
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' }),
            is_error: true,
          });
        }
      }

      // Add assistant response + tool results to conversation
      anthropicMessages = [
        ...anthropicMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];

      // Collect any text the model produced alongside tool calls
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b) => b.text).join('\n');
      }

      toolRound++;
    }

    // If we exhausted tool rounds, use whatever text we have
    if (toolRound >= MAX_TOOL_ROUNDS && !finalText) {
      finalText = 'I ran into a loop trying to gather that information. Could you try rephrasing your question?';
    }

    return NextResponse.json({
      response: finalText,
      model: AI_MODELS.STANDARD,
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
