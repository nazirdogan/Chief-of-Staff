/**
 * Timezone utilities for Donna.
 *
 * All briefing scheduling, date calculations, and time-windowed queries
 * must use the user's timezone rather than UTC.
 */

/**
 * Get today's date string (YYYY-MM-DD) in the given IANA timezone.
 */
export function getTodayInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Invalid timezone — fall back to UTC
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get the current hour (0-23) in the given IANA timezone.
 */
export function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    return new Date().getUTCHours();
  }
}

/**
 * Check if the current time in the user's timezone is within the briefing
 * delivery window. The window is +/- 30 minutes from the target hour.
 *
 * @param briefingTime - HH:MM string (e.g. "07:00")
 * @param timezone - IANA timezone (e.g. "Asia/Bahrain")
 * @returns true if now is within the delivery window
 */
export function isInBriefingWindow(briefingTime: string, timezone: string): boolean {
  try {
    const [targetHour, targetMinute] = briefingTime.split(':').map(Number);
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);

    const currentTotal = currentHour * 60 + currentMinute;
    const targetTotal = targetHour * 60 + targetMinute;

    // 30-minute window around the target time
    return Math.abs(currentTotal - targetTotal) <= 30;
  } catch {
    // If timezone is invalid, allow generation (better to generate than skip)
    return true;
  }
}
