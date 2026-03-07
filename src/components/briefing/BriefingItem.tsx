'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { BriefingItem as BriefingItemType } from '@/lib/db/types';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  brass: '#A89968',
  brassSubtle: 'rgba(168,153,104,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
  critical: '#F87171',
  criticalBg: 'rgba(248,113,113,0.08)',
  criticalBorder: 'rgba(248,113,113,0.2)',
  high: '#A89968',
  highBg: 'rgba(168,153,104,0.15)',
  highBorder: 'rgba(168,153,104,0.25)',
};

interface BriefingItemProps {
  item: BriefingItemType;
  onFeedback: (itemId: string, feedback: 1 | -1) => Promise<void>;
  onCitationClick: (item: BriefingItemType) => void;
}

export function BriefingItem({ item, onFeedback, onCitationClick }: BriefingItemProps) {
  const [feedbackState, setFeedbackState] = useState<1 | -1 | null>(item.user_feedback);
  const [hovered, setHovered] = useState(false);

  async function handleFeedback(feedback: 1 | -1) {
    setFeedbackState(feedback);
    await onFeedback(item.id, feedback);
  }

  const priorityStyle =
    item.rank <= 2
      ? { borderLeft: `2px solid ${c.critical}`, background: hovered ? c.criticalBg : c.surface }
      : item.rank <= 5
        ? { borderLeft: `2px solid ${c.high}`, background: hovered ? c.highBg : c.surface }
        : { borderLeft: '2px solid transparent', background: hovered ? c.brassSubtle : c.surface };

  return (
    <div
      className="rounded-xl px-5 py-4 transition-all duration-200"
      style={{
        ...priorityStyle,
        border: `1px solid ${hovered ? c.borderHover : c.border}`,
        borderLeftWidth: 2,
        borderLeftColor: priorityStyle.borderLeft.split(' ')[2],
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.3)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              background: c.brassSubtle,
              color: c.textQuaternary,
            }}
          >
            {item.rank}
          </span>
          <h3
            className="text-[13px] font-semibold leading-snug tracking-[-0.01em]"
            style={{ color: c.text }}
          >
            {item.title}
          </h3>
        </div>
        {item.action_suggestion && (
          <span
            className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: c.brassSubtle,
              color: c.brass,
              border: `1px solid rgba(168,153,104,0.25)`,
            }}
          >
            {item.action_suggestion}
          </span>
        )}
      </div>

      {/* Summary */}
      <p
        className="mt-2 text-[13px] leading-[1.6]"
        style={{ color: c.textSecondary }}
      >
        {item.summary}
      </p>

      {/* Reasoning */}
      {item.reasoning && (
        <p
          className="mt-1.5 text-[12px] italic leading-relaxed"
          style={{ color: c.textQuaternary }}
        >
          {item.reasoning}
        </p>
      )}

      {/* Actions row */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => onCitationClick(item)}
          className="text-[12px] font-medium transition-colors duration-200"
          style={{ color: c.brass }}
          onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = c.brass; }}
        >
          View source
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200"
            style={{
              color: feedbackState === 1 ? '#4A8C5A' : c.textGhost,
              background: feedbackState === 1 ? 'rgba(74,140,90,0.08)' : 'transparent',
            }}
            onClick={() => handleFeedback(1)}
            onMouseEnter={(e) => {
              if (feedbackState !== 1) e.currentTarget.style.color = '#4A8C5A';
            }}
            onMouseLeave={(e) => {
              if (feedbackState !== 1) e.currentTarget.style.color = c.textGhost;
            }}
            aria-label="Thumbs up"
          >
            <ThumbsUp size={13} />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200"
            style={{
              color: feedbackState === -1 ? c.critical : c.textGhost,
              background: feedbackState === -1 ? c.criticalBg : 'transparent',
            }}
            onClick={() => handleFeedback(-1)}
            onMouseEnter={(e) => {
              if (feedbackState !== -1) e.currentTarget.style.color = c.critical;
            }}
            onMouseLeave={(e) => {
              if (feedbackState !== -1) e.currentTarget.style.color = c.textGhost;
            }}
            aria-label="Thumbs down"
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
