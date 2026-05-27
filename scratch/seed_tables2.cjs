const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL || 'https://ugfpbkjuxrdgveyfbfks.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_goaDeAnsgkAQ1ZQM_lArBQ_LhC6vN-7';

const client = createClient(url, key);

async function main() {
  const { data, error } = await client.from('tables').insert([
    { id: "A1", status: "available" },
    { id: "A2", status: "available" },
    { id: "A7", status: "available" }, // Admin test uses A7
    { id: "A8", status: "available" },
    { id: "A9", status: "available" }
  ]).select();
  console.log("Inserted:", data);
  if (error) console.log("Error:", error);
}

main();
