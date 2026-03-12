'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ThumbsUp, ThumbsDown, Check, X, Send } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import EmailDraftCard from './EmailDraftCard';
import ActionCard, { type ActionType } from './ActionCard';

const c = {
  surface: 'var(--surface)',
  surfaceElevated: 'var(--surface-hover)',
  border: 'var(--border)',
  borderHover: 'var(--border)',
  borderActive: 'rgba(232,132,92,0.35)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.12)',
  text: 'var(--foreground)',
  textSecondary: 'var(--foreground-secondary)',
  textTertiary: 'var(--foreground-tertiary)',
  textMuted: 'var(--foreground-quaternary)',
  textGhost: 'var(--foreground-quaternary)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 16px;overflow-x:auto;margin:8px 0;font-size:13px;line-height:1.5"><code>${code.trim()}</code></pre>`
  );

  html = html.replace(
    /`([^`]+)`/g,
    '<code style="background:var(--surface-hover);padding:2px 6px;border-radius:4px;font-size:13px">$1</code>'
  );

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    '<em>$1</em>'
  );

  const blocks = html.split(/\n\n+/);
  const rendered = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<pre')) return trimmed;

      const lines = trimmed.split('\n');
      const isBulletList = lines.every((l) => /^\s*[-*]\s/.test(l) || l.trim() === '');
      const isNumberedList = lines.every((l) => /^\s*\d+\.\s/.test(l) || l.trim() === '');

      if (isBulletList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li style="margin:2px 0">${l.replace(/^\s*[-*]\s/, '')}</li>`)
          .join('');
        return `<ul style="margin:6px 0;padding-left:20px;list-style:disc">${items}</ul>`;
      }
      if (isNumberedList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li style="margin:2px 0">${l.replace(/^\s*\d+\.\s/, '')}</li>`)
          .join('');
        return `<ol style="margin:6px 0;padding-left:20px;list-style:decimal">${items}</ol>`;
      }
      return `<p style="margin:0">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('<div style="height:8px"></div>');

  return rendered;
}

// ── Feedback popup ───────────────────────────────────────────────

type FeedbackRating = 'thumbs_up' | 'thumbs_down';

interface FeedbackPopupProps {
  rating: FeedbackRating;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

function FeedbackPopup({ rating, onClose, onSubmit }: FeedbackPopupProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await onSubmit(text.trim());
    setSent(true);
    setTimeout(onClose, 1200);
  };

  const isPositive = rating === 'thumbs_up';
  const accentColor = isPositive ? c.success : c.critical;
  const accentBg = isPositive ? 'rgba(82,183,136,0.08)' : 'rgba(214,75,42,0.08)';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute z-50 w-72"
        style={{
          bottom: 'calc(100% + 8px)',
          left: 0,
          background: 'var(--card)',
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: `1px solid ${c.border}`,
            background: accentBg,
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div className="flex items-center gap-2">
            {isPositive
              ? <ThumbsUp size={14} strokeWidth={2} color={accentColor} />
              : <ThumbsDown size={14} strokeWidth={2} color={accentColor} />
            }
            <span className="text-[13px] font-medium" style={{ color: c.text }}>
              {isPositive ? 'What did Donna do well?' : 'What could Donna do better?'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: c.textGhost,
              display: 'flex',
              padding: 2,
              borderRadius: 4,
            }}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        {sent ? (
          <div className="flex items-center justify-center gap-2 px-4 py-5">
            <Check size={16} strokeWidth={2.5} color={c.success} />
            <span className="text-[13px]" style={{ color: c.textMuted }}>
              Thanks for your feedback!
            </span>
          </div>
        ) : (
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={isPositive
                ? 'Tell us what was helpful…'
                : 'Tell us what went wrong or how to improve…'
              }
              rows={3}
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                color: c.text,
                caretColor: accentColor,
              }}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || sending}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-opacity"
                style={{
                  background: text.trim() ? accentColor : c.surface,
                  color: text.trim() ? '#fff' : c.textGhost,
                  border: 'none',
                  cursor: text.trim() ? 'pointer' : 'default',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                <Send size={12} strokeWidth={2} />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Message actions ──────────────────────────────────────────────

interface MessageActionsProps {
  messageId: string;
  content: string;
}

function MessageActions({ messageId, content }: MessageActionsProps) {
  const conversationId = useChatStore((s) => s.currentConversationId);
  const [copied, setCopied] = useState(false);
  const [activePopup, setActivePopup] = useState<FeedbackRating | null>(null);
  const [submittedRating, setSubmittedRating] = useState<FeedbackRating | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  const openPopup = useCallback((rating: FeedbackRating) => {
    setActivePopup((prev) => (prev === rating ? null : rating));
  }, []);

  const handleSubmit = useCallback(
    async (feedbackText: string) => {
      if (!activePopup || !conversationId) return;
      setSubmittedRating(activePopup);
      try {
        await fetch('/api/chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: messageId,
            conversation_id: conversationId,
            rating: activePopup,
            message_content: content,
            feedback_text: feedbackText,
          }),
        });
      } catch {
        // Non-fatal
      }
    },
    [activePopup, messageId, content, conversationId]
  );

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 5,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    transition: 'color 0.15s, background 0.15s',
    color: c.textGhost,
  };

  return (
    <div
      ref={wrapperRef}
      className="message-actions relative"
      style={{ display: 'flex', alignItems: 'center', gap: 2 }}
    >
      {/* Copy */}
      <button
        style={btnBase}
        onClick={handleCopy}
        title="Copy message"
        aria-label="Copy message"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = c.text; (e.currentTarget as HTMLElement).style.background = c.surface; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = c.textGhost; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {copied
          ? <Check size={13} strokeWidth={2.5} color={c.success} />
          : <Copy size={13} strokeWidth={2} />
        }
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 12, background: c.border, margin: '0 2px' }} />

      {/* Thumbs up */}
      <div className="relative">
        <button
          style={{
            ...btnBase,
            color: submittedRating === 'thumbs_up' ? c.success : activePopup === 'thumbs_up' ? c.success : c.textGhost,
            background: submittedRating === 'thumbs_up' || activePopup === 'thumbs_up' ? 'rgba(82,183,136,0.10)' : 'transparent',
          }}
          onClick={() => openPopup('thumbs_up')}
          title="Good response"
          aria-label="Good response"
          onMouseEnter={(e) => {
            if (submittedRating !== 'thumbs_up' && activePopup !== 'thumbs_up') {
              (e.currentTarget as HTMLElement).style.color = c.success;
              (e.currentTarget as HTMLElement).style.background = 'rgba(82,183,136,0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (submittedRating !== 'thumbs_up' && activePopup !== 'thumbs_up') {
              (e.currentTarget as HTMLElement).style.color = c.textGhost;
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }
          }}
        >
          <ThumbsUp size={13} strokeWidth={2} />
        </button>

        <AnimatePresence>
          {activePopup === 'thumbs_up' && (
            <FeedbackPopup
              rating="thumbs_up"
              onClose={() => setActivePopup(null)}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Thumbs down */}
      <div className="relative">
        <button
          style={{
            ...btnBase,
            color: submittedRating === 'thumbs_down' ? c.critical : activePopup === 'thumbs_down' ? c.critical : c.textGhost,
            background: submittedRating === 'thumbs_down' || activePopup === 'thumbs_down' ? 'rgba(214,75,42,0.10)' : 'transparent',
          }}
          onClick={() => openPopup('thumbs_down')}
          title="Poor response"
          aria-label="Poor response"
          onMouseEnter={(e) => {
            if (submittedRating !== 'thumbs_down' && activePopup !== 'thumbs_down') {
              (e.currentTarget as HTMLElement).style.color = c.critical;
              (e.currentTarget as HTMLElement).style.background = 'rgba(214,75,42,0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (submittedRating !== 'thumbs_down' && activePopup !== 'thumbs_down') {
              (e.currentTarget as HTMLElement).style.color = c.textGhost;
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }
          }}
        >
          <ThumbsDown size={13} strokeWidth={2} />
        </button>

        <AnimatePresence>
          {activePopup === 'thumbs_down' && (
            <FeedbackPopup
              rating="thumbs_down"
              onClose={() => setActivePopup(null)}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Action block extraction ───────────────────────────────────────

const KNOWN_ACTION_TYPES = new Set<ActionType>([
  'email_draft',
  'calendar_event',
  'task_created',
  'meeting_prep',
  'web_search',
]);

export interface ActionBlock {
  type: ActionType;
  data: Record<string, unknown>;
  pendingActionId?: string;
  expiresAt?: string;
  status?: 'pending' | 'confirmed' | 'executed' | 'failed';
}

// Matches fenced ```json ... ``` blocks that contain a known action type field.
// Falls back to matching bare top-level JSON objects with a "type" field.
// Note: the bare-object regex is intentionally shallow — deeply nested JSON payloads
// are expected to arrive inside fenced blocks from the AI.
function extractActionBlocks(content: string): { text: string; blocks: ActionBlock[] } {
  const blocks: ActionBlock[] = [];
  let text = content;

  // Strategy 1 — fenced ```json``` blocks (preferred, handles nested JSON)
  const fencedRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match: RegExpExecArray | null;

  while ((match = fencedRegex.exec(content)) !== null) {
    const raw = match[0];
    const jsonStr = match[1];
    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      if (parsed.type && KNOWN_ACTION_TYPES.has(parsed.type as ActionType)) {
        blocks.push({
          type: parsed.type as ActionType,
          // For email_draft the payload is in parsed.draft; for others it is the parsed object itself
          data: parsed as Record<string, unknown>,
          pendingActionId: typeof parsed.pending_action_id === 'string' ? parsed.pending_action_id : undefined,
          expiresAt: typeof parsed.expires_at === 'string' ? parsed.expires_at : undefined,
          status: (parsed.status as ActionBlock['status']) ?? 'pending',
        });
        text = text.replace(raw, '').trim();
      }
    } catch {
      // Not valid JSON — leave as-is
    }
  }

  // Strategy 2 — bare single-level JSON objects (fallback for simple types)
  // Only run if no fenced blocks were found, to avoid double-extraction
  if (blocks.length === 0) {
    const bareRegex = /\{[^{}]*"type"\s*:\s*"([^"]+)"[^{}]*\}/g;
    while ((match = bareRegex.exec(content)) !== null) {
      const raw = match[0];
      const detectedType = match[1] as ActionType;
      if (!KNOWN_ACTION_TYPES.has(detectedType)) continue;
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        blocks.push({
          type: detectedType,
          data: parsed,
          pendingActionId: typeof parsed.pending_action_id === 'string' ? parsed.pending_action_id : undefined,
          expiresAt: typeof parsed.expires_at === 'string' ? parsed.expires_at : undefined,
          status: (parsed.status as ActionBlock['status']) ?? 'pending',
        });
        text = text.replace(raw, '').trim();
      } catch {
        // Skip
      }
    }
  }

  return { text, blocks };
}

// ── ChatMessage ──────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[66%]">
          <div
            className="rounded-xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed"
            style={{
              background: c.dawnMuted,
              border: `1px solid ${c.borderActive}`,
              color: c.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </div>
          <p className="mt-1 text-right text-[11px]" style={{ color: c.textMuted }}>
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  const { text: cleanText, blocks } = extractActionBlocks(message.content);

  return (
    <div className="group flex justify-start">
      <motion.div
        className="w-full"
        initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
        animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {cleanText && (
          <div
            className="pl-4 text-[15px] leading-relaxed"
            style={{
              borderLeft: `2px solid ${c.borderActive}`,
              color: c.textSecondary,
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanText) }}
          />
        )}

        {blocks.map((block, i) => {
          // email_draft gets the EmailDraftCard directly via ActionCard's delegation
          const data = block.data;
          const emailDraft =
            block.type === 'email_draft'
              ? (data.draft as { to: string; subject: string; body: string; provider?: string } | undefined)
              : undefined;

          if (block.type === 'email_draft' && emailDraft && block.pendingActionId) {
            return (
              <div
                key={i}
                className={cleanText || i > 0 ? 'mt-3 pl-4' : 'pl-4'}
                style={{ borderLeft: `2px solid ${c.borderActive}` }}
              >
                <EmailDraftCard
                  draft={emailDraft}
                  pendingActionId={block.pendingActionId}
                  expiresAt={block.expiresAt}
                />
              </div>
            );
          }

          return (
            <div
              key={i}
              className={cleanText || i > 0 ? 'mt-3 pl-4' : 'pl-4'}
              style={{ borderLeft: `2px solid ${c.borderActive}` }}
            >
              <ActionCard
                type={block.type}
                data={block.data}
                pendingActionId={block.pendingActionId}
                status={block.status}
                expiresAt={block.expiresAt}
              />
            </div>
          );
        })}

        {/* Timestamp + action buttons row */}
        <div className="mt-1.5 pl-4 flex items-center gap-2">
          <p className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
            {formatTimestamp(message.timestamp)}
          </p>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <MessageActions messageId={message.id} content={message.content} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
