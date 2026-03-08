'use client';

import { useChatStore } from '@/stores/chat-store';
import ChatGreeting from './ChatGreeting';
import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';

const c = {
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.07)',
};

export default function ChatPage() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const hasMessages = messages.length > 0;

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
            onClick={clearMessages}
            className="rounded-md px-3 py-1.5 text-[13px] transition-opacity hover:opacity-80"
            style={{ color: c.textMuted }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Message area */}
      {hasMessages ? (
        <ChatMessageList messages={messages} isLoading={isLoading} />
      ) : (
        <ChatGreeting onSelectPrompt={sendMessage} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
