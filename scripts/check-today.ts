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
  console.log('Looking for briefing_date =', today);

  const { data, error } = await db
    .from('briefings')
    .select('id,briefing_date,item_count,generated_at')
    .eq('briefing_date', today)
    .single();
  console.log('error:', error?.message);
  console.log('todays briefing:', JSON.stringify(data, null, 2));
}
main();
