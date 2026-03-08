'use client';

import { use } from 'react';
import ChatPage from '@/components/chat/ChatPage';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ChatConversationRoute({ params }: Props) {
  const { id } = use(params);
  return <ChatPage conversationId={id} />;
}
