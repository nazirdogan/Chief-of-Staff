'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import type { BriefingItem as BriefingItemType } from '@/lib/db/types';
import { decodeEntities } from '@/lib/utils/decode-entities';

const ERROR_PATTERNS = [
  /no .* content provided/i,
  /failed to (process|fetch|parse)/i,
  /error (processing|fetching)/i,
  /could not (retrieve|extract)/i,
  /unable to (process|parse)/i,
  /internal (server )?error/i,
  /unexpected (error|token)/i,
];

function isErrorSummary(text: string): boolean {
  return ERROR_PATTERNS.some(p => p.test(text));
}

function getCitationLabel(provider: string): string {
  switch (provider) {
    case 'gmail':
    case 'outlook':
    case 'apple_icloud_mail':
      return 'Open email';
    case 'slack':
    case 'microsoft_teams':
      return 'Open thread';
    case 'google_calendar':
    case 'microsoft_calendar':
    case 'calendly':
      return 'View event';
    case 'linear':
    case 'github':
    case 'jira':
    case 'asana':
    case 'trello':
    case 'clickup':
    case 'monday':
      return 'View task';
    case 'notion':
    case 'google_drive':
    case 'dropbox':
    case 'onedrive':
      return 'View document';
    default:
      return 'View original';
  }
}

const c = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
  critical: '#D64B2A',
  criticalBg: 'rgba(214,75,42,0.08)',
  criticalBorder: 'rgba(214,75,42,0.2)',
  high: '#E8845C',
  highBg: 'rgba(232,132,92,0.15)',
  highBorder: 'rgba(232,132,92,0.25)',
};

interface BriefingItemProps {
  item: BriefingItemType;
  onFeedback: (itemId: string, feedback: 1 | -1) => Promise<void>;
  onCitationClick: (item: BriefingItemType) => void;
}

export function BriefingItem({ item, onFeedback, onCitationClick }: BriefingItemProps) {
  const [feedbackState, setFeedbackState] = useState<1 | -1 | null>(item.user_feedback);
  const [feedbackConfirm, setFeedbackConfirm] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleFeedback(feedback: 1 | -1) {
    setFeedbackState(feedback);
    setFeedbackConfirm(true);
    setTimeout(() => setFeedbackConfirm(false), 1500);
    await onFeedback(item.id, feedback);
  }

  const summaryIsError = isErrorSummary(item.summary);

  const priorityStyle =
    item.rank <= 2
      ? { borderLeft: `2px solid ${c.critical}`, background: hovered ? c.criticalBg : c.surface }
      : item.rank <= 5
        ? { borderLeft: `2px solid ${c.high}`, background: hovered ? c.highBg : c.surface }
        : { borderLeft: '2px solid transparent', background: hovered ? c.dawnSubtle : c.surface };

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
              background: c.dawnSubtle,
              color: c.textQuaternary,
            }}
          >
            {item.rank}
          </span>
          <h3
            className="text-[13px] font-semibold leading-snug tracking-[-0.01em]"
            style={{ color: c.text }}
          >
            {decodeEntities(item.title)}
          </h3>
        </div>
        {item.action_suggestion && (
          <span
            className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: c.dawnSubtle,
              color: c.dawn,
              border: `1px solid rgba(232,132,92,0.25)`,
            }}
          >
            {decodeEntities(item.action_suggestion ?? '')}
          </span>
        )}
      </div>

      {/* Summary */}
      <p
        className="mt-2 text-[13px] leading-[1.6]"
        style={{ color: summaryIsError ? c.textQuaternary : c.textSecondary, fontStyle: summaryIsError ? 'italic' : 'normal' }}
      >
        {summaryIsError ? 'No new updates for this item.' : decodeEntities(item.summary)}
      </p>

      {/* Actions row */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => onCitationClick(item)}
          className="text-[12px] font-medium transition-colors duration-200"
          style={{ color: c.dawn }}
          onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = c.dawn; }}
        >
          {getCitationLabel(item.source_ref?.provider ?? '')}
        </button>

        <div className="ml-auto flex items-center gap-1">
          {feedbackConfirm && (
            <span className="flex items-center gap-1 text-[11px] font-medium animate-fade-in" style={{ color: '#4A8C5A' }}>
              <Check size={11} />
              Noted
            </span>
          )}
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
            title="This summary was accurate and helpful"
            aria-label="Accurate summary"
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
            title="This summary was inaccurate or unhelpful"
            aria-label="Inaccurate summary"
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
