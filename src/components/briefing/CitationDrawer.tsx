'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { SourceRef } from '@/lib/db/types';
import { decodeEntities } from '@/lib/utils/decode-entities';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  bg: '#1B1F3A',
  border: 'rgba(45,45,45,0.08)',
  dawn: '#E8845C',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textQuaternary: 'rgba(45,45,45,0.5)',
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

      {/* Modal */}
      <div
        ref={drawerRef}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[70vh] overflow-y-auto rounded-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-fade-in"
        style={{
          background: '#141415',
          border: `1px solid ${c.border}`,
          fontFamily: "'Inter', sans-serif",
        }}
        role="dialog"
        aria-label={`Source citation for ${title}`}
      >

        <div className="space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <h3
              className="text-[14px] font-semibold tracking-[-0.01em]"
              style={{ color: c.text }}
            >
              {decodeEntities(title)}
            </h3>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200"
              style={{ color: c.textQuaternary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.dawnSubtle;
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
                background: c.dawnSubtle,
                color: c.dawn,
                border: `1px solid ${c.dawnBorder}`,
              }}
            >
              {sourceRef.provider.replace('_', ' ')}
            </span>
            {sourceRef.from_name && (
              <span
                className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: c.dawnSubtle,
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
                  background: c.dawnSubtle,
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
              borderLeft: `2px solid ${c.dawn}`,
              color: c.textSecondary,
            }}
          >
            {decodeEntities(sourceRef.excerpt)}
          </blockquote>

          {sourceRef.url && (
            <a
              href={sourceRef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-200"
              style={{ color: c.dawn }}
              onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = c.dawn; }}
            >
              View original →
            </a>
          )}
        </div>
      </div>
    </>
  );
}
