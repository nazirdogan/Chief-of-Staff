'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import type { ChatMessageData } from './ChatMessage';
import DonnaThinkingIndicator from './DonnaThinkingIndicator';

interface ChatMessageListProps {
  messages: ChatMessageData[];
  isLoading: boolean;
}

export default function ChatMessageList({
  messages,
  isLoading,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <DonnaThinkingIndicator />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

    </div>
  );
}
