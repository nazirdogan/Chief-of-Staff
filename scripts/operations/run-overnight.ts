#!/usr/bin/env tsx
/**
 * Run overnight automations: calendar transit + email triage
 * Usage: npm run ops:overnight
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and a valid user ID.
 * Pass user ID as first argument or set OPS_USER_ID env var.
 */

import 'dotenv/config';
import { calculateCalendarTransit } from '../../src/lib/ai/agents/operations/calendar-transit';
import { triageEmails } from '../../src/lib/ai/agents/operations/email-triage';
import { createServiceClient } from '../../src/lib/db/client';

async function main() {
  const userId = process.argv[2] || process.env.OPS_USER_ID;
  if (!userId) {
    console.error('Usage: npm run ops:overnight -- <user_id>');
    console.error('Or set OPS_USER_ID environment variable');
    process.exit(1);
  }

  const supabase = createServiceClient();

  // Fetch user profile and config
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }

  const p = profile as Record<string, unknown>;
  const { data: config } = await supabase.from('user_operations_config').select('*').eq('user_id', userId).single();
  const c = config as Record<string, unknown> | null;

  console.log(`\n=== OVERNIGHT AUTOMATIONS for ${p.email} ===\n`);

  // 1. Calendar Transit
  console.log('--- Calendar Transit Calculator ---');
  try {
    const transitResult = await calculateCalendarTransit(
      userId,
      String(p.timezone ?? 'Asia/Dubai'),
      (c?.home_address as string) ?? null,
      (c?.office_address as string) ?? null
    );
    console.log(`  Events processed: ${transitResult.eventsProcessed}`);
    console.log(`  Transit events created: ${transitResult.transitEventsCreated}`);
    console.log(`  Skipped (virtual): ${transitResult.skippedVirtual}`);
    console.log(`  Skipped (existing): ${transitResult.skippedExisting}`);
    if (transitResult.errors.length > 0) {
      console.log(`  Errors: ${transitResult.errors.length}`);
      transitResult.errors.forEach((e) => console.log(`    - ${e.eventId}: ${e.error}`));
    }
  } catch (err) {
    console.error('  Calendar transit failed:', err instanceof Error ? err.message : err);
  }

  // 2. Email Triage
  console.log('\n--- Email Triage ---');
  try {
    const { data: onboarding } = await supabase.from('onboarding_data').select('*').eq('user_id', userId).single();
    const o = onboarding as Record<string, unknown> | null;

    const { data: integration } = await supabase
      .from('user_integrations')
      .select('account_email')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .single();

    const userEmail = (integration as Record<string, unknown> | null)?.account_email ?? p.email;

    const triageResult = await triageEmails(
      userId,
      String(userEmail),
      (o?.vip_contacts as string[]) ?? [],
      (o?.active_projects as string[]) ?? []
    );

    console.log(`  Emails scanned: ${triageResult.emailsScanned}`);
    console.log(`  Tasks created: ${triageResult.tasksCreated}`);
    console.log(`  Skipped (newsletter): ${triageResult.skippedNewsletter}`);
    console.log(`  Skipped (notification): ${triageResult.skippedNotification}`);
    console.log(`  Skipped (CC only): ${triageResult.skippedCCOnly}`);
    console.log(`  Skipped (duplicate): ${triageResult.skippedDuplicate}`);
    console.log(`  Skipped (not actionable): ${triageResult.skippedNotActionable}`);
    if (triageResult.errors.length > 0) {
      console.log(`  Errors: ${triageResult.errors.length}`);
    }
  } catch (err) {
    console.error('  Email triage failed:', err instanceof Error ? err.message : err);
  }

  console.log('\n=== OVERNIGHT COMPLETE ===\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
