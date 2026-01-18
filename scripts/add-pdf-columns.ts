import { pool } from '../server/db';

async function addPdfColumns() {
  const client = await pool.connect();
  try {
    console.log('Adding PDF columns to contracts table...');
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'contracts' AND column_name = 'pdf_data'
        ) THEN
          ALTER TABLE contracts ADD COLUMN pdf_data TEXT;
          RAISE NOTICE 'Added pdf_data column';
        ELSE
          RAISE NOTICE 'pdf_data column already exists';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'contracts' AND column_name = 'pdf_generated_at'
        ) THEN
          ALTER TABLE contracts ADD COLUMN pdf_generated_at TIMESTAMP;
          RAISE NOTICE 'Added pdf_generated_at column';
        ELSE
          RAISE NOTICE 'pdf_generated_at column already exists';
        END IF;
      END $$;
    `);
    
    console.log('PDF columns added successfully!');
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contracts' 
      ORDER BY ordinal_position
    `);
    
    console.log('Contracts table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Error adding columns:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addPdfColumns().catch(console.error);
