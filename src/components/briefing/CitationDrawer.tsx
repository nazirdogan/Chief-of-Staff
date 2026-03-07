'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { SourceRef } from '@/lib/db/types';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  bg: '#0A0A0B',
  border: 'rgba(255,255,255,0.07)',
  brass: '#A89968',
  brassSubtle: 'rgba(168,153,104,0.15)',
  brassBorder: 'rgba(168,153,104,0.25)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
};

interface CitationDrawerProps {
  open: boolean;
  onClose: () => void;
  sourceRef: SourceRef | null;
  title: string;
}

export function CitationDrawer({ open, onClose, sourceRef, title }: CitationDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !sourceRef) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.3)] animate-drawer-slide-up"
        style={{
          background: c.surface,
          borderTop: `1px solid ${c.border}`,
          fontFamily: "'Satoshi', sans-serif",
        }}
        role="dialog"
        aria-label={`Source citation for ${title}`}
      >
        {/* Handle */}
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full"
          style={{ background: c.border }}
        />

        <div className="space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <h3
              className="text-[14px] font-semibold tracking-[-0.01em]"
              style={{ color: c.text }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200"
              style={{ color: c.textQuaternary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.brassSubtle;
                e.currentTarget.style.color = c.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = c.textQuaternary;
              }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Source metadata */}
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-[11px] font-medium capitalize"
              style={{
                background: c.brassSubtle,
                color: c.brass,
                border: `1px solid ${c.brassBorder}`,
              }}
            >
              {sourceRef.provider.replace('_', ' ')}
            </span>
            {sourceRef.from_name && (
              <span
                className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: c.brassSubtle,
                  color: c.textTertiary,
                  border: `1px solid ${c.border}`,
                }}
              >
                From: {sourceRef.from_name}
              </span>
            )}
            {sourceRef.sent_at && (
              <span
                className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: c.brassSubtle,
                  color: c.textTertiary,
                  border: `1px solid ${c.border}`,
                }}
              >
                {new Date(sourceRef.sent_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {/* Excerpt */}
          <blockquote
            className="rounded-xl px-5 py-4 text-[13px] leading-[1.7] italic"
            style={{
              background: c.bg,
              borderLeft: `2px solid ${c.brass}`,
              color: c.textSecondary,
            }}
          >
            {sourceRef.excerpt}
          </blockquote>

          {sourceRef.url && (
            <a
              href={sourceRef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-200"
              style={{ color: c.brass }}
              onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = c.brass; }}
            >
              View original →
            </a>
          )}
        </div>
      </div>
    </>
  );
}
