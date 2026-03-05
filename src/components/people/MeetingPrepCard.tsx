'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MeetingPrep } from '@/lib/ai/agents/meeting-prep';
import type { SourceRef } from '@/lib/db/types';

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
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="text-sm">
            Meeting Prep: {prep.event_title}
          </CardTitle>
          <svg
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <p className="text-xs text-muted-foreground">{prep.summary}</p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Attendee Context */}
          {prep.attendee_context.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attendees
              </h4>
              <ul className="space-y-2">
                {prep.attendee_context.map((attendee, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{attendee.name}</span>
                    <span className="text-foreground/70">
                      {' '}&mdash; {attendee.relationship_note}
                    </span>
                    <button
                      onClick={() =>
                        onCitationClick(attendee.source_ref, attendee.name)
                      }
                      className="ml-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
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
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Open Items
              </h4>
              <ul className="space-y-2">
                {prep.open_items.map((item, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-foreground/80">{item.description}</span>
                    <button
                      onClick={() =>
                        onCitationClick(item.source_ref, item.description)
                      }
                      className="ml-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      [source]
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Talking Points */}
          {prep.suggested_talking_points.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Talking Points
              </h4>
              <ul className="space-y-1">
                {prep.suggested_talking_points.map((point, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="shrink-0 text-muted-foreground">&bull;</span>
                    <span className="text-foreground/80">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Watch Out For */}
          {prep.watch_out_for && (
            <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Watch out for
              </p>
              <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                {prep.watch_out_for}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
