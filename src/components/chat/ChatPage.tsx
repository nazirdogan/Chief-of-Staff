'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  MailIcon,
  UsersIcon,
  CheckSquareIcon,
  BarChart2Icon,
} from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import ChatGreeting from './ChatGreeting';
import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';

interface ChatPageProps {
  conversationId?: string;
}

const c = {
  text: 'var(--foreground)',
  textMuted: 'var(--foreground-quaternary)',
  textGhost: 'var(--foreground-quaternary)',
  surface: 'var(--surface)',
  surfaceElevated: 'var(--surface-hover)',
  border: 'var(--border)',
  borderHover: 'var(--border)',
  dawn: '#E8845C',
};

const quickActions = [
  { label: 'Prep me for my next meeting', icon: CalendarIcon },
  { label: 'What did I miss yesterday?', icon: MailIcon },
  { label: "Who's waiting on me?", icon: UsersIcon },
  { label: 'What are my open tasks?', icon: CheckSquareIcon },
  { label: 'How was my week?', icon: BarChart2Icon },
];

/** Duration the content wrapper takes to reach the bottom (ms) */
const SLIDE_MS = 580;

type Phase = 'greeting' | 'sliding' | 'chat';

export default function ChatPage({ conversationId }: ChatPageProps) {
  const router = useRouter();
  const messages     = useChatStore((s) => s.messages);
  const isLoading    = useChatStore((s) => s.isLoading);
  const historyLoading = useChatStore((s) => s.historyLoading);
  const sendMessage  = useChatStore((s) => s.sendMessage);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const loadConversation     = useChatStore((s) => s.loadConversation);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  const [phase, setPhase]           = useState<Phase>('greeting');
  const [slideOffset, setSlideOffset] = useState(0);

  // Refs for position measurement
  const containerRef   = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const navigatedRef   = useRef<string | null>(null);

  /* ── Load / reset on route change ─────────────────────────── */
  useEffect(() => {
    if (conversationId) {
      // If we already have this conversation loaded in memory (e.g. just created it),
      // skip the API fetch to prevent the messages from briefly disappearing.
      const state = useChatStore.getState();
      const alreadyLoaded =
        state.currentConversationId === conversationId && state.messages.length > 0;
      if (!alreadyLoaded) {
        loadConversation(conversationId);
      }
      setPhase('chat');
    } else {
      // Mark any stale conversationId as already-navigated so the mirror
      // effect (which runs in the same cycle) won't redirect back to it.
      const staleId = useChatStore.getState().currentConversationId;
      if (staleId) navigatedRef.current = staleId;
      startNewConversation();
      setPhase('greeting');
      setSlideOffset(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  /* ── Mirror new conversationId into URL ────────────────────── */
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

  /* ── Send handler — triggers slide on first message ─────────── */
  const handleSend = useCallback(
    (msg: string, files?: File[]) => {
      if (phase === 'greeting') {
        const container    = containerRef.current;
        const inputWrapper = inputWrapperRef.current;

        if (container && inputWrapper) {
          const containerRect = container.getBoundingClientRect();
          const inputRect     = inputWrapper.getBoundingClientRect();
          const targetBottom = containerRect.bottom - 16;
          const delta        = targetBottom - inputRect.bottom;
          setSlideOffset(delta);
        }

        setPhase('sliding');
        setTimeout(() => setPhase('chat'), SLIDE_MS);
      }
      sendMessage(msg, files);
    },
    [phase, sendMessage],
  );

  const handleClear = useCallback(() => {
    startNewConversation();
    setPhase('greeting');
    setSlideOffset(0);
    router.replace('/chat');
  }, [startNewConversation, router]);

  /* ═══════════════════════════════════════════════════════════
     CHAT LAYOUT  (phase === 'chat' or loading history)
  ═══════════════════════════════════════════════════════════ */
  if (phase === 'chat' || historyLoading) {
    return (
      <div
        className="flex h-[calc(100vh-80px)] flex-col"
        style={{ animation: 'chatFadeIn 0.28s ease both' }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <h1 className="text-[20px] font-semibold" style={{ color: c.text }}>
            Ask Donna
          </h1>
        </div>

        {/* Messages / skeleton */}
        {historyLoading ? (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
              {[70, 90, 55].map((w, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="h-10 animate-pulse rounded-xl"
                    style={{
                      width: `${w}%`,
                      background:
                        i % 2 === 0
                          ? 'rgba(232,132,92,0.12)'
                          : 'var(--surface-hover)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ChatMessageList messages={messages} isLoading={isLoading} />
        )}

        {/* Input — max-w-2xl matches greeting layout width */}
        <div className="px-4 pb-4 pt-2">
          <div className="mx-auto max-w-2xl">
            <ChatInput
              onSend={sendMessage}
              disabled={isLoading}
              onNewChat={handleClear}
              showNewChat
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes chatFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     GREETING + SLIDING LAYOUT
  ═══════════════════════════════════════════════════════════ */
  const isSliding = phase === 'sliding';

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-80px)] overflow-hidden"
    >
      {/*
        Content wrapper
        ──────────────────────────────────────────────────────
        Greeting:  top:50% + translateY(-50%)   → perfectly centred
        Sliding:   translateY(-50% + delta)     → glides to bottom
        The delta was measured so the input bottom lands exactly
        where it sits in the chat layout (containerBottom - 16px).
      */}
      <div
        className="absolute left-0 right-0 top-1/2 px-4"
        style={{
          transform: isSliding
            ? `translateY(calc(-50% + ${slideOffset}px))`
            : 'translateY(-50%)',
          transition: isSliding
            ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : 'none',
          willChange: isSliding ? 'transform' : 'auto',
        }}
      >
        <div className="mx-auto max-w-2xl">

          {/* ── Greeting heading ── */}
          <div
            style={{
              marginBottom: 24,
              opacity: isSliding ? 0 : 1,
              transform: isSliding ? 'translateY(-10px)' : 'none',
              transition: isSliding
                ? 'opacity 0.18s ease, transform 0.18s ease'
                : 'none',
              pointerEvents: isSliding ? 'none' : 'auto',
            }}
          >
            <ChatGreeting />
          </div>

          {/* ── Input ── */}
          <div ref={inputWrapperRef}>
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>

          {/* ── Quick-action pills ── */}
          <div
            style={{
              marginTop: 24,
              opacity: isSliding ? 0 : 1,
              transition: isSliding ? 'opacity 0.12s ease' : 'none',
              pointerEvents: isSliding ? 'none' : 'auto',
            }}
          >
            <div className="flex flex-wrap justify-center gap-2">
              {quickActions.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSend(label, undefined)}
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors"
                  style={{
                    background: c.surface,
                    borderColor: c.border,
                    color: c.textMuted,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = c.surfaceElevated;
                    e.currentTarget.style.borderColor = c.borderHover;
                    e.currentTarget.style.color = c.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = c.surface;
                    e.currentTarget.style.borderColor = c.border;
                    e.currentTarget.style.color = c.textMuted;
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: c.dawn }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
