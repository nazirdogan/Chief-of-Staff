#!/usr/bin/env tsx
/**
 * Run complete morning operations sequence:
 * 1. Overnight automations (calendar transit + email triage)
 * 2. AM Sweep (classify + dispatch)
 * 3. Time Blocker (schedule remaining tasks)
 *
 * Usage: npm run ops:full -- <user_id>
 */

import 'dotenv/config';
import * as readline from 'readline';
import { calculateCalendarTransit } from '../../src/lib/ai/agents/operations/calendar-transit';
import { triageEmails } from '../../src/lib/ai/agents/operations/email-triage';
import { classifyTasks, presentClassification } from '../../src/lib/ai/agents/operations/am-sweep';
import { dispatchSubagents } from '../../src/lib/ai/agents/operations/dispatch';
import { generateTimeBlocks, confirmTimeBlockSchedule } from '../../src/lib/ai/agents/operations/time-blocker';
import { formatCompletionReport, sendCompletionReportToTelegram } from '../../src/lib/ai/agents/operations/completion-report';
import { createServiceClient } from '../../src/lib/db/client';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const userId = process.argv[2] || process.env.OPS_USER_ID;
  if (!userId) {
    console.error('Usage: npm run ops:full -- <user_id>');
    process.exit(1);
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }

  const p = profile as Record<string, unknown>;
  const { data: config } = await supabase.from('user_operations_config').select('*').eq('user_id', userId).single();
  const c = config as Record<string, unknown> | null;
  const { data: onboarding } = await supabase.from('onboarding_data').select('*').eq('user_id', userId).single();
  const o = onboarding as Record<string, unknown> | null;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  MORNING OPERATIONS — ${p.email}`);
  console.log(`${'='.repeat(60)}\n`);

  // ── Step 1: Overnight Automations ──
  console.log('STEP 1: OVERNIGHT AUTOMATIONS\n');

  try {
    console.log('  [Calendar Transit]');
    const transitResult = await calculateCalendarTransit(
      userId, String(p.timezone ?? 'Asia/Dubai'), (c?.home_address as string) ?? null, (c?.office_address as string) ?? null
    );
    console.log(`    ${transitResult.transitEventsCreated} transit events created\n`);
  } catch (err) {
    console.error(`    Skipped: ${err instanceof Error ? err.message : err}\n`);
  }

  try {
    console.log('  [Email Triage]');
    const { data: integration } = await supabase
      .from('user_integrations').select('account_email')
      .eq('user_id', userId).eq('provider', 'gmail').single();
    const userEmail = (integration as Record<string, unknown> | null)?.account_email ?? p.email;

    const triageResult = await triageEmails(userId, String(userEmail), (o?.vip_contacts as string[]) ?? [], (o?.active_projects as string[]) ?? []);
    console.log(`    ${triageResult.emailsScanned} emails scanned, ${triageResult.tasksCreated} tasks created\n`);
  } catch (err) {
    console.error(`    Skipped: ${err instanceof Error ? err.message : err}\n`);
  }

  // ── Step 2: AM Sweep ──
  console.log('STEP 2: AM SWEEP\n');
  const classified = await classifyTasks(userId);
  console.log(presentClassification(classified));

  const dispatchCount = classified.green.length + classified.yellow.length;
  if (dispatchCount > 0) {
    const answer = await ask(`\nDispatch ${dispatchCount} tasks to agents? (yes/no): `);
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('\nDispatching...\n');
      const report = await dispatchSubagents(userId, classified.runId, classified.green, classified.yellow);
      const formatted = formatCompletionReport(report);

      for (const section of formatted.sections) {
        console.log(`  [${section.title}]`);
        for (const item of section.items) {
          console.log(`    - ${item.label}`);
        }
      }
      console.log(`\n  ${formatted.summary}`);

      try {
        await sendCompletionReportToTelegram(userId, report);
        console.log('  Report sent to Telegram.\n');
      } catch {
        // Telegram not connected
      }
    }
  }

  // ── Step 3: Time Blocker ──
  console.log('\nSTEP 3: TIME BLOCKER\n');
  const schedule = await generateTimeBlocks(userId);

  if (schedule.blocks.length > 0) {
    for (const block of schedule.blocks) {
      const time = new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      console.log(`  ${time}-${endTime}  [${block.block_type}]  ${block.title}`);
    }

    if (schedule.overflow.length > 0) {
      console.log(`\n  ${schedule.overflow.length} tasks overflow to future dates`);
    }

    const answer = await ask(`\nCreate ${schedule.blocks.length} calendar events? (yes/no): `);
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      const result = await confirmTimeBlockSchedule(userId, schedule.runId);
      console.log(`  Created ${result.eventsCreated} calendar events.`);
    }
  } else {
    console.log('  No tasks to schedule.');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  MORNING OPERATIONS COMPLETE');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
