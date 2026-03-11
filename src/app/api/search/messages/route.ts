import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { createServiceClient } from '@/lib/db/client';

/**
 * GET /api/search/messages?q=<query>
 *
 * Full-text (ilike) search across chat_messages.content for the authenticated user.
 * Returns one result per conversation (the most recent matching message), with a
 * contextual snippet highlighting the matched term.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const url = new URL(req.url);
  const query = url.searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const supabase = createServiceClient();

    // Fetch recent matching messages joined to their conversation for ownership check.
    // Service client bypasses RLS so we filter by user_id explicitly in the join.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chat_messages')
      .select(`
        id,
        content,
        role,
        created_at,
        conversation_id,
        chat_conversations!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('chat_conversations.user_id', req.user.id)
      .ilike('content', `%${query}%`)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json([]);
    }

    // Build snippets and deduplicate — keep one result per conversation
    type MsgRow = {
      id: string;
      content: string;
      role: string;
      created_at: string;
      conversation_id: string;
      chat_conversations: { id: string; title: string | null; user_id: string };
    };

    const byConversation = new Map<string, {
      messageId: string;
      conversationId: string;
      conversationTitle: string;
      snippet: string;
      role: string;
      createdAt: string;
    }>();

    for (const msg of (data ?? []) as MsgRow[]) {
      if (byConversation.has(msg.conversation_id)) continue;

      const content = msg.content ?? '';
      const idx = content.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, idx - 50);
      const end = Math.min(content.length, idx + query.length + 110);
      const snippet =
        (start > 0 ? '…' : '') +
        content.slice(start, end).replace(/\n+/g, ' ') +
        (end < content.length ? '…' : '');

      byConversation.set(msg.conversation_id, {
        messageId: msg.id,
        conversationId: msg.conversation_id,
        conversationTitle: msg.chat_conversations?.title ?? 'Conversation',
        snippet: snippet.trim(),
        role: msg.role,
        createdAt: msg.created_at,
      });

      if (byConversation.size >= 5) break;
    }

    return NextResponse.json(Array.from(byConversation.values()));
  } catch {
    return NextResponse.json([]);
  }
});
