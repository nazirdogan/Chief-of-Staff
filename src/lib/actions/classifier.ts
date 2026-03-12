import type { PendingAction, UserAutonomySettings } from '@/lib/db/types';
import { AutonomyTier } from '@/lib/db/types';

/**
 * Classifies a pending action into an autonomy tier.
 * Pure synchronous function — no AI calls, no DB calls, no side effects.
 */
export function classifyAction(
  action: Pick<PendingAction, 'action_type' | 'payload'>,
  userSettings: UserAutonomySettings[],
): AutonomyTier {
  const { action_type, payload } = action;

  // ── ALWAYS Tier 3 (hardcoded, cannot be overridden) ──
  if (action_type === 'send_email') {
    return AutonomyTier.FULL;
  }

  // ── view_meeting_prep is ALWAYS Tier 2 (informational toast) ──
  if (action_type === 'view_meeting_prep') {
    return AutonomyTier.ONE_TAP;
  }

  // ── Commitment reminders are always Tier 2 (one-tap toast) ──
  if (action_type === 'task_reminder') {
    return AutonomyTier.ONE_TAP;
  }

  // ── set_reminder is ALWAYS Tier 1 (SILENT) — user-initiated, low-stakes ──
  if (action_type === 'set_reminder') {
    return AutonomyTier.SILENT;
  }

  const settings = userSettings.find((s) => s.action_type === action_type);
  const tier1Enabled = settings?.tier_1_enabled === true;
  const tier2Enabled = settings?.tier_2_enabled === true;

  let tier: AutonomyTier = AutonomyTier.FULL; // default fallback

  // ── Tier 1 conditions (silent auto-execute) ──
  if (tier1Enabled) {
    if (action_type === 'create_task') {
      tier = AutonomyTier.SILENT;
    } else if (action_type === 'update_notion_page' && payload.shared !== true) {
      tier = AutonomyTier.SILENT;
    } else if (
      action_type === 'archive_email' &&
      payload.cold_start_complete === true &&
      (payload.engagement_score as number) < 0.3 &&
      payload.has_commitment === false &&
      payload.sender_is_vip === false &&
      payload.has_active_thread === false &&
      payload.sender_is_whitelisted === false
    ) {
      tier = AutonomyTier.SILENT;
    }
  }

  // ── Tier 2 conditions (one-tap) — only if not already Tier 1 ──
  if (tier === AutonomyTier.FULL) {
    if (
      action_type === 'send_message' &&
      payload.recipient_is_known === true
    ) {
      tier = AutonomyTier.ONE_TAP;
    } else if (
      action_type === 'reschedule_meeting' &&
      (payload.attendee_count as number) <= 3 &&
      payload.is_external !== true
    ) {
      tier = AutonomyTier.ONE_TAP;
    } else if (
      action_type === 'create_calendar_event' &&
      (!payload.attendees ||
        (payload.attendees as unknown[]).length === 0)
    ) {
      tier = AutonomyTier.ONE_TAP;
    } else if (
      action_type === 'archive_email' &&
      (payload.engagement_score as number) >= 0.3 &&
      (payload.engagement_score as number) < 0.6 &&
      payload.has_commitment === false &&
      payload.sender_is_vip === false
    ) {
      tier = AutonomyTier.ONE_TAP;
    } else if (tier2Enabled) {
      tier = AutonomyTier.ONE_TAP;
    }
  }

  // ── Escalation overrides ──
  if (action_type === 'create_task' && tier === AutonomyTier.SILENT) {
    const dueDate = payload.due_date as string | undefined;
    if (dueDate) {
      const dueTime = new Date(dueDate).getTime();
      const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;
      if (dueTime <= twoHoursFromNow) {
        tier = AutonomyTier.ONE_TAP;
      }
    }
  }

  if (action_type === 'send_message' && payload.recipient_is_known !== true) {
    tier = AutonomyTier.FULL;
  }

  if (action_type === 'reschedule_meeting') {
    if ((payload.attendee_count as number) > 3 || payload.is_external === true) {
      tier = AutonomyTier.FULL;
    }
  }

  if (action_type === 'update_notion_page' && payload.shared === true) {
    tier = Math.max(tier, AutonomyTier.ONE_TAP) as AutonomyTier;
  }

  if (action_type === 'archive_email') {
    if (payload.has_commitment === true) {
      tier = AutonomyTier.FULL;
    }
    if (payload.sender_is_vip === true) {
      tier = AutonomyTier.FULL;
    }
    if (payload.cold_start_complete === false) {
      tier = AutonomyTier.FULL;
    }
  }

  return tier;
}
