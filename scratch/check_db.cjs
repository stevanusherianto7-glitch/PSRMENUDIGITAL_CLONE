const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const client = new Client({ connectionString: process.env.DIRECT_URL });

async function run() {
  try {
    await client.connect();
    
    console.log("=== LATEST TRANSACTIONS ===");
    const txs = await client.query("SELECT id, table_id, total, created_at FROM transactions ORDER BY created_at DESC LIMIT 10");
    console.log(txs.rows);
    
    console.log("\n=== LATEST ORDERS ===");
    const orders = await client.query("SELECT id, table_id, status, total, created_at, served_at FROM orders ORDER BY created_at DESC LIMIT 10");
    console.log(orders.rows);
    
    console.log("\n=== TRANSACTIONS FOR TODAY (UTC) ===");
    const today = new Date().toISOString().slice(0, 10);
    const todayTxs = await client.query("SELECT count(*), sum(total) FROM transactions WHERE created_at >= $1::timestamptz", [today + 'T00:00:00.000Z']);
    console.log(todayTxs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
