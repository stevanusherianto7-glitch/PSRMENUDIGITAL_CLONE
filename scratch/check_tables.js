const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ugfpbkjuxrdgveyfbfks.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvYURlQW5zZ2tBUTFaUU1fbEFyQlFfTGhDNnZOLTciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3Nzg5ODExOCwiZXhwIjoxOTkzNDc0MTE4fQ'
);

// Wait, the VITE_SUPABASE_ANON_KEY from .env is NOT a valid JWT!
// VITE_SUPABASE_ANON_KEY=sb_publishable_goaDeAnsgkAQ1ZQM_lArBQ_LhC6vN-7
// That is NOT a standard JWT anon key!
// Let's use the one from src/app/api.ts or just try fetching it.

async function main() {
  const url = process.env.VITE_SUPABASE_URL || 'https://ugfpbkjuxrdgveyfbfks.supabase.co';
  const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_goaDeAnsgkAQ1ZQM_lArBQ_LhC6vN-7';
  
  const client = createClient(url, key);
  
  const { data, error } = await client.from('tables').select('*');
  console.log("Tables:", data);
  console.log("Error:", error);
}

main();
