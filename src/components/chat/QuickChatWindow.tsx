'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpIcon,
  CalendarIcon,
  MailIcon,
  UsersIcon,
  CheckSquareIcon,
  XIcon,
} from 'lucide-react';

const c = {
  bg: '#121218',
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(232,132,92,0.4)',
  text: '#F2F0EB',
  textMuted: 'rgba(242,240,235,0.45)',
  dawn: '#E8845C',
  surface: 'rgba(255,255,255,0.05)',
};

const suggestions = [
  { label: 'Prep me for my next meeting', icon: CalendarIcon },
  { label: "What's waiting on me?", icon: UsersIcon },
  { label: 'Catch me up on email', icon: MailIcon },
  { label: 'Open tasks', icon: CheckSquareIcon },
];

interface Props {
  onSend: (message: string) => void;
  onDismiss: () => void;
}

const EXIT_MS = 180;

export default function QuickChatWindow({ onSend, onDismiss }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play exit animation then call the real onDismiss
  const dismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    exitTimer.current = setTimeout(() => {
      setExiting(false);
      onDismiss();
    }, EXIT_MS);
  }, [exiting, onDismiss]);

  // Retrigger entrance animation + auto-focus every time the OS window appears
  useEffect(() => {
    const onFocus = () => {
      setExiting(false);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      setAnimKey((k) => k + 1);
      setTimeout(() => textareaRef.current?.focus(), 60);
    };
    window.addEventListener('focus', onFocus);
    onFocus();
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Escape to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dismiss]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);
  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasContent = value.trim().length > 0;

  return (
    <div
      className="flex h-screen flex-col p-3"
      style={{ background: c.bg, WebkitUserSelect: 'none' }}
    >
      {/* ── Animated card ──────────────────────────────────────── */}
      <div
        key={animKey}
        className="flex h-full flex-col overflow-hidden rounded-2xl"
        style={{
          background: '#1A1A24',
          border: `1px solid ${c.border}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)',
          animation: exiting
            ? `quickChatOut ${EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
            : 'quickChatIn 220ms cubic-bezier(0.34, 1.4, 0.64, 1) both',
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-4 pt-3.5 pb-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[13px] font-semibold"
              style={{ color: c.dawn, fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.01em' }}
            >
              Donna
            </span>
            <span className="text-[11px]" style={{ color: c.textMuted }}>
              — ⌥Space to dismiss
            </span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1"
            style={{ color: c.textMuted, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onMouseEnter={(e) => (e.currentTarget.style.color = c.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = c.textMuted)}
            aria-label="Dismiss"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Input */}
        <div
          className="px-4 pt-3.5"
          style={{ WebkitUserSelect: 'text' } as React.CSSProperties}
        >
          <div
            className="overflow-hidden rounded-xl transition-all duration-150"
            style={{
              border: `1px solid ${focused ? c.borderActive : c.border}`,
              background: c.surface,
              boxShadow: focused ? '0 0 0 3px rgba(232,132,92,0.08)' : 'none',
            }}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask Donna anything…"
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-6 outline-none placeholder:opacity-40"
              style={{ color: c.text, caretColor: c.dawn, fontFamily: 'inherit' }}
            />
            <div
              className="flex items-center justify-end px-3 py-2"
              style={{ borderTop: `1px solid ${c.border}` }}
            >
              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150"
                style={{
                  background: hasContent ? c.dawn : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${hasContent ? 'transparent' : c.border}`,
                  color: hasContent ? '#fff' : c.textMuted,
                }}
                aria-label="Send"
              >
                <ArrowUpIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions — staggered fade-in */}
        <div className="flex-1 overflow-hidden px-4 pt-3 pb-3">
          <p
            className="mb-2 text-[10px] font-medium uppercase tracking-widest"
            style={{ color: c.textMuted, opacity: 0, animation: 'quickChatFade 180ms 120ms ease both' }}
          >
            Quick ask
          </p>
          <div className="flex flex-col gap-1">
            {suggestions.map(({ label, icon: Icon }, i) => (
              <button
                key={label}
                type="button"
                onClick={() => onSend(label)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px]"
                style={{
                  color: c.textMuted,
                  background: 'transparent',
                  border: '1px solid transparent',
                  WebkitUserSelect: 'text',
                  opacity: 0,
                  // Each suggestion fades in with a small stagger
                  animation: `quickChatFade 200ms ${140 + i * 35}ms ease both`,
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = c.surface;
                  e.currentTarget.style.borderColor = c.border;
                  e.currentTarget.style.color = c.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = c.textMuted;
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: c.dawn }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-4 pb-3.5"
          style={{
            borderTop: `1px solid ${c.border}`,
            paddingTop: 10,
            opacity: 0,
            animation: 'quickChatFade 180ms 280ms ease both',
          }}
        >
          <p className="text-[11px]" style={{ color: c.textMuted }}>
            {(['⏎ send', 'esc dismiss', '⌥Space toggle'] as const).map((hint, i) => (
              <span key={hint}>
                {i > 0 && <span style={{ opacity: 0.3 }}> · </span>}
                <kbd
                  className="rounded px-1 py-0.5 text-[10px]"
                  style={{ background: 'rgba(255,255,255,0.07)', color: c.textMuted }}
                >
                  {hint.split(' ')[0]}
                </kbd>
                {' '}{hint.split(' ')[1]}
              </span>
            ))}
            <span style={{ opacity: 0.3 }}> · </span>response opens in Donna
          </p>
        </div>
      </div>

      {/* Keyframe definitions */}
      <style>{`
        @keyframes quickChatIn {
          from { opacity: 0; transform: scale(0.93) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes quickChatOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(0.95) translateY(6px); }
        }
        @keyframes quickChatFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
