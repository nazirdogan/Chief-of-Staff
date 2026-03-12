import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ChatConversation, ChatMessage } from '../types';

type Client = SupabaseClient<Database>;

export async function listConversations(
  supabase: Client,
  userId: string
): Promise<ChatConversation[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('chat_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as ChatConversation[];
}

export async function getConversation(
  supabase: Client,
  conversationId: string,
  userId: string
): Promise<(ChatConversation & { messages: ChatMessage[] }) | null> {
  const { data: conversation, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!conversation) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, error: messagesError } = await (supabase as any)
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) throw messagesError;

  return {
    ...(conversation as ChatConversation),
    messages: (messages ?? []) as ChatMessage[],
  };
}

export async function createConversation(
  supabase: Client,
  userId: string,
  title?: string,
  options?: {
    is_donna_initiated?: boolean;
    trigger_source?: string;
  },
): Promise<ChatConversation> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('chat_conversations')
    .insert({
      user_id: userId,
      title: title ?? null,
      ...(options?.is_donna_initiated !== undefined
        ? { is_donna_initiated: options.is_donna_initiated }
        : {}),
      ...(options?.trigger_source !== undefined
        ? { trigger_source: options.trigger_source }
        : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatConversation;
}

export async function addMessage(
  supabase: Client,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('chat_messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single();

  if (error) throw error;

  // Bump the conversation's updated_at so it surfaces at the top of the sidebar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as ChatMessage;
}

export async function updateConversationTitle(
  supabase: Client,
  conversationId: string,
  title: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('chat_conversations')
    .update({ title })
    .eq('id', conversationId);

  if (error) throw error;
}

export async function updateConversation(
  supabase: Client,
  conversationId: string,
  userId: string,
  updates: { title?: string; is_favorite?: boolean; handled_at?: string | null }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteConversation(
  supabase: Client,
  conversationId: string,
  userId: string
): Promise<void> {
  // Hard delete — cascades to chat_messages via FK constraint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}
