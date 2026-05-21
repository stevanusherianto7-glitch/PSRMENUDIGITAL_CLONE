const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
const client = new Client({ connectionString: process.env.DIRECT_URL });
async function test() {
  await client.connect();
  const today = new Date().toISOString().slice(0, 10);
  const res = await client.query("SELECT id, total, created_at, method, status FROM transactions WHERE created_at >= $1", [today + 'T00:00:00.000Z']);
  console.log('Today transactions count:', res.rows.length);
  console.log('Transactions:', res.rows);
  await client.end();
}
test().catch(console.error);
