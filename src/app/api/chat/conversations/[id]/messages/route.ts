import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { AI_MODELS } from '@/lib/ai/models';
import { buildContextAwareSystemPrompt } from '@/lib/ai/prompts/chat';
import { CHAT_TOOL_DEFINITIONS, executeChatTool } from '@/lib/ai/tools/chat-tools';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';
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

    // Accept both JSON (no files) and multipart/form-data (with files)
    const contentType = req.headers.get('content-type') ?? '';
    let content = '';
    let attachedFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      content = (form.get('content') as string | null) ?? '';
      attachedFiles = form.getAll('files') as File[];
    } else {
      const body = await req.json() as { content: string };
      content = body.content ?? '';
    }

    if ((!content || content.trim().length === 0) && attachedFiles.length === 0) {
      return NextResponse.json(
        { error: 'content or files are required', code: 'VALIDATION_ERROR' },
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

    // Build display content for DB (text-only summary of what was sent)
    const fileNames = attachedFiles.map((f) => f.name);
    const dbContent = [
      content.trim(),
      fileNames.length > 0 ? `📎 ${fileNames.join(', ')}` : '',
    ].filter(Boolean).join('\n\n') || '📎 ' + fileNames.join(', ');

    // Persist the user's message
    const userMessage = await addMessage(supabase, conversationId, 'user', dbContent);

    // Auto-generate title from the first user message if the conversation has no title yet
    const isFirstMessage = conversation.messages.length === 0;
    if (isFirstMessage && !conversation.title) {
      const autoTitle = (content.trim() || fileNames[0] || 'Attachment').slice(0, 60);
      await updateConversationTitle(supabase, conversationId, autoTitle);
    }

    // Build rich user content for Claude (vision blocks for images, text for others)
    type VisionMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const SUPPORTED_VISION: VisionMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const TEXT_LIKE = ['text/plain', 'text/csv', 'text/markdown', 'application/json', 'application/xml'];

    const attachmentBlocks: Anthropic.Messages.ContentBlockParam[] = [];
    for (const file of attachedFiles) {
      const mimeType = file.type || 'application/octet-stream';
      const buffer = Buffer.from(await file.arrayBuffer());

      if (SUPPORTED_VISION.includes(mimeType as VisionMediaType)) {
        attachmentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as VisionMediaType,
            data: buffer.toString('base64'),
          },
        });
      } else if (TEXT_LIKE.some((t) => mimeType.startsWith(t)) || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.md')) {
        const rawText = buffer.toString('utf-8').slice(0, 50_000); // cap at 50K chars
        const { content: safeText } = sanitiseContent(rawText, `upload:${file.name}`);
        attachmentBlocks.push({
          type: 'text',
          text: `📎 File: ${file.name}\n\`\`\`\n${safeText}\n\`\`\``,
        });
      } else {
        attachmentBlocks.push({
          type: 'text',
          text: `📎 Attached: ${file.name} (${mimeType}, ${(buffer.length / 1024).toFixed(0)} KB) — binary file, cannot read contents directly.`,
        });
      }
    }

    // Build the message history for the AI, windowed to prevent context overflow.
    // Keep the last 40 messages to stay within model context limits.
    const MAX_HISTORY = 40;
    const recentMessages = conversation.messages.length > MAX_HISTORY
      ? conversation.messages.slice(-MAX_HISTORY)
      : conversation.messages;

    // Construct the current user turn with optional attachment blocks
    const currentUserContent: Anthropic.Messages.ContentBlockParam[] = [
      ...attachmentBlocks,
      ...(content.trim() ? [{ type: 'text' as const, text: content.trim() }] : []),
    ];

    const allMessages: { role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }[] = [
      ...recentMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      {
        role: 'user' as const,
        content: currentUserContent.length === 1 && currentUserContent[0].type === 'text'
          ? (currentUserContent[0] as Anthropic.Messages.TextBlockParam).text
          : currentUserContent,
      },
    ];

    // Pre-fetch working patterns and custom instructions for context-aware system prompt
    const patterns = await getWorkingPatterns(supabase, userId);

    // Fetch custom instructions from profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (supabase as any)
      .from('profiles')
      .select('custom_instructions')
      .eq('id', userId)
      .single();
    const customInstructions: string | null = profileData?.custom_instructions ?? null;

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

    const systemPrompt = buildContextAwareSystemPrompt(patterns, recentContext, customInstructions);

    const anthropic = new Anthropic();

    let anthropicMessages: Anthropic.Messages.MessageParam[] = allMessages.map((m) => ({
      role: m.role,
      content: m.content as string | Anthropic.Messages.ContentBlockParam[],
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
          const rawResult = await executeChatTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            userId
          );
          // Sanitise tool output before feeding back into the AI prompt
          const { content: safeResult } = sanitiseContent(rawResult, `tool:${toolUse.name}`);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: safeResult,
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

      // Don't capture intermediate text as final — it may be partial reasoning
      // alongside tool calls. Only the loop-exit text block (no tool_use) is final.

      toolRound++;
    }

    if (toolRound >= MAX_TOOL_ROUNDS) {
      // If we exhausted tool rounds, make one last call without tools to get a summary
      const summaryResponse = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
      });
      const summaryText = summaryResponse.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      finalText = summaryText || 'I gathered some information but had trouble summarizing it. Could you try rephrasing your question?';
    }

    if (!finalText) {
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
