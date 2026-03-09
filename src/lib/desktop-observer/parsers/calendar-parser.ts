import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';

const TIME_RANGE_RE = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[—–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/;
const MEETING_LINK_RE = /(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)\/[\w/-]+/i;

function extractEvents(texts: string[]): Array<{
  title: string;
  time: string | null;
  attendees: string[];
  location: string | null;
  meetingLink: string | null;
}> {
  const events: Array<{
    title: string;
    time: string | null;
    attendees: string[];
    location: string | null;
    meetingLink: string | null;
  }> = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    // Look for time ranges — these usually precede or follow event titles
    const timeMatch = text.match(TIME_RANGE_RE);
    if (timeMatch) {
      // The event title is usually nearby
      const title = texts[i + 1] || texts[i - 1] || 'Unknown event';
      const attendees: string[] = [];
      const meetingLink = texts.slice(i, i + 5).join(' ').match(MEETING_LINK_RE)?.[0] ?? null;

      // Look for attendee names in surrounding text
      for (let j = i + 1; j < Math.min(i + 5, texts.length); j++) {
        if (texts[j].includes('@') || (texts[j].length < 40 && texts[j].match(/^[A-Z][a-z]+ [A-Z]/))) {
          attendees.push(texts[j]);
        }
      }

      events.push({
        title: title.slice(0, 100),
        time: `${timeMatch[1]} – ${timeMatch[2]}`,
        attendees,
        location: null,
        meetingLink,
      });
    }
  }

  return events;
}

export const calendarParser: AppParser = {
  name: 'calendar',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const url = ctx.url?.toLowerCase() ?? '';

    const calApps = ['calendar', 'fantastical', 'cron', 'notion calendar', 'amie'];
    if (calApps.some(a => app.includes(a))) return true;

    if (url.includes('calendar.google.com') || url.includes('outlook.live.com/calendar') || url.includes('outlook.office.com/calendar')) {
      return true;
    }

    return false;
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const events = extractEvents(ctx.visible_text);

    const people: Array<{ name: string; email?: string }> = [];
    for (const event of events) {
      for (const attendee of event.attendees) {
        if (attendee.includes('@')) {
          people.push({ name: attendee.split('@')[0], email: attendee });
        } else {
          people.push({ name: attendee });
        }
      }
    }

    const eventText = events.map(e =>
      `${e.time ?? 'TBD'}: ${e.title}${e.attendees.length > 0 ? ` (with ${e.attendees.join(', ')})` : ''}${e.meetingLink ? ` [Meeting link]` : ''}`
    ).join('\n');

    return {
      appCategory: 'calendar',
      structuredData: {
        events,
        eventCount: events.length,
        url: ctx.url,
      },
      rawText: `[Calendar]\n${eventText || ctx.visible_text.slice(0, 20).join('\n')}`,
      people,
      actionItems: [],
      confidence: events.length > 0 ? 0.8 : 0.4,
    };
  },
};
