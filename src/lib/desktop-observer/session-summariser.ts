/**
 * Session Summariser — DISABLED in cost-reduction refactor.
 *
 * Sessions are no longer summarised per-update. Instead, the end-of-day
 * narrative builder reads all sessions once at ~6pm and produces a single
 * coherent daily summary via ONE AI call.
 *
 * This function is kept as a no-op stub so imports in the ingest route
 * don't break. It can be re-enabled as an opt-in "Deep Work Mode" feature.
 */

export async function summariseActiveSession(_userId: string): Promise<void> {
  // No-op: per-session AI summarisation removed.
  // Cost reason: this was firing on every desktop ingest batch (potentially
  // hundreds of times per hour) at ~$0.002/call on Haiku.
  // The day narrative job at end-of-day replaces this.
  return;
}
