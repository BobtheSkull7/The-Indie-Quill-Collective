import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.SUPABASE_DEV_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    // Get users table columns
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'users' ORDER BY ordinal_position
    `);
    console.log('Users table columns:', cols.rows);
    
    // Get sample users
    const users = await client.query(`SELECT * FROM users LIMIT 3`);
    console.log('Sample users:', users.rows);
    
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
