import { describe, it, expect } from 'vitest';
import { classifyAction } from './classifier';
import { AutonomyTier } from '@/lib/db/types';
import type { PendingAction, UserAutonomySettings } from '@/lib/db/types';

function makeSettings(
  action_type: string,
  overrides: Partial<UserAutonomySettings> = {},
): UserAutonomySettings {
  return {
    id: 'test-id',
    user_id: 'user-1',
    action_type: action_type as UserAutonomySettings['action_type'],
    tier_1_enabled: false,
    tier_2_enabled: true,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeAction(
  action_type: PendingAction['action_type'],
  payload: Record<string, unknown> = {},
): Pick<PendingAction, 'action_type' | 'payload'> {
  return { action_type, payload };
}

describe('classifyAction', () => {
  it('send_email always returns Tier 3', () => {
    const settings = [makeSettings('send_email', { tier_1_enabled: true })];
    expect(classifyAction(makeAction('send_email'), settings)).toBe(AutonomyTier.FULL);
  });

  it('create_task with tier_1_enabled returns Tier 1', () => {
    const settings = [makeSettings('create_task', { tier_1_enabled: true })];
    expect(classifyAction(makeAction('create_task'), settings)).toBe(AutonomyTier.SILENT);
  });

  it('create_task with due_date < 2h escalates to Tier 2', () => {
    const settings = [makeSettings('create_task', { tier_1_enabled: true })];
    const soonDueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min from now
    expect(
      classifyAction(makeAction('create_task', { due_date: soonDueDate }), settings),
    ).toBe(AutonomyTier.ONE_TAP);
  });

  it('send_message to unknown contact returns Tier 3', () => {
    const settings = [makeSettings('send_message')];
    expect(
      classifyAction(makeAction('send_message', { recipient_is_known: false }), settings),
    ).toBe(AutonomyTier.FULL);
  });

  it('no settings provided returns Tier 3 for non-Tier-1 types', () => {
    expect(classifyAction(makeAction('reschedule_meeting', { attendee_count: 5 }), [])).toBe(
      AutonomyTier.FULL,
    );
    expect(classifyAction(makeAction('send_message', {}), [])).toBe(AutonomyTier.FULL);
    expect(classifyAction(makeAction('create_task'), [])).toBe(AutonomyTier.FULL);
  });

  it('archive_email with low engagement + all checks clean returns Tier 1', () => {
    const settings = [makeSettings('archive_email', { tier_1_enabled: true })];
    expect(
      classifyAction(
        makeAction('archive_email', {
          engagement_score: 0.1,
          cold_start_complete: true,
          has_commitment: false,
          sender_is_vip: false,
          has_active_thread: false,
          sender_is_whitelisted: false,
        }),
        settings,
      ),
    ).toBe(AutonomyTier.SILENT);
  });

  it('archive_email with has_commitment=true always returns Tier 3', () => {
    const settings = [makeSettings('archive_email', { tier_1_enabled: true })];
    expect(
      classifyAction(
        makeAction('archive_email', {
          engagement_score: 0.1,
          cold_start_complete: true,
          has_commitment: true,
          sender_is_vip: false,
          has_active_thread: false,
          sender_is_whitelisted: false,
        }),
        settings,
      ),
    ).toBe(AutonomyTier.FULL);
  });

  it('archive_email with sender_is_vip=true always returns Tier 3', () => {
    const settings = [makeSettings('archive_email', { tier_1_enabled: true })];
    expect(
      classifyAction(
        makeAction('archive_email', {
          engagement_score: 0.1,
          cold_start_complete: true,
          has_commitment: false,
          sender_is_vip: true,
          has_active_thread: false,
          sender_is_whitelisted: false,
        }),
        settings,
      ),
    ).toBe(AutonomyTier.FULL);
  });

  it('archive_email with cold_start_complete=false always returns Tier 3', () => {
    const settings = [makeSettings('archive_email', { tier_1_enabled: true })];
    expect(
      classifyAction(
        makeAction('archive_email', {
          engagement_score: 0.1,
          cold_start_complete: false,
          has_commitment: false,
          sender_is_vip: false,
          has_active_thread: false,
          sender_is_whitelisted: false,
        }),
        settings,
      ),
    ).toBe(AutonomyTier.FULL);
  });

  it('archive_email with engagement_score=0.45 returns Tier 2', () => {
    const settings = [makeSettings('archive_email')];
    expect(
      classifyAction(
        makeAction('archive_email', {
          engagement_score: 0.45,
          cold_start_complete: true,
          has_commitment: false,
          sender_is_vip: false,
          has_active_thread: false,
          sender_is_whitelisted: false,
        }),
        settings,
      ),
    ).toBe(AutonomyTier.ONE_TAP);
  });

  it('reschedule_meeting with attendees > 3 escalates to Tier 3', () => {
    const settings = [makeSettings('reschedule_meeting')];
    expect(
      classifyAction(
        makeAction('reschedule_meeting', { attendee_count: 5, is_external: false }),
        settings,
      ),
    ).toBe(AutonomyTier.FULL);
  });
});
