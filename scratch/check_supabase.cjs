const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("Supabase URL:", supabaseUrl);
    console.log("Checking transactions table without table_id...");
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('id, total, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.error("Error fetching transactions:", txError);
    } else {
      console.log("Latest Transactions:", txs);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
