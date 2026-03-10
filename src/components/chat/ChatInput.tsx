'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  borderActive: 'rgba(232,132,92,0.35)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasContent = value.trim().length > 0;

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 6;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Enter' && !modKey && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-3 rounded-xl px-4 py-3"
        style={{
          background: c.surfaceElevated,
          border: `1px solid ${focused ? c.borderActive : c.border}`,
          transition: 'border-color 0.15s ease',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask Donna anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:opacity-100"
          style={{
            color: c.text,
            caretColor: c.dawn,
            maxHeight: `${24 * 6}px`,
          }}
          autoFocus
        />
        {hasContent && (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: c.dawn,
              color: '#1B1F3A',
            }}
            aria-label="Send message"
          >
            {disabled ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="31.4 31.4"
                  strokeDashoffset="10"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
          </button>
        )}
      </div>
      <p
        className="mt-1.5 text-center text-[11px]"
        style={{ color: c.textGhost }}
      >
        Enter to send &middot;{' '}
        {typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad|iPod/.test(navigator?.platform ?? '')
          ? 'Cmd'
          : 'Ctrl'}
        +Enter for new line
      </p>
    </div>
  );
}
