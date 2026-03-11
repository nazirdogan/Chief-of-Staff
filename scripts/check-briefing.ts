import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;

  const { data, error } = await db.from('briefings').select('*').limit(3);
  console.log('error:', error?.message);
  console.log('briefings:', JSON.stringify(data, null, 2));
}
main();
