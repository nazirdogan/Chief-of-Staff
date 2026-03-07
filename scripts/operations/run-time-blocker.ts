#!/usr/bin/env tsx
/**
 * Run Time Blocker: generate and optionally confirm a time-blocked schedule
 * Usage: npm run ops:timeblock -- <user_id>
 */

import 'dotenv/config';
import * as readline from 'readline';
import { generateTimeBlocks, confirmTimeBlockSchedule } from '../../src/lib/ai/agents/operations/time-blocker';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function main() {
  const userId = process.argv[2] || process.env.OPS_USER_ID;
  if (!userId) {
    console.error('Usage: npm run ops:timeblock -- <user_id>');
    process.exit(1);
  }

  console.log('\n=== TIME BLOCKER ===\n');
  console.log('Generating schedule...\n');

  const schedule = await generateTimeBlocks(userId);

  if (schedule.blocks.length === 0) {
    console.log('No blocks to schedule. All tasks are either done or deferred.');
    return;
  }

  console.log('PROPOSED SCHEDULE:');
  console.log('-'.repeat(60));
  for (const block of schedule.blocks) {
    const duration = Math.round(
      (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60000
    );
    console.log(
      `  ${formatTime(block.start_time)} - ${formatTime(block.end_time)}  [${block.block_type}]  ${block.title}  (${duration}m)`
    );
  }
  console.log('-'.repeat(60));

  if (schedule.overflow.length > 0) {
    console.log(`\nOVERFLOW (${schedule.overflow.length} tasks don't fit today):`);
    for (const task of schedule.overflow) {
      console.log(`  - ${task.title} → ${task.recommendedDate} (${task.reason})`);
    }
  }

  const answer = await ask(`\nCreate ${schedule.blocks.length} calendar events? (yes/no): `);
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('Aborted. Proposed blocks saved but not confirmed.');
    return;
  }

  const result = await confirmTimeBlockSchedule(userId, schedule.runId);
  console.log(`\nCreated ${result.eventsCreated} calendar events.`);
  console.log('\n=== TIME BLOCKER COMPLETE ===\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
