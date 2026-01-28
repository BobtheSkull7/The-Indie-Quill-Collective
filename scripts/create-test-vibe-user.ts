import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.SUPABASE_DEV_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestUser() {
  const client = await pool.connect();
  try {
    // Generate a test vibe_scribe_id in xxx-xxx format
    const vibeId = '123-456';
    
    // Check if a user with this vibe_scribe_id already exists
    const existing = await client.query(
      `SELECT id, email, vibe_scribe_id FROM users WHERE vibe_scribe_id = $1`,
      [vibeId]
    );
    
    if (existing.rows.length > 0) {
      console.log('Test user already exists:', existing.rows[0]);
      return;
    }
    
    // Update an existing student user to have a vibe_scribe_id
    // First find a student or applicant user
    const candidate = await client.query(`
      SELECT id, email, role FROM users 
      WHERE role IN ('student', 'applicant') AND vibe_scribe_id IS NULL
      LIMIT 1
    `);
    
    if (candidate.rows.length > 0) {
      const user = candidate.rows[0];
      await client.query(
        `UPDATE users SET vibe_scribe_id = $1, role = 'student' WHERE id = $2`,
        [vibeId, user.id]
      );
      console.log(`Updated user ${user.email} with vibe_scribe_id: ${vibeId}`);
    } else {
      console.log('No suitable user found to update. Creating new user...');
      // Create a new test user with vibe_scribe_id
      const crypto = await import('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('test123', salt, 64).toString('hex');
      const password = `${salt}:${hash}`;
      
      await client.query(`
        INSERT INTO users (id, email, password, first_name, last_name, role, vibe_scribe_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        crypto.randomUUID(),
        'vibetest@test.com',
        password,
        'VibeScribe',
        'Tester',
        'student',
        vibeId
      ]);
      console.log(`Created test user vibetest@test.com with vibe_scribe_id: ${vibeId}`);
    }
    
    // Verify the user
    const verify = await client.query(
      `SELECT id, email, first_name, role, vibe_scribe_id FROM users WHERE vibe_scribe_id = $1`,
      [vibeId]
    );
    console.log('Test user ready:', verify.rows[0]);
    console.log('\n=== VibeScribe Test Credentials ===');
    console.log('Author ID (keypad login):', vibeId);
    
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser().catch(console.error);
