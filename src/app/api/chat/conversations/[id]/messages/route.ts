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
import {
  getConversation,
  addMessage,
  updateConversationTitle,
} from '@/lib/db/queries/chat';

const MAX_TOOL_ROUNDS = 5;
const PROACTIVE_CONTEXT_COUNT = 5;

export const POST = withAuth(withRateLimit(20, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const conversationId = segments[segments.indexOf('conversations') + 1];

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content } = body as { content: string };

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const userId = req.user.id;
    const supabase = createServiceClient();

    // Verify the conversation belongs to this user
    const conversation = await getConversation(supabase, conversationId, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Persist the user's message
    const userMessage = await addMessage(supabase, conversationId, 'user', content.trim());

    // Auto-generate title from the first user message if the conversation has no title yet
    const isFirstMessage = conversation.messages.length === 0;
    if (isFirstMessage && !conversation.title) {
      const autoTitle = content.trim().slice(0, 60);
      await updateConversationTitle(supabase, conversationId, autoTitle);
    }

    // Build the full message history for the AI (all previous messages + new one)
    const allMessages = [
      ...conversation.messages,
      { role: 'user' as const, content: content.trim() },
    ];

    // Pre-fetch working patterns for context-aware system prompt
    const patterns = await getWorkingPatterns(supabase, userId);

    // Proactive context injection based on the user's latest message
    let recentContext: Array<{ title?: string | null; content_summary: string; provider: string }> = [];
    try {
      const contextResult = await queryContext({
        userId,
        query: content.trim(),
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

    const systemPrompt = buildContextAwareSystemPrompt(patterns, recentContext);

    const anthropic = new Anthropic();

    let anthropicMessages: Anthropic.Messages.MessageParam[] = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Agentic loop: call the model, execute tools, repeat until we get a final text response
    let finalText = '';
    let toolRound = 0;

    while (toolRound < MAX_TOOL_ROUNDS) {
      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 4096,
        system: systemPrompt,
        tools: CHAT_TOOL_DEFINITIONS,
        messages: anthropicMessages,
      });

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

      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b) => b.text).join('\n');
      }

      toolRound++;
    }

    if (toolRound >= MAX_TOOL_ROUNDS && !finalText) {
      finalText = 'I ran into a loop trying to gather that information. Could you try rephrasing your question?';
    }

    // Persist the assistant's response
    const assistantMessage = await addMessage(supabase, conversationId, 'assistant', finalText);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      model: AI_MODELS.STANDARD,
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
