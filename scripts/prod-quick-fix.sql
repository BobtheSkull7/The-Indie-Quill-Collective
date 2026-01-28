-- ============================================================================
-- QUICK FIX: Fix family_units table and add missing columns
-- Run this in Supabase Production SQL Editor
-- ============================================================================

-- Fix family_units: rename 'name' to 'family_name' if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_units' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_units' AND column_name = 'family_name'
  ) THEN
    ALTER TABLE family_units RENAME COLUMN name TO family_name;
  END IF;
END $$;

-- Add missing columns to family_units
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS primary_contact_id INTEGER;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS target_pact_hours INTEGER DEFAULT 20;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS total_pact_minutes INTEGER DEFAULT 0;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS anthology_title TEXT;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS anthology_content TEXT;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS anthology_word_count INTEGER DEFAULT 0;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add family_name column if table was created without it
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS family_name TEXT;

-- Update any null family_name values with a default
UPDATE family_units SET family_name = 'Unknown Family' WHERE family_name IS NULL;

-- Student profiles needs family columns
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS family_unit_id INTEGER;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS family_role TEXT;

-- ============================================================================
-- DONE! Refresh your browser and test the Intake page.
-- ============================================================================
