const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (error) {
      console.error("Error fetching transaction columns:", error);
    } else {
      console.log("Transaction columns:", data.length > 0 ? Object.keys(data[0]) : "No transactions found");
      console.log("First transaction item:", data[0]);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
