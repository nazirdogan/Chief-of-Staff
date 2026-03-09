'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chat-store';
import ChatGreeting from './ChatGreeting';
import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';

interface ChatPageProps {
  conversationId?: string;
}

const c = {
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.07)',
};

export default function ChatPage({ conversationId }: ChatPageProps) {
  const router = useRouter();
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const historyLoading = useChatStore((s) => s.historyLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  // Track whether we've already navigated to avoid duplicate pushes
  const navigatedRef = useRef<string | null>(null);

  // Load an existing conversation when the page mounts with a conversationId
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      startNewConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // After sending the first message the store creates a conversation and sets
  // currentConversationId. Mirror that into the URL without a full navigation.
  useEffect(() => {
    if (
      currentConversationId &&
      !conversationId &&
      navigatedRef.current !== currentConversationId
    ) {
      navigatedRef.current = currentConversationId;
      router.replace(`/chat/${currentConversationId}`);
    }
  }, [currentConversationId, conversationId, router]);

  const hasMessages = messages.length > 0;

  const handleClear = () => {
    startNewConversation();
    router.replace('/chat');
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${c.border}` }}
      >
        <h1
          className="text-[20px] font-semibold"
          style={{ color: c.text }}
        >
          Ask Donna
        </h1>
        {hasMessages && (
          <button
            onClick={handleClear}
            className="rounded-md px-3 py-1.5 text-[13px] transition-opacity hover:opacity-80"
            style={{ color: c.textMuted }}
          >
            New Chat
          </button>
        )}
      </div>

      {/* Message area */}
      {historyLoading ? (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {[70, 90, 55].map((w, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="h-10 rounded-xl animate-pulse"
                  style={{
                    width: `${w}%`,
                    background: i % 2 === 0
                      ? 'rgba(232,132,92,0.12)'
                      : 'rgba(255,255,255,0.06)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : hasMessages ? (
        <ChatMessageList messages={messages} isLoading={isLoading} />
      ) : (
        <ChatGreeting onSelectPrompt={sendMessage} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
