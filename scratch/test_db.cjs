const { Client } = require('pg');
require('dotenv').config();

const directUrl = (process.env.DIRECT_URL || '').replace(/^["']|["']$/g, '');
console.log('Using connection string:', directUrl.replace(/:[^:@]+@/, ':****@'));

const client = new Client({
  connectionString: directUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected successfully!');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));

    await client.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

run();
