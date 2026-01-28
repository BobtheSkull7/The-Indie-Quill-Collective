-- ============================================================================
-- COMPLETE PRODUCTION SCHEMA MIGRATION
-- Aligns production with development - 100% ADDITIVE, NO DESTRUCTIVE OPERATIONS
-- Run this in Supabase Production SQL Editor
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE REQUIRED ENUMS (IF NOT EXISTS)
-- ============================================================================

DO $$ BEGIN CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'accepted', 'rejected', 'migrated', 'rescinded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE contract_status AS ENUM ('pending_signature', 'pending_guardian', 'signed', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE publishing_status AS ENUM ('not_started', 'manuscript_received', 'cover_design', 'formatting', 'agreement', 'creation', 'editing', 'review', 'modifications', 'published', 'marketing'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE cohort_status AS ENUM ('open', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE persona_type AS ENUM ('writer', 'adult_student', 'family_student'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE curriculum_path_type AS ENUM ('general', 'literacy', 'family'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE curriculum_audience_type AS ENUM ('adult', 'child', 'shared'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE grant_prospect_status AS ENUM ('active', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE grant_program_status AS ENUM ('not_started', 'preparing', 'submitted', 'awarded', 'declined', 'ineligible'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE credential_type AS ENUM ('tax_id', 'nces_id', 'ipeds_id', 'platform_registration', 'ein', 'duns', 'sam_uei'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE alert_type AS ENUM ('opens_soon', 'deadline_warning', 'deadline_critical', 'deadline_day'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ledger_type AS ENUM ('income', 'expense'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE email_type AS ENUM ('application_received', 'application_accepted', 'application_rejected', 'active_author'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE email_status AS ENUM ('sent', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE accessibility_mode AS ENUM ('standard', 'high_contrast', 'large_text', 'screen_reader'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE efl_level AS ENUM ('beginning_literacy', 'beginning_basic', 'low_intermediate', 'high_intermediate', 'low_adult_secondary', 'high_adult_secondary'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE meeting_provider AS ENUM ('google_meet', 'zoom', 'jitsi', 'daily'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE family_role AS ENUM ('parent', 'child', 'guardian', 'grandparent', 'sibling'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- PHASE 2: SESSION TABLE (Required for authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ============================================================================
-- PHASE 3: CORE TABLES - ADD MISSING COLUMNS
-- ============================================================================

-- users table - ensure all columns exist
-- NOTE: users.id should be VARCHAR for UUID, not INTEGER
ALTER TABLE users ADD COLUMN IF NOT EXISTS indie_quill_author_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_scribe_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS short_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_unit_id INTEGER;

-- cohorts table
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS grant_id INTEGER;

-- applications table - ensure all columns exist
ALTER TABLE applications ADD COLUMN IF NOT EXISTS internal_id TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cohort_id INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS date_approved TIMESTAMP;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS date_migrated TIMESTAMP;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guardian_consent_method TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guardian_consent_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMP;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS manuscript_word_count INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS manuscript_title TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS persona_type TEXT;

-- contracts table - add forensic signature columns
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS author_signature_ip TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS author_signature_user_agent TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS guardian_signature_ip TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS guardian_signature_user_agent TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pdf_data TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP;

-- calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_from_google BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- PHASE 4: FIX COLUMN NAMES IF NEEDED
-- ============================================================================

-- Ensure applications uses 'pseudonym' (not pen_name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'pen_name')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'pseudonym') THEN
    ALTER TABLE applications RENAME COLUMN pen_name TO pseudonym;
  END IF;
END $$;

-- Ensure family_units uses 'family_name' (not just name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'family_units' AND column_name = 'name')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'family_units' AND column_name = 'family_name') THEN
    ALTER TABLE family_units RENAME COLUMN name TO family_name;
  END IF;
END $$;

-- Ensure audit_logs uses correct column names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'target_table')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_type') THEN
    ALTER TABLE audit_logs RENAME COLUMN target_table TO entity_type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'target_id')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_id') THEN
    ALTER TABLE audit_logs RENAME COLUMN target_id TO entity_id;
  END IF;
END $$;

-- ============================================================================
-- PHASE 5: FAMILY_UNITS - ENSURE COMPLETE
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_units (
  id SERIAL PRIMARY KEY,
  family_name TEXT NOT NULL,
  primary_contact_id INTEGER,
  cohort_id INTEGER,
  target_pact_hours INTEGER DEFAULT 20,
  total_pact_minutes INTEGER DEFAULT 0,
  anthology_title TEXT,
  anthology_content TEXT,
  anthology_word_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to family_units if table already exists
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS family_name TEXT;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS primary_contact_id INTEGER;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS target_pact_hours INTEGER DEFAULT 20;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS total_pact_minutes INTEGER DEFAULT 0;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS anthology_title TEXT;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS anthology_content TEXT;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS anthology_word_count INTEGER DEFAULT 0;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE family_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================================================
-- PHASE 6: GRANT & DONOR LOGISTICS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS foundations (
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
  status TEXT DEFAULT 'active',
  created_by VARCHAR(36) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS contact_role TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS geography_scope TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS fit_rank INTEGER;
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE foundations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS foundation_grants (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER REFERENCES foundations(id),
  amount INTEGER NOT NULL DEFAULT 0,
  target_author_count INTEGER NOT NULL DEFAULT 10,
  assigned_cohort_id INTEGER,
  grant_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  grant_purpose TEXT,
  donor_locked_at TIMESTAMP WITH TIME ZONE,
  recorded_by VARCHAR(36) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS target_author_count INTEGER DEFAULT 10;
ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS assigned_cohort_id INTEGER;
ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS grant_purpose TEXT;
ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS donor_locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE foundation_grants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS solicitation_logs (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER REFERENCES foundations(id),
  contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contact_method TEXT NOT NULL,
  contacted_by VARCHAR(36) NOT NULL DEFAULT 'system',
  purpose TEXT NOT NULL,
  response TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grant_programs (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER REFERENCES foundations(id),
  program_name TEXT NOT NULL,
  max_amount INTEGER NOT NULL DEFAULT 0,
  open_date TIMESTAMP,
  deadline TIMESTAMP,
  funded_items TEXT,
  eligibility_notes TEXT,
  two_year_restriction BOOLEAN DEFAULT FALSE,
  last_awarded_year INTEGER,
  application_status TEXT DEFAULT 'not_started',
  application_url TEXT,
  indie_quill_alignment TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grant_calendar_alerts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES grant_programs(id),
  alert_type TEXT NOT NULL DEFAULT 'deadline',
  days_before INTEGER DEFAULT 7,
  alert_date TIMESTAMP,
  google_event_id TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_credentials (
  id SERIAL PRIMARY KEY,
  credential_type TEXT NOT NULL,
  credential_value TEXT NOT NULL,
  platform_name TEXT,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR(36) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operating_costs (
  id SERIAL PRIMARY KEY,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter_num INTEGER NOT NULL,
  total_cost INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  recorded_by VARCHAR(36) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  linked_author_id INTEGER,
  category TEXT,
  recorded_by VARCHAR(36) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PHASE 7: EMAIL LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  user_id VARCHAR(36),
  application_id INTEGER,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PHASE 8: FRICTIONLESS LITERACY / VIRTUAL CLASSROOM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pact_sessions (
  id SERIAL PRIMARY KEY,
  family_unit_id INTEGER REFERENCES family_units(id) NOT NULL,
  session_title TEXT NOT NULL,
  session_type TEXT DEFAULT 'writing',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER DEFAULT 0,
  participant_ids TEXT,
  activity_description TEXT,
  words_written INTEGER DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  cohort_id INTEGER,
  family_unit_id INTEGER REFERENCES family_units(id),
  family_role TEXT,
  accessibility_mode TEXT DEFAULT 'standard',
  preferred_language TEXT DEFAULT 'en',
  enrolled_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS family_unit_id INTEGER;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS family_role TEXT;

CREATE TABLE IF NOT EXISTS mentor_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  specialties TEXT,
  bio TEXT,
  max_students INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_student_assignments (
  id SERIAL PRIMARY KEY,
  mentor_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS curriculum_modules (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_hours INTEGER DEFAULT 1,
  content_type TEXT DEFAULT 'lesson',
  content_url TEXT,
  path_type TEXT DEFAULT 'general',
  audience_type TEXT DEFAULT 'adult',
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS path_type TEXT DEFAULT 'general';
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'adult';
ALTER TABLE curriculum_modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS student_curriculum_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  module_id INTEGER REFERENCES curriculum_modules(id),
  percent_complete INTEGER DEFAULT 0,
  hours_spent INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tabe_assessments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  test_type TEXT NOT NULL,
  scale_score INTEGER NOT NULL,
  grade_equivalent TEXT NOT NULL,
  efl_level TEXT NOT NULL,
  is_baseline BOOLEAN DEFAULT FALSE,
  test_date TIMESTAMP NOT NULL DEFAULT NOW(),
  administered_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mentor_id VARCHAR(36),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  provider TEXT DEFAULT 'google_meet',
  join_url TEXT,
  meeting_type TEXT DEFAULT 'one_on_one',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  google_event_id TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES meetings(id),
  user_id VARCHAR(36) NOT NULL,
  attended BOOLEAN DEFAULT FALSE,
  attended_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  session_date TIMESTAMP NOT NULL DEFAULT NOW(),
  minutes_active INTEGER DEFAULT 0,
  word_count_start INTEGER DEFAULT 0,
  word_count_end INTEGER DEFAULT 0,
  modules_accessed TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drafting_documents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  last_edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publishing_updates (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  indie_quill_author_id TEXT,
  status TEXT DEFAULT 'not_started',
  status_message TEXT,
  estimated_completion TEXT,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PHASE 9: NPO APPLICATIONS TABLE (for legacy Supabase data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS npo_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'migrated',
  bookstore_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- DONE! Your production schema is now aligned with development.
-- Please clear your browser cache and test the Intake page.
-- ============================================================================
