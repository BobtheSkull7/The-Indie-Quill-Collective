import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.SUPABASE_DEV_URL,
  ssl: { rejectUnauthorized: false }
});

async function pushSchema() {
  const client = await pool.connect();
  try {
    // Check users.id type
    const idType = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    console.log('users.id type:', idType.rows[0]?.data_type);
    
    // Check if vibe_scribe_id column exists
    const vsCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'vibe_scribe_id'
    `);
    
    if (vsCol.rows.length === 0) {
      console.log('Adding vibe_scribe_id column to users...');
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_scribe_id VARCHAR(20)`);
    } else {
      console.log('vibe_scribe_id column already exists');
    }
    
    // Create missing tables with correct VARCHAR FK types
    const sql = `
-- Wiki entries (use VARCHAR for author_id to match users.id)
CREATE TABLE IF NOT EXISTS wiki_entries (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category VARCHAR(100) DEFAULT 'general',
  author_id VARCHAR(36),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- VibeScribe quizzes
CREATE TABLE IF NOT EXISTS vibe_quizzes (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer VARCHAR(10),
  time_limit INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- VibeScribe quiz answers (use VARCHAR for user_id)
CREATE TABLE IF NOT EXISTS vibe_quiz_answers (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES vibe_quizzes(id),
  user_id VARCHAR(36),
  answer VARCHAR(10),
  is_correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_vibe_scribe_id ON users(vibe_scribe_id);
    `;
    
    await client.query(sql);
    console.log('Schema updated successfully!');
    
    // Check a user with vibe_scribe_id
    const testUser = await client.query(`
      SELECT id, username, role, vibe_scribe_id FROM users LIMIT 5
    `);
    console.log('Sample users:', testUser.rows);
    
  } finally {
    client.release();
    await pool.end();
  }
}

pushSchema().catch(console.error);
