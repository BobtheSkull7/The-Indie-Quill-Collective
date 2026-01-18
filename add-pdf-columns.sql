-- Add PDF storage columns to contracts table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'pdf_data') THEN
        ALTER TABLE contracts ADD COLUMN pdf_data TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'pdf_generated_at') THEN
        ALTER TABLE contracts ADD COLUMN pdf_generated_at TIMESTAMP;
    END IF;
END $$;
