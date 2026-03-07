import {
  getEventsForDateRange,
  createCalendarEvent,
} from '@/lib/integrations/google-calendar';
import {
  calculateDriveTime,
  isVirtualLocation,
} from '@/lib/integrations/google-maps';
import { createServiceClient } from '@/lib/db/client';
import { createOperationRun, completeOperationRun, failOperationRun } from '@/lib/db/queries/operations';
import { createTransitEvent, getTransitEventByCalendarEvent } from '@/lib/db/queries/transit';

export interface TransitCalculationResult {
  eventsProcessed: number;
  transitEventsCreated: number;
  skippedVirtual: number;
  skippedExisting: number;
  errors: Array<{ eventId: string; error: string }>;
}

export async function calculateCalendarTransit(
  userId: string,
  userTimezone: string,
  homeAddress: string | null,
  officeAddress: string | null
): Promise<TransitCalculationResult> {
  const supabase = createServiceClient();
  const run = await createOperationRun(supabase, userId, 'overnight_calendar');

  const result: TransitCalculationResult = {
    eventsProcessed: 0,
    transitEventsCreated: 0,
    skippedVirtual: 0,
    skippedExisting: 0,
    errors: [],
  };

  try {
    // Get today and tomorrow's events
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
    endOfTomorrow.setHours(0, 0, 0, 0);

    const events = await getEventsForDateRange(userId, startOfToday, endOfTomorrow);

    // Filter to events with physical locations (not virtual)
    const physicalEvents = events.filter(
      (e) => !e.isAllDay && e.location && !isVirtualLocation(e.location)
    );

    result.eventsProcessed = events.length;
    result.skippedVirtual = events.filter(
      (e) => !e.isAllDay && e.location && isVirtualLocation(e.location)
    ).length;

    // Default origin is home address or office address
    const defaultOrigin = homeAddress ?? officeAddress;

    for (let i = 0; i < physicalEvents.length; i++) {
      const event = physicalEvents[i];

      try {
        // Check if transit event already exists
        const existing = await getTransitEventByCalendarEvent(supabase, userId, event.id);
        if (existing) {
          result.skippedExisting++;
          continue;
        }

        // Determine origin: previous event's location or default
        let origin: string;
        if (i > 0 && physicalEvents[i - 1].location) {
          origin = physicalEvents[i - 1].location;
        } else if (defaultOrigin) {
          origin = defaultOrigin;
        } else {
          // No origin available, skip
          result.errors.push({
            eventId: event.id,
            error: 'No origin address available (set home or office address)',
          });
          continue;
        }

        const eventStart = new Date(event.start);
        // Calculate drive time arriving 5 min before event
        const arriveBy = new Date(eventStart.getTime() - 5 * 60 * 1000);

        const driveTime = await calculateDriveTime(origin, event.location, arriveBy);

        // Calculate departure time
        const departureTime = new Date(eventStart.getTime() - driveTime.durationSeconds * 1000 - 5 * 60 * 1000);

        // Create transit buffer event on Google Calendar
        const transitTitle = `[Transit] → ${event.summary}`;
        const transitDescription = `Drive from ${driveTime.origin} to ${driveTime.destination}\nEstimated drive time: ${driveTime.durationText}\nDistance: ${driveTime.distanceText}`;

        const gcalEventId = await createCalendarEvent(userId, {
          summary: transitTitle,
          description: transitDescription,
          start: { dateTime: departureTime.toISOString() },
          end: { dateTime: eventStart.toISOString() },
          colorId: '8', // Graphite color for transit events
        });

        // Store in transit_events table
        await createTransitEvent(supabase, {
          user_id: userId,
          calendar_event_id: event.id,
          origin_location: origin,
          destination_location: event.location,
          drive_duration_seconds: driveTime.durationSeconds,
          departure_time: departureTime.toISOString(),
          arrival_time: eventStart.toISOString(),
          google_calendar_event_id: gcalEventId,
        });

        result.transitEventsCreated++;
      } catch (err) {
        result.errors.push({
          eventId: event.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await completeOperationRun(supabase, run.id, result as unknown as Record<string, unknown>);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await failOperationRun(supabase, run.id, errorMessage);
    throw err;
  }
}
