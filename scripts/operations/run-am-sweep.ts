#!/usr/bin/env tsx
/**
 * Run AM Sweep: classify tasks and dispatch subagents
 * Usage: npm run ops:sweep -- <user_id>
 */

import 'dotenv/config';
import * as readline from 'readline';
import { classifyTasks, presentClassification } from '../../src/lib/ai/agents/operations/am-sweep';
import { dispatchSubagents } from '../../src/lib/ai/agents/operations/dispatch';
import { formatCompletionReport } from '../../src/lib/ai/agents/operations/completion-report';

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
    console.error('Usage: npm run ops:sweep -- <user_id>');
    process.exit(1);
  }

  console.log('\n=== AM SWEEP ===\n');
  console.log('Classifying tasks...\n');

  const classified = await classifyTasks(userId);
  console.log(presentClassification(classified));

  const total = classified.green.length + classified.yellow.length;
  if (total === 0) {
    console.log('No tasks to dispatch. Done.');
    return;
  }

  const answer = await ask(`\nDispatch ${total} tasks to agents? (yes/no): `);
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    return;
  }

  console.log('\nDispatching to 6 agents in parallel...\n');

  const report = await dispatchSubagents(
    userId,
    classified.runId,
    classified.green,
    classified.yellow
  );

  const formatted = formatCompletionReport(report);
  console.log('\n=== COMPLETION REPORT ===\n');
  for (const section of formatted.sections) {
    console.log(`[${section.title}]`);
    for (const item of section.items) {
      console.log(`  - ${item.label}`);
      if (item.detail) console.log(`    ${item.detail}`);
    }
    console.log('');
  }
  console.log(formatted.summary);

  console.log('\nReport ready in-app.');

  console.log('\n=== AM SWEEP COMPLETE ===\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
