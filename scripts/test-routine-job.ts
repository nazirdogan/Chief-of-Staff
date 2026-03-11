/**
 * Quick smoke test for the run-user-routines job.
 *
 * Usage:
 *   npx tsx scripts/test-routine-job.ts
 *
 * What it tests:
 *  1. The user_routines table is accessible (migration 023 applied)
 *  2. runJob('run-user-routines', userId) runs without throwing
 *  3. Then sets a test routine's scheduled_time to NOW and re-runs,
 *     confirming an output is produced and last_run_at is updated.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient(SUPABASE_URL, SERVICE_KEY) as any;

// ─── helpers ────────────────────────────────────────────────────────────────

function nowHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  log('── Routine job smoke test ──');

  // 1. Find any real user
  const { data: profiles, error: profileErr } = await db
    .from('profiles')
    .select('id, timezone')
    .limit(1);

  if (profileErr || !profiles || profiles.length === 0) {
    console.error('No user profiles found — seed a user first.', profileErr);
    process.exit(1);
  }

  const userId: string = profiles[0].id;
  const timezone: string = profiles[0].timezone ?? 'UTC';
  log(`Using user ${userId} (timezone: ${timezone})`);

  // 2. Verify the table exists
  const { error: tableErr } = await db
    .from('user_routines')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (tableErr) {
    console.error('user_routines table not accessible:', tableErr.message);
    process.exit(1);
  }
  log('✓ user_routines table accessible');

  // 3. Create a temporary test routine scheduled for RIGHT NOW
  const testTime = nowHHMM();
  const { data: routine, error: insertErr } = await db
    .from('user_routines')
    .insert({
      user_id: userId,
      name: '[TEST] Routine job smoke test',
      description: 'Auto-created by test-routine-job.ts — safe to delete',
      routine_type: 'custom',
      frequency: 'daily',
      scheduled_time: testTime,
      is_enabled: true,
      instructions: 'Write one sentence: "Routine job test passed."',
    })
    .select()
    .single();

  if (insertErr || !routine) {
    console.error('Failed to insert test routine:', insertErr?.message);
    process.exit(1);
  }
  log(`✓ Created test routine (id: ${routine.id}, scheduled_time: ${testTime})`);

  try {
    // 4. Run the job — it should pick up the routine since scheduled_time = now
    log('Running runJob(run-user-routines)…');
    const { runJob } = await import('../src/lib/worker/job-runner.js');
    const result = await runJob('run-user-routines', userId);
    log(`✓ runJob completed → processed: ${result.processed}, found: ${result.found ?? '?'}, error: ${result.error ?? 'none'}`);

    if (result.processed === 0) {
      log('⚠ No routines processed — this may be a timezone offset issue. Check the scheduled_time vs current local time.');
    }

    // 5. Check that last_run_at was stamped (proves the routine ran)
    const { data: updated } = await db
      .from('user_routines')
      .select('last_run_at')
      .eq('id', routine.id)
      .single();

    if (updated?.last_run_at) {
      log(`✓ last_run_at stamped: ${updated.last_run_at}`);
    } else {
      log('⚠ last_run_at not set — routine may not have fired (check timezone alignment)');
    }

    // 6. Check routine_outputs for a generated output
    const { data: outputs } = await db
      .from('routine_outputs')
      .select('id, content, generation_model, generation_ms, created_at')
      .eq('routine_id', routine.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (outputs && outputs.length > 0) {
      log(`✓ Output generated (${outputs[0].generation_ms}ms via ${outputs[0].generation_model})`);
      log(`  Content preview: "${String(outputs[0].content).slice(0, 120)}…"`);
    } else {
      log('⚠ No output row found in routine_outputs');
    }

  } finally {
    // 7. Always clean up the test routine
    await db.from('routine_outputs').delete().eq('routine_id', routine.id);
    await db.from('user_routines').delete().eq('id', routine.id);
    log('✓ Test routine cleaned up');
  }

  log('── Test complete ──');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
