-- ============================================================================
-- PRODUCTION SCHEMA MIGRATION - SAFE ADDITIVE ONLY
-- This script aligns production with development schema
-- NO destructive operations - all existing data is preserved
-- Run this in Supabase Production SQL Editor
-- ============================================================================

-- ============================================================================
-- PHASE 1: SESSION TABLE (Required for authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ============================================================================
-- PHASE 2: RENAME pseudonym -> pen_name (preserves data)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'pseudonym'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'pen_name'
  ) THEN
    ALTER TABLE applications RENAME COLUMN pseudonym TO pen_name;
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- users table - add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS indie_quill_author_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS short_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_unit_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_scribe_id TEXT;

-- cohorts table - add missing columns
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS grant_id INTEGER;

-- applications table - add missing columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS previously_published BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS publishing_details TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS internal_id TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cohort_id INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS date_approved TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS date_migrated TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS persona_type TEXT;

-- curriculum_modules table - add missing columns
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS path_type TEXT DEFAULT 'general';
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'all';

-- ============================================================================
-- PHASE 4: CREATE MISSING TABLES
-- ============================================================================

-- email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  user_id INTEGER,
  application_id INTEGER,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- family_units table (drop and recreate only if empty or doesn't exist properly)
CREATE TABLE IF NOT EXISTS family_units (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cohort_id INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- foundations table - ensure proper structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foundations') THEN
    CREATE TABLE foundations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contact_role TEXT,
      mission TEXT,
      website TEXT,
      notes TEXT,
      category TEXT,
      geography_scope TEXT,
      acceptance_criteria TEXT,
      fit_rank INTEGER,
      status TEXT DEFAULT 'prospect',
      created_by VARCHAR NOT NULL DEFAULT 'system',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_person TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_email TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_phone TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_role TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS mission TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS geography_scope TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS fit_rank INTEGER;
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'prospect';
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS created_by VARCHAR DEFAULT 'system';
    ALTER TABLE foundations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- foundation_grants table - ensure proper structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foundation_grants') THEN
    CREATE TABLE foundation_grants (
      id SERIAL PRIMARY KEY,
      foundation_id INTEGER,
      amount INTEGER NOT NULL DEFAULT 0,
      target_author_count INTEGER DEFAULT 10,
      assigned_cohort_id INTEGER,
      grant_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      grant_purpose TEXT,
      donor_locked_at TIMESTAMP WITH TIME ZONE,
      created_by VARCHAR NOT NULL DEFAULT 'system',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS target_author_count INTEGER DEFAULT 10;
    ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS assigned_cohort_id INTEGER;
    ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS grant_purpose TEXT;
    ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS donor_locked_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS created_by VARCHAR DEFAULT 'system';
  END IF;
END $$;

-- grant_programs table
CREATE TABLE IF NOT EXISTS grant_programs (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER,
  program_name TEXT NOT NULL,
  max_amount INTEGER DEFAULT 0,
  open_date TIMESTAMP WITHOUT TIME ZONE,
  deadline TIMESTAMP WITHOUT TIME ZONE,
  funded_items TEXT,
  eligibility_notes TEXT,
  two_year_restriction BOOLEAN DEFAULT FALSE,
  last_awarded_year INTEGER,
  application_status TEXT DEFAULT 'not_started',
  application_url TEXT,
  indie_quill_alignment TEXT,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- grant_calendar_alerts table
CREATE TABLE IF NOT EXISTS grant_calendar_alerts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER,
  alert_type TEXT NOT NULL DEFAULT 'deadline',
  days_before INTEGER DEFAULT 7,
  alert_date TIMESTAMP WITHOUT TIME ZONE,
  google_event_id TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- solicitation_logs table
CREATE TABLE IF NOT EXISTS solicitation_logs (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER,
  contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contact_method TEXT NOT NULL,
  contacted_by VARCHAR NOT NULL DEFAULT 'system',
  purpose TEXT NOT NULL,
  response TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- operating_costs table
CREATE TABLE IF NOT EXISTS operating_costs (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  cost_type TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  created_by VARCHAR NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- pilot_ledger table
CREATE TABLE IF NOT EXISTS pilot_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  linked_author_id INTEGER,
  category TEXT,
  recorded_by INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- organization_credentials table
CREATE TABLE IF NOT EXISTS organization_credentials (
  id SERIAL PRIMARY KEY,
  credential_type TEXT NOT NULL,
  credential_value TEXT NOT NULL,
  platform_name TEXT,
  verified_at TIMESTAMP WITHOUT TIME ZONE,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- student_profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  cohort_id INTEGER,
  accessibility_mode TEXT DEFAULT 'standard',
  preferred_language TEXT DEFAULT 'en',
  enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- mentor_profiles table
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  specialties TEXT,
  bio TEXT,
  max_students INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- mentor_student_assignments table
CREATE TABLE IF NOT EXISTS mentor_student_assignments (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mentor_id INTEGER,
  start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  provider TEXT DEFAULT 'google_meet',
  join_url TEXT,
  meeting_type TEXT DEFAULT 'one_on_one',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  google_event_id TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- meeting_attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  attended BOOLEAN DEFAULT FALSE,
  attended_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- student_curriculum_progress table
CREATE TABLE IF NOT EXISTS student_curriculum_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL,
  percent_complete INTEGER DEFAULT 0,
  hours_spent INTEGER DEFAULT 0,
  started_at TIMESTAMP WITHOUT TIME ZONE,
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  last_accessed_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- student_activity_logs table
CREATE TABLE IF NOT EXISTS student_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  minutes_active INTEGER DEFAULT 0,
  word_count_start INTEGER DEFAULT 0,
  word_count_end INTEGER DEFAULT 0,
  modules_accessed TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- tabe_assessments table
CREATE TABLE IF NOT EXISTS tabe_assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  test_type TEXT NOT NULL,
  scale_score INTEGER NOT NULL,
  grade_equivalent TEXT NOT NULL,
  efl_level TEXT NOT NULL,
  is_baseline BOOLEAN DEFAULT TRUE,
  test_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  administered_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- pact_sessions table
CREATE TABLE IF NOT EXISTS pact_sessions (
  id SERIAL PRIMARY KEY,
  family_unit_id INTEGER NOT NULL,
  session_title TEXT NOT NULL,
  session_type TEXT NOT NULL,
  start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  end_time TIMESTAMP WITHOUT TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  participant_ids TEXT,
  activity_description TEXT,
  words_written INTEGER DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- publishing_updates table
CREATE TABLE IF NOT EXISTS publishing_updates (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  indie_quill_author_id TEXT,
  status TEXT DEFAULT 'pending',
  status_message TEXT,
  estimated_completion TEXT,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP WITHOUT TIME ZONE,
  last_synced_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- drafting_documents table
CREATE TABLE IF NOT EXISTS drafting_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  last_edited_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 5: ENSURE AUDIT_LOGS HAS CORRECT COLUMNS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'target_table'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN target_table TO entity_type;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'target_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN target_id TO entity_id;
  END IF;
END $$;

-- ============================================================================
-- DONE! Your production schema is now aligned with development.
-- Please log out and log back in, then test the Intake page.
-- ============================================================================
