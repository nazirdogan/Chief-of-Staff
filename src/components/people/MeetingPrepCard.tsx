'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MeetingPrep } from '@/lib/ai/agents/meeting-prep';
import type { SourceRef } from '@/lib/db/types';
import { decodeEntities } from '@/lib/utils/decode-entities';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  bg: '#0A0A0B',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  brass: '#A89968',
  brassSubtle: 'rgba(168,153,104,0.15)',
  brassBorder: 'rgba(168,153,104,0.25)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
  amber: '#8C6D2A',
  amberBg: 'rgba(140,109,42,0.06)',
  amberBorder: 'rgba(140,109,42,0.14)',
};

interface MeetingPrepCardProps {
  prep: MeetingPrep;
  onCitationClick: (sourceRef: SourceRef, title: string) => void;
}

export function MeetingPrepCard({ prep, onCitationClick }: MeetingPrepCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasContent =
    prep.attendee_context.length > 0 ||
    prep.open_items.length > 0 ||
    prep.suggested_talking_points.length > 0;

  if (!hasContent) return null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderLeft: `2px solid ${c.brass}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left px-5 py-4"
      >
        <div>
          <h3
            className="text-[13px] font-semibold tracking-[-0.01em]"
            style={{ color: c.text }}
          >
            Meeting Prep: {decodeEntities(prep.event_title)}
          </h3>
          <p className="mt-0.5 text-[12px]" style={{ color: c.textQuaternary }}>
            {decodeEntities(prep.summary)}
          </p>
        </div>
        <ChevronDown
          size={15}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: c.textQuaternary,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expandable content */}
      {expanded && (
        <div
          className="px-5 pb-5 space-y-5"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          <div className="pt-4" />

          {/* Attendees */}
          {prep.attendee_context.length > 0 && (
            <div>
              <p
                className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: c.textQuaternary }}
              >
                Attendees
              </p>
              <ul className="space-y-2">
                {prep.attendee_context.map((attendee, i) => (
                  <li key={i} className="text-[13px]" style={{ color: c.textSecondary }}>
                    <span className="font-semibold" style={{ color: c.text }}>
                      {attendee.name}
                    </span>
                    <span> &mdash; {decodeEntities(attendee.relationship_note)}</span>
                    <button
                      onClick={() => onCitationClick(attendee.source_ref, attendee.name)}
                      className="ml-1.5 text-[11px] font-medium transition-colors duration-200"
                      style={{ color: c.brass }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = c.brass; }}
                    >
                      [source]
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Open Items */}
          {prep.open_items.length > 0 && (
            <div>
              <p
                className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: c.textQuaternary }}
              >
                Open Items
              </p>
              <ul className="space-y-2">
                {prep.open_items.map((item, i) => (
                  <li key={i} className="text-[13px]" style={{ color: c.textSecondary }}>
                    {decodeEntities(item.description)}
                    <button
                      onClick={() => onCitationClick(item.source_ref, item.description)}
                      className="ml-1.5 text-[11px] font-medium transition-colors duration-200"
                      style={{ color: c.brass }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = c.brass; }}
                    >
                      [source]
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Talking Points */}
          {prep.suggested_talking_points.length > 0 && (
            <div>
              <p
                className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: c.textQuaternary }}
              >
                Talking Points
              </p>
              <ul className="space-y-1.5">
                {prep.suggested_talking_points.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-2.5 text-[13px]"
                    style={{ color: c.textSecondary }}
                  >
                    <span
                      className="mt-[2px] h-1 w-1 shrink-0 rounded-full"
                      style={{ background: c.brass }}
                    />
                    {decodeEntities(point)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Watch Out For */}
          {prep.watch_out_for && (
            <div
              className="rounded-lg px-4 py-3"
              style={{
                background: c.amberBg,
                border: `1px solid ${c.amberBorder}`,
              }}
            >
              <p
                className="text-[11px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: c.amber }}
              >
                Watch out for
              </p>
              <p
                className="mt-1 text-[13px] leading-relaxed"
                style={{ color: c.text }}
              >
                {decodeEntities(prep.watch_out_for)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
