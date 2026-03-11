import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;

  // Check if briefings table exists and what errors come back
  const { data: briefings, error: bErr } = await db.from('briefings').select('id').limit(1);
  console.log('briefings table:', bErr ? `ERROR: ${bErr.message}` : `OK (${briefings?.length ?? 0} rows visible)`);

  // Check migrations applied
  const { data: migrations, error: mErr } = await db.from('supabase_migrations').select('version,name').order('version');
  if (mErr) {
    // Try schema_migrations
    const { data: m2, error: m2Err } = await db.schema('_realtime').rpc('list_applied_migrations');
    console.log('migrations via rpc:', m2Err?.message ?? JSON.stringify(m2));
  } else {
    console.log('Applied migrations:', JSON.stringify(migrations, null, 2));
  }
}
main();
