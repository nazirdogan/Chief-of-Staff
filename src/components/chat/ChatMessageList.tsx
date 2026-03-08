'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import type { ChatMessageData } from './ChatMessage';

const c = {
  borderActive: 'rgba(232,132,92,0.25)',
  dawn: '#E8845C',
};

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
            <div
              className="pl-4"
              style={{ borderLeft: `2px solid ${c.borderActive}` }}
            >
              <div className="flex items-center gap-1.5 py-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: c.dawn,
                      animation: 'chatDotPulse 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <style jsx>{`
        @keyframes chatDotPulse {
          0%,
          60%,
          100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
