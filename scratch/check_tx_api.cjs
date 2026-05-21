const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', today + 'T00:00:00.000Z')
    .lte('created_at', today + 'T23:59:59.999Z');
  if (error) throw error;
  console.log('Today transactions count:', data.length);
  console.log('Transactions:', data);
}
test().catch(console.error);
