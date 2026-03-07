import type { ContextAdapter, ContextPipelineInput } from '@/lib/context/types';

interface CalendarEventData {
  id: string;
  title?: string;
  summary?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  attendees?: Array<{ email: string; name?: string }>;
  location?: string;
  organizer?: string;
}

export const calendarAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const events = Array.isArray(rawData) ? rawData : [rawData];

    return events
      .filter((evt): evt is CalendarEventData => !!evt && typeof evt === 'object' && 'id' in evt)
      .map((evt) => {
        const people = (evt.attendees ?? []).map((a) => a.email).filter(Boolean);
        if (evt.organizer && !people.includes(evt.organizer)) {
          people.push(evt.organizer);
        }

        const parts: string[] = [];
        if (evt.title || evt.summary) parts.push(`Event: ${evt.title || evt.summary}`);
        if (evt.startTime) parts.push(`Start: ${evt.startTime}`);
        if (evt.endTime) parts.push(`End: ${evt.endTime}`);
        if (evt.location) parts.push(`Location: ${evt.location}`);
        if (evt.attendees?.length) {
          parts.push(
            `Attendees: ${evt.attendees.map((a) => a.name || a.email).join(', ')}`
          );
        }
        if (evt.description) parts.push(`Description: ${evt.description}`);

        return {
          sourceId: evt.id,
          sourceRef: {
            provider: 'google_calendar',
            event_id: evt.id,
            title: evt.title || evt.summary,
            start_time: evt.startTime,
          },
          title: evt.title || evt.summary,
          rawContent: parts.join('\n'),
          occurredAt: evt.startTime ? new Date(evt.startTime).toISOString() : new Date().toISOString(),
          people,
          chunkType: 'calendar_event',
        };
      });
  },
};
