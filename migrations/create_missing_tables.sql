-- Create missing enum types
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'accepted', 'rejected', 'migrated', 'rescinded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('pending_signature', 'pending_guardian', 'signed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE publishing_status AS ENUM ('not_started', 'manuscript_received', 'cover_design', 'formatting', 'agreement', 'creation', 'editing', 'review', 'modifications', 'published', 'marketing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cohort_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE persona_type AS ENUM ('writer', 'adult_student', 'family_student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE curriculum_path_type AS ENUM ('general', 'literacy', 'family');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE curriculum_audience_type AS ENUM ('adult', 'child', 'shared');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cohort_type AS ENUM ('writer', 'grant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grant_prospect_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grant_program_status AS ENUM ('not_started', 'preparing', 'submitted', 'awarded', 'declined', 'ineligible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE credential_type AS ENUM ('tax_id', 'nces_id', 'ipeds_id', 'platform_registration', 'ein', 'duns', 'sam_uei');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('opens_soon', 'deadline_warning', 'deadline_critical', 'deadline_day');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ledger_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_type AS ENUM ('application_received', 'application_accepted', 'application_rejected', 'active_author', 'password_reset');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE accessibility_mode AS ENUM ('standard', 'high_contrast', 'large_text', 'screen_reader');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE efl_level AS ENUM ('beginning_literacy', 'beginning_basic', 'low_intermediate', 'high_intermediate', 'low_adult_secondary', 'high_adult_secondary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meeting_provider AS ENUM ('google_meet', 'zoom', 'jitsi', 'daily');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE family_role AS ENUM ('parent', 'child', 'guardian', 'grandparent', 'sibling');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NPO Applications
CREATE TABLE IF NOT EXISTS npo_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'migrated',
  bookstore_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Family Units
CREATE TABLE IF NOT EXISTS family_units (
  id SERIAL PRIMARY KEY,
  family_name TEXT NOT NULL,
  primary_contact_id INTEGER,
  cohort_id INTEGER REFERENCES cohorts(id),
  target_pact_hours INTEGER DEFAULT 20,
  total_pact_minutes INTEGER DEFAULT 0,
  anthology_title TEXT,
  anthology_content TEXT,
  anthology_word_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  contract_type TEXT NOT NULL,
  contract_content TEXT NOT NULL,
  author_signature TEXT,
  author_signed_at TIMESTAMP,
  author_signature_ip TEXT,
  author_signature_user_agent TEXT,
  guardian_signature TEXT,
  guardian_signed_at TIMESTAMP,
  guardian_signature_ip TEXT,
  guardian_signature_user_agent TEXT,
  requires_guardian BOOLEAN NOT NULL DEFAULT false,
  status contract_status NOT NULL DEFAULT 'pending_signature',
  pdf_data TEXT,
  pdf_generated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Publishing Updates
CREATE TABLE IF NOT EXISTS publishing_updates (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  indie_quill_author_id TEXT,
  status publishing_status NOT NULL DEFAULT 'not_started',
  status_message TEXT,
  estimated_completion TEXT,
  sync_status sync_status NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt TIMESTAMP,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  all_day BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  location TEXT,
  created_by VARCHAR(36) REFERENCES users(id),
  google_calendar_event_id TEXT,
  last_synced_at TIMESTAMP,
  is_from_google BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fundraising Campaigns
CREATE TABLE IF NOT EXISTS fundraising_campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES fundraising_campaigns(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  amount INTEGER NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  donated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  recorded_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Foundations
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
  status grant_prospect_status NOT NULL DEFAULT 'active',
  created_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Solicitation Logs
CREATE TABLE IF NOT EXISTS solicitation_logs (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER NOT NULL REFERENCES foundations(id),
  contact_date TIMESTAMP NOT NULL,
  contact_method TEXT NOT NULL,
  contacted_by VARCHAR(36) NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL,
  response TEXT,
  response_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Foundation Grants
CREATE TABLE IF NOT EXISTS foundation_grants (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER NOT NULL REFERENCES foundations(id),
  amount INTEGER NOT NULL,
  target_author_count INTEGER NOT NULL,
  assigned_cohort_id INTEGER REFERENCES cohorts(id),
  grant_date TIMESTAMP NOT NULL,
  grant_purpose TEXT,
  donor_locked_at TIMESTAMP,
  recorded_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Grant Programs
CREATE TABLE IF NOT EXISTS grant_programs (
  id SERIAL PRIMARY KEY,
  foundation_id INTEGER NOT NULL REFERENCES foundations(id),
  program_name TEXT NOT NULL,
  max_amount INTEGER NOT NULL,
  open_date TIMESTAMP,
  deadline TIMESTAMP,
  funded_items TEXT,
  eligibility_notes TEXT,
  two_year_restriction BOOLEAN NOT NULL DEFAULT false,
  last_awarded_year INTEGER,
  application_status grant_program_status NOT NULL DEFAULT 'not_started',
  application_url TEXT,
  indie_quill_alignment TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Organization Credentials
CREATE TABLE IF NOT EXISTS organization_credentials (
  id SERIAL PRIMARY KEY,
  credential_type credential_type NOT NULL,
  credential_value TEXT NOT NULL,
  platform_name TEXT,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Grant Calendar Alerts
CREATE TABLE IF NOT EXISTS grant_calendar_alerts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES grant_programs(id),
  alert_type alert_type NOT NULL,
  days_before INTEGER NOT NULL,
  alert_date TIMESTAMP NOT NULL,
  google_event_id TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Operating Costs
CREATE TABLE IF NOT EXISTS operating_costs (
  id SERIAL PRIMARY KEY,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter_num INTEGER NOT NULL,
  total_cost INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  recorded_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pilot Ledger
CREATE TABLE IF NOT EXISTS pilot_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date TIMESTAMP NOT NULL,
  type ledger_type NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  linked_author_id INTEGER REFERENCES applications(id),
  category TEXT,
  recorded_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  email_type email_type NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  user_id VARCHAR REFERENCES users(id),
  application_id INTEGER REFERENCES applications(id),
  status email_status NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PACT Sessions
CREATE TABLE IF NOT EXISTS pact_sessions (
  id SERIAL PRIMARY KEY,
  family_unit_id INTEGER NOT NULL REFERENCES family_units(id),
  session_title TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'writing',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  participant_ids TEXT,
  activity_description TEXT,
  words_written INTEGER DEFAULT 0,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Mentor Profiles
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
  specialties TEXT,
  bio TEXT,
  max_students INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Mentor Student Assignments
CREATE TABLE IF NOT EXISTS mentor_student_assignments (
  id SERIAL PRIMARY KEY,
  mentor_id VARCHAR NOT NULL REFERENCES users(id),
  student_id VARCHAR NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Curriculum Modules
CREATE TABLE IF NOT EXISTS curriculum_modules (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  content_type TEXT DEFAULT 'lesson',
  content_url TEXT,
  path_type curriculum_path_type NOT NULL DEFAULT 'general',
  audience_type curriculum_audience_type NOT NULL DEFAULT 'adult',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Student Curriculum Progress
CREATE TABLE IF NOT EXISTS student_curriculum_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  module_id INTEGER NOT NULL REFERENCES curriculum_modules(id),
  percent_complete INTEGER NOT NULL DEFAULT 0,
  hours_spent INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABE Assessments
CREATE TABLE IF NOT EXISTS tabe_assessments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  test_type TEXT NOT NULL,
  scale_score INTEGER NOT NULL,
  grade_equivalent TEXT NOT NULL,
  efl_level efl_level NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  test_date TIMESTAMP NOT NULL,
  administered_by VARCHAR REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mentor_id VARCHAR REFERENCES users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  provider meeting_provider NOT NULL DEFAULT 'google_meet',
  join_url TEXT,
  meeting_type TEXT DEFAULT 'group',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern TEXT,
  google_event_id TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Meeting Attendees
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  attended BOOLEAN,
  attended_minutes INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Student Activity Logs
CREATE TABLE IF NOT EXISTS student_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  session_date TIMESTAMP NOT NULL,
  minutes_active INTEGER NOT NULL DEFAULT 0,
  word_count_start INTEGER DEFAULT 0,
  word_count_end INTEGER DEFAULT 0,
  modules_accessed TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Drafting Documents
CREATE TABLE IF NOT EXISTS drafting_documents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP,
  last_edited_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Student Work
CREATE TABLE IF NOT EXISTS student_work (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  quest_id INTEGER,
  content_type TEXT NOT NULL,
  content_body TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  source_device TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Vibe Quizzes
CREATE TABLE IF NOT EXISTS vibe_quizzes (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  time_limit INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Vibe Quiz Answers
CREATE TABLE IF NOT EXISTS vibe_quiz_answers (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES vibe_quizzes(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  answer TEXT NOT NULL,
  answered_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wiki Entries
CREATE TABLE IF NOT EXISTS wiki_entries (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  author_id VARCHAR(36) REFERENCES users(id),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Board Members
CREATE TABLE IF NOT EXISTS board_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT NOT NULL,
  photo_filename TEXT,
  email TEXT,
  linkedin TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wiki Attachments
CREATE TABLE IF NOT EXISTS wiki_attachments (
  id SERIAL PRIMARY KEY,
  wiki_entry_id INTEGER NOT NULL REFERENCES wiki_entries(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER DEFAULT 10,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0
);

-- Quiz Results
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversations (Chat)
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Messages (Chat)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
