'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BriefingItem as BriefingItemType } from '@/lib/db/types';

interface BriefingItemProps {
  item: BriefingItemType;
  onFeedback: (itemId: string, feedback: 1 | -1) => Promise<void>;
  onCitationClick: (item: BriefingItemType) => void;
}

export function BriefingItem({ item, onFeedback, onCitationClick }: BriefingItemProps) {
  const [feedbackState, setFeedbackState] = useState<1 | -1 | null>(item.user_feedback);

  async function handleFeedback(feedback: 1 | -1) {
    setFeedbackState(feedback);
    await onFeedback(item.id, feedback);
  }

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-xs font-bold text-muted-foreground">
              #{item.rank}
            </span>
            <CardTitle className="text-sm">{item.title}</CardTitle>
          </div>
          {item.action_suggestion && (
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {item.action_suggestion}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-foreground/80">{item.summary}</p>

        {/* Reasoning line */}
        <p className="text-xs italic text-muted-foreground">{item.reasoning}</p>

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-1">
          {/* Citation button */}
          <button
            onClick={() => onCitationClick(item)}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            View source
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 w-7 p-0 ${feedbackState === 1 ? 'text-green-600' : 'text-muted-foreground'}`}
              onClick={() => handleFeedback(1)}
              aria-label="Thumbs up"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 w-7 p-0 ${feedbackState === -1 ? 'text-red-600' : 'text-muted-foreground'}`}
              onClick={() => handleFeedback(-1)}
              aria-label="Thumbs down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L14 22h0a3.13 3.13 0 0 1-3-3.88Z" />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
