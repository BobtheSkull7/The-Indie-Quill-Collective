-- ============================================
-- TEST USERS CREATION SCRIPT
-- 9 test users for testing branching curriculum
-- Gender-neutral naming (they/them pronouns)
-- ============================================

-- Scenario 1: Family with 2 parents + 2 minors
-- Scenario 2: Family with 2 parents + 1 minor  
-- Scenario 3: 15-year-old publisher (writer)
-- Scenario 4: 23-year-old adult learner

-- STEP 1: Insert test users
INSERT INTO users (email, password, role, first_name, last_name)
VALUES 
  ('test_parent_1a@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Parent', '1A'),
  ('test_parent_1b@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Parent', '1B'),
  ('test_minor_1a@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Minor', '1A'),
  ('test_minor_1b@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Minor', '1B'),
  ('test_parent_2a@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Parent', '2A'),
  ('test_parent_2b@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Parent', '2B'),
  ('test_minor_2a@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Minor', '2A'),
  ('test_publisher_3@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Publisher', 'Three'),
  ('test_learner_4@testquill.dev', 'test_hash_placeholder', 'applicant', 'Test Learner', 'Four')
ON CONFLICT (email) DO NOTHING;

-- STEP 2: Create applications for each test user
-- Uses subqueries to get user IDs dynamically
-- Includes ALL fields that might be required in production

-- Scenario 1: Parent 1A (age 35, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published)
SELECT id, 'Quill Parent 1A', '1991-03-15', false, 'pending', 'family_student', 'Test family literacy journey', 'Help family learn together', 'Testing', true, 'Test data - no struggles', 'novel', false, false
FROM users WHERE email = 'test_parent_1a@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 1: Parent 1B (age 34, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published)
SELECT id, 'Quill Parent 1B', '1992-06-20', false, 'pending', 'family_student', 'Test family literacy journey', 'Help family learn together', 'Testing', true, 'Test data - no struggles', 'novel', false, false
FROM users WHERE email = 'test_parent_1b@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 1: Minor 1A (age 12, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published, guardian_name, guardian_email, guardian_phone, guardian_relationship)
SELECT id, 'Quill Minor 1A', '2014-01-10', true, 'pending', 'family_student', 'Test family literacy journey', 'Learn to write stories', 'Testing', true, 'Test data - no struggles', 'novel', false, false, 'Test Parent 1A', 'test_parent_1a@testquill.dev', '555-0001', 'parent'
FROM users WHERE email = 'test_minor_1a@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 1: Minor 1B (age 10, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published, guardian_name, guardian_email, guardian_phone, guardian_relationship)
SELECT id, 'Quill Minor 1B', '2016-05-22', true, 'pending', 'family_student', 'Test family literacy journey', 'Learn to write stories', 'Testing', true, 'Test data - no struggles', 'novel', false, false, 'Test Parent 1B', 'test_parent_1b@testquill.dev', '555-0002', 'parent'
FROM users WHERE email = 'test_minor_1b@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 2: Parent 2A (age 40, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published)
SELECT id, 'Quill Parent 2A', '1986-08-12', false, 'pending', 'family_student', 'Test family literacy journey', 'Creative writing with family', 'Testing', true, 'Test data - no struggles', 'novel', false, false
FROM users WHERE email = 'test_parent_2a@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 2: Parent 2B (age 38, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published)
SELECT id, 'Quill Parent 2B', '1988-11-30', false, 'pending', 'family_student', 'Test family literacy journey', 'Creative writing with family', 'Testing', true, 'Test data - no struggles', 'novel', false, false
FROM users WHERE email = 'test_parent_2b@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 2: Minor 2A (age 14, family_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published, guardian_name, guardian_email, guardian_phone, guardian_relationship)
SELECT id, 'Quill Minor 2A', '2012-04-18', true, 'pending', 'family_student', 'Test family literacy journey', 'Become a young writer', 'Testing', true, 'Test data - no struggles', 'novel', false, false, 'Test Parent 2A', 'test_parent_2a@testquill.dev', '555-0003', 'parent'
FROM users WHERE email = 'test_minor_2a@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 3: Young Publisher (age 15, writer)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published, guardian_name, guardian_email, guardian_phone, guardian_relationship)
SELECT id, 'Young Quill Publisher', '2011-02-28', true, 'pending', 'writer', 'Want to publish my novel', 'Get published before 18', 'Testing', true, 'Test data - no struggles', 'novel', false, false, 'Test Guardian Three', 'guardian_3@testquill.dev', '555-0004', 'parent'
FROM users WHERE email = 'test_publisher_3@testquill.dev'
ON CONFLICT DO NOTHING;

-- Scenario 4: Adult Learner (age 23, adult_student)
INSERT INTO applications (user_id, pseudonym, date_of_birth, is_minor, status, persona_type, why_collective, goals, hear_about_us, has_story_to_tell, personal_struggles, expression_types, public_identity_enabled, previously_published)
SELECT id, 'Adult Learner Quill', '2003-07-04', false, 'pending', 'adult_student', 'Improve my literacy skills', 'Learn to write professionally', 'Testing', true, 'Test data - no struggles', 'novel', false, false
FROM users WHERE email = 'test_learner_4@testquill.dev'
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT u.id, u.email, u.first_name, u.last_name, a.pseudonym, a.persona_type, a.is_minor
FROM users u
JOIN applications a ON u.id = a.user_id
WHERE u.email LIKE 'test_%@testquill.dev'
ORDER BY u.id;
