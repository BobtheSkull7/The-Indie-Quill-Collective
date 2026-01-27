-- ============================================
-- TEST USERS CLEANUP SCRIPT
-- Safely removes all test users and their data
-- ============================================

-- IMPORTANT: This script uses the test email pattern to identify test data
-- All test emails follow: test_*@testquill.dev

-- Step 1: Delete applications for test users
DELETE FROM applications
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 2: Delete any student profiles for test users
DELETE FROM student_profiles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 3: Delete any mentor_student_assignments for test users
DELETE FROM mentor_student_assignments
WHERE student_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 4: Delete any TABE assessments for test users
DELETE FROM tabe_assessments
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 5: Delete any curriculum progress for test users
DELETE FROM student_curriculum_progress
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 6: Delete any drafting documents for test users
DELETE FROM drafting_documents
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 7: Delete any activity logs for test users
DELETE FROM student_activity_logs
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@testquill.dev'
);

-- Step 8: Delete the test users themselves
DELETE FROM users
WHERE email LIKE 'test_%@testquill.dev';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_users FROM users WHERE email LIKE 'test_%@testquill.dev';
