import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationCategory =
  | 'meeting_prep'
  | 'task_extraction'
  | 'email_drafts'
  | 'proactive_suggestions'
  | 'calendar_alerts'
  | 'research_reports';

export const NOTIFICATION_CATEGORIES: Array<{
  id: NotificationCategory;
  label: string;
  description: string;
}> = [
  {
    id: 'meeting_prep',
    label: 'Meeting Prep',
    description: 'Automatic meeting prep briefs before meetings',
  },
  {
    id: 'task_extraction',
    label: 'Task Extraction',
    description: 'Notifications when new tasks are detected',
  },
  {
    id: 'email_drafts',
    label: 'Email Draft Suggestions',
    description: 'Proactive draft replies for VIP emails',
  },
  {
    id: 'proactive_suggestions',
    label: 'Proactive Suggestions',
    description: 'General proactive insights and nudges',
  },
  {
    id: 'calendar_alerts',
    label: 'Calendar Alerts',
    description: 'Upcoming meeting and schedule change alerts',
  },
  {
    id: 'research_reports',
    label: 'Research Reports',
    description: 'Generated research and weekly reports',
  },
];

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<NotificationCategory, boolean>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('notification_preferences')
    .select('category, enabled')
    .eq('user_id', userId);

  const prefs: Record<string, boolean> = {};
  for (const cat of NOTIFICATION_CATEGORIES) {
    prefs[cat.id] = true; // Default enabled
  }
  for (const row of (data ?? []) as Array<{
    category: string;
    enabled: boolean;
  }>) {
    if (row.category in prefs) {
      prefs[row.category] = row.enabled;
    }
  }
  return prefs as Record<NotificationCategory, boolean>;
}

export async function updateNotificationPreference(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory,
  enabled: boolean,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: existing } = await db
    .from('notification_preferences')
    .select('id')
    .eq('user_id', userId)
    .eq('category', category)
    .single();

  if (existing) {
    await db
      .from('notification_preferences')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await db
      .from('notification_preferences')
      .insert({ user_id: userId, category, enabled });
  }
}

export async function isNotificationEnabled(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', userId)
    .eq('category', category)
    .single();

  return data?.enabled ?? true; // Default to enabled
}
