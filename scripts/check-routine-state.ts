import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
  console.log('Today (Dubai):', today);
  const { data: briefings } = await db.from('briefings').select('id,briefing_date,item_count,created_at').order('created_at', { ascending: false }).limit(3);
  console.log('\nRecent briefings:', JSON.stringify(briefings, null, 2));
  const { data: routines } = await db.from('user_routines').select('id,name,routine_type,scheduled_time,last_run_at,is_enabled');
  console.log('\nUser routines:', JSON.stringify(routines, null, 2));
  const { data: outputs } = await db.from('routine_outputs').select('id,routine_id,generation_model,created_at,content').order('created_at', { ascending: false }).limit(3);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log('\nRecent routine outputs:', JSON.stringify(outputs?.map((o: any) => ({ ...o, content: String(o.content).slice(0, 100) + '…' })), null, 2));
}
main();
