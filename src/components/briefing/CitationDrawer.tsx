'use client';

import { useEffect, useRef } from 'react';
import type { SourceRef } from '@/lib/db/types';

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
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-xl border-t bg-background p-6 shadow-lg"
        role="dialog"
        aria-label={`Source citation for ${title}`}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          {/* Source metadata */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5 capitalize">
              {sourceRef.provider.replace('_', ' ')}
            </span>
            {sourceRef.from_name && (
              <span className="rounded bg-muted px-2 py-0.5">
                From: {sourceRef.from_name}
              </span>
            )}
            {sourceRef.sent_at && (
              <span className="rounded bg-muted px-2 py-0.5">
                {new Date(sourceRef.sent_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {/* Source excerpt */}
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 text-sm text-muted-foreground">
            {sourceRef.excerpt}
          </blockquote>

          {sourceRef.url && (
            <a
              href={sourceRef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-primary underline underline-offset-2"
            >
              View original
            </a>
          )}
        </div>
      </div>
    </>
  );
}
