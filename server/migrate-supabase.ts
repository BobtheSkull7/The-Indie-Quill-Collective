import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

const targetEnv = process.argv[2] || 'dev';
const rawUrl = targetEnv === 'prod' ? process.env.SUPABASE_PROD_URL : process.env.SUPABASE_DEV_URL;
if (!rawUrl) {
  console.error(`SUPABASE_${targetEnv.toUpperCase()}_URL not set`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: encodePasswordInUrl(rawUrl),
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log(`[Migrate] Connected to Supabase ${targetEnv} database`);
    await client.query("BEGIN");

    console.log("[Migrate] Step 1: Delete old data (card_submissions, manuscripts, tome_absorptions, vibe_cards)");
    await client.query("DELETE FROM card_submissions");
    await client.query("DELETE FROM manuscripts");
    await client.query("DELETE FROM tome_absorptions");
    await client.query("DELETE FROM vibe_cards");

    console.log("[Migrate] Step 2: Create tomes table");
    await client.query(`
      CREATE TABLE IF NOT EXISTS tomes (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER NOT NULL REFERENCES vibe_decks(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log("[Migrate] Step 3: Restructure vibe_cards - drop old deck_id FK, add tome_id");
    const hasOldDeckId = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'vibe_cards' AND column_name = 'deck_id'
    `);
    
    if (hasOldDeckId.rows.length > 0) {
      const fkResult = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'vibe_cards' AND constraint_type = 'FOREIGN KEY'
      `);
      for (const row of fkResult.rows) {
        await client.query(`ALTER TABLE vibe_cards DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
      }
      await client.query(`ALTER TABLE vibe_cards DROP COLUMN IF EXISTS deck_id`);
    }

    const hasTomeId = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'vibe_cards' AND column_name = 'tome_id'
    `);
    if (hasTomeId.rows.length === 0) {
      await client.query(`ALTER TABLE vibe_cards ADD COLUMN tome_id INTEGER REFERENCES tomes(id) ON DELETE CASCADE`);
    }

    console.log("[Migrate] Step 4: Restructure tome_absorptions - change deck_id to tome_id");
    const hasOldTomeDeckId = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tome_absorptions' AND column_name = 'deck_id'
    `);
    if (hasOldTomeDeckId.rows.length > 0) {
      const fkResult = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'tome_absorptions' AND constraint_type = 'FOREIGN KEY'
      `);
      for (const row of fkResult.rows) {
        await client.query(`ALTER TABLE tome_absorptions DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
      }
      const ucResult = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'tome_absorptions' AND constraint_type = 'UNIQUE'
      `);
      for (const row of ucResult.rows) {
        await client.query(`ALTER TABLE tome_absorptions DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
      }
      await client.query(`ALTER TABLE tome_absorptions DROP COLUMN IF EXISTS deck_id`);
    }

    const hasTomeIdAbsorption = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tome_absorptions' AND column_name = 'tome_id'
    `);
    if (hasTomeIdAbsorption.rows.length === 0) {
      await client.query(`ALTER TABLE tome_absorptions ADD COLUMN tome_id INTEGER REFERENCES tomes(id) ON DELETE CASCADE`);
    }
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'tome_absorptions' AND constraint_name = 'tome_absorptions_user_tome_unique'
        ) THEN
          ALTER TABLE tome_absorptions ADD CONSTRAINT tome_absorptions_user_tome_unique UNIQUE(user_id, tome_id);
        END IF;
      END $$;
    `);

    console.log("[Migrate] Step 5: Clean up vibe_decks - remove old tome columns");
    await client.query(`ALTER TABLE vibe_decks DROP COLUMN IF EXISTS tome_title`);
    await client.query(`ALTER TABLE vibe_decks DROP COLUMN IF EXISTS tome_content`);

    console.log("[Migrate] Step 6: Clean old decks and set up Published Writer curriculum");
    await client.query(`DELETE FROM vibe_decks`);

    await client.query(`
      UPDATE curriculums SET title = 'Published Writer', description = 'Path to becoming a published author', is_published = true, updated_at = NOW() WHERE id = 1
    `);
    const otherCurrs = await client.query(`SELECT id FROM curriculums WHERE id != 1`);
    for (const row of otherCurrs.rows) {
      await client.query(`DELETE FROM curriculums WHERE id = ${row.id}`);
    }

    console.log("[Migrate] Step 7: Insert 3 TBD decks under Published Writer");
    await client.query(`
      INSERT INTO vibe_decks (curriculum_id, title, description, order_index, is_published, created_at, updated_at)
      VALUES 
        (1, 'TBD 1', 'First deck - content coming soon', 1, true, NOW(), NOW()),
        (1, 'TBD 2', 'Second deck - content coming soon', 2, true, NOW(), NOW()),
        (1, 'TBD 3', 'Third deck - content coming soon', 3, true, NOW(), NOW())
    `);

    await client.query("COMMIT");
    console.log("[Migrate] All changes committed!");

    const finalC = await client.query("SELECT id, title, is_published FROM curriculums ORDER BY id");
    console.log("[Migrate] Curriculums:", finalC.rows);
    const finalD = await client.query("SELECT id, curriculum_id, title, is_published FROM vibe_decks ORDER BY id");
    console.log("[Migrate] Decks:", finalD.rows);
    const finalT = await client.query("SELECT COUNT(*) as count FROM tomes");
    console.log("[Migrate] Tomes:", finalT.rows[0]);
    const finalCards = await client.query("SELECT COUNT(*) as count FROM vibe_cards");
    console.log("[Migrate] Cards:", finalCards.rows[0]);

    const cols = await client.query(`
      SELECT table_name, column_name FROM information_schema.columns 
      WHERE table_name IN ('vibe_cards', 'tome_absorptions', 'tomes') 
      ORDER BY table_name, ordinal_position
    `);
    console.log("[Migrate] Schema verification:");
    for (const row of cols.rows) {
      console.log(`  ${row.table_name}.${row.column_name}`);
    }

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Migrate] Error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().then(() => { console.log("[Migrate] Done!"); process.exit(0); }).catch((err) => { console.error("[Migrate] Failed:", err); process.exit(1); });
