-- =====================================================
-- 10 Minute School Speaking Test Booking System
-- Database Enhancement Script
-- =====================================================

-- This script enhances the existing database schema to better support
-- the requirements for all 4 stakeholder types while maintaining
-- backward compatibility with the current implementation.

-- =====================================================
-- 1. ENHANCED USER MANAGEMENT
-- =====================================================

-- Add user profile enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "profilePicture" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "department" TEXT; -- For teachers/staff
-- Note: Paid student verification not required for MVP - students will be added manually to database
ALTER TABLE users ADD COLUMN IF NOT EXISTS "studentId" TEXT; -- External student ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "gender" VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "preferredLanguage" VARCHAR(10) DEFAULT 'en';

-- Add indexes for new fields
-- Note: isPaidStudent index removed as paid student verification not required for MVP
CREATE INDEX IF NOT EXISTS "users_lastLoginAt_idx" ON users ("lastLoginAt");
CREATE INDEX IF NOT EXISTS "users_department_idx" ON users ("department");

-- =====================================================
-- 2. ENHANCED BOOKING SYSTEM
-- =====================================================

-- Add booking enhancements
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "rescheduledFrom" TEXT; -- Reference to original booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "rescheduleReason" TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "waitingListPosition" INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "specialRequirements" TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "bookingSource" VARCHAR(20) DEFAULT 'online'; -- online, admin, phone
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "confirmationSentAt" TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP;

-- Add indexes for new booking fields
CREATE INDEX IF NOT EXISTS "bookings_rescheduledFrom_idx" ON bookings ("rescheduledFrom");
CREATE INDEX IF NOT EXISTS "bookings_waitingListPosition_idx" ON bookings ("waitingListPosition");
CREATE INDEX IF NOT EXISTS "bookings_bookingSource_idx" ON bookings ("bookingSource");

-- =====================================================
-- 3. ENHANCED SLOT MANAGEMENT
-- =====================================================

-- Add slot enhancements
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN DEFAULT false;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "blockedBy" TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "maxCapacity" INTEGER DEFAULT 1;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "waitingListEnabled" BOOLEAN DEFAULT false;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "specialInstructions" TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS "roomNumber" TEXT;

-- Add indexes for new slot fields
CREATE INDEX IF NOT EXISTS "slots_isBlocked_idx" ON slots ("isBlocked");
CREATE INDEX IF NOT EXISTS "slots_waitingListEnabled_idx" ON slots ("waitingListEnabled");

-- =====================================================
-- 4. ENHANCED ASSESSMENT SYSTEM
-- =====================================================

-- Add assessment enhancements
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "fluencyScore" FLOAT; -- Individual IELTS criteria scores
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "coherenceScore" FLOAT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "lexicalScore" FLOAT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "grammarScore" FLOAT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "pronunciationScore" FLOAT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "overallBand" FLOAT; -- Overall IELTS band
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;

-- Add indexes for new assessment fields
CREATE INDEX IF NOT EXISTS "assessments_overallBand_idx" ON assessments ("overallBand");
CREATE INDEX IF NOT EXISTS "assessments_isDraft_idx" ON assessments ("isDraft");

-- =====================================================
-- 5. ENHANCED NOTIFICATION SYSTEM
-- =====================================================

-- Add notification enhancements
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "priority" VARCHAR(10) DEFAULT 'normal'; -- low, normal, high, urgent
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "category" VARCHAR(20); -- booking, assessment, system, reminder
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "actionUrl" TEXT; -- Deep link to relevant page
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "sentVia" VARCHAR(20) DEFAULT 'in_app'; -- in_app, sms, email, push
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "externalId" TEXT; -- External notification ID for tracking

-- Add indexes for new notification fields
CREATE INDEX IF NOT EXISTS "notifications_priority_idx" ON notifications ("priority");
CREATE INDEX IF NOT EXISTS "notifications_category_idx" ON notifications ("category");
CREATE INDEX IF NOT EXISTS "notifications_expiresAt_idx" ON notifications ("expiresAt");

-- =====================================================
-- 6. USER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light', -- light, dark, auto
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
  notifications JSONB DEFAULT '{}', -- Notification preferences
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId")
);

-- Add indexes for user preferences
CREATE INDEX IF NOT EXISTS "user_preferences_userId_idx" ON user_preferences ("userId");

-- =====================================================
-- 7. USER SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "lastActivityAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Add indexes for user sessions
CREATE INDEX IF NOT EXISTS "user_sessions_userId_idx" ON user_sessions ("userId");
CREATE INDEX IF NOT EXISTS "user_sessions_token_idx" ON user_sessions ("token");
CREATE INDEX IF NOT EXISTS "user_sessions_expiresAt_idx" ON user_sessions ("expiresAt");
CREATE INDEX IF NOT EXISTS "user_sessions_isActive_idx" ON user_sessions ("isActive");

-- =====================================================
-- 8. WAITING LIST TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS waiting_list (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "slotId" TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  "position" INTEGER NOT NULL,
  "requestedAt" TIMESTAMP DEFAULT NOW(),
  "notifiedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "status" VARCHAR(20) DEFAULT 'waiting', -- waiting, notified, expired, cancelled
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("studentId", "slotId")
);

-- Add indexes for waiting list
CREATE INDEX IF NOT EXISTS "waiting_list_studentId_idx" ON waiting_list ("studentId");
CREATE INDEX IF NOT EXISTS "waiting_list_slotId_idx" ON waiting_list ("slotId");
CREATE INDEX IF NOT EXISTS "waiting_list_position_idx" ON waiting_list ("position");
CREATE INDEX IF NOT EXISTS "waiting_list_status_idx" ON waiting_list ("status");

-- =====================================================
-- 9. SYSTEM CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "type" VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
  "description" TEXT,
  "category" VARCHAR(50) DEFAULT 'general',
  "isPublic" BOOLEAN DEFAULT false, -- Can be accessed by frontend
  "updatedBy" TEXT REFERENCES users(id),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Add indexes for system config
CREATE INDEX IF NOT EXISTS "system_config_key_idx" ON system_config ("key");
CREATE INDEX IF NOT EXISTS "system_config_category_idx" ON system_config ("category");
CREATE INDEX IF NOT EXISTS "system_config_isPublic_idx" ON system_config ("isPublic");

-- =====================================================
-- 10. BRANCH SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS branch_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "branchId" TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "type" VARCHAR(20) DEFAULT 'string',
  "description" TEXT,
  "updatedBy" TEXT REFERENCES users(id),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("branchId", "key")
);

-- Add indexes for branch settings
CREATE INDEX IF NOT EXISTS "branch_settings_branchId_idx" ON branch_settings ("branchId");
CREATE INDEX IF NOT EXISTS "branch_settings_key_idx" ON branch_settings ("key");

-- =====================================================
-- 11. ENHANCED AUDIT LOGGING
-- =====================================================

-- Add audit log enhancements
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "responseStatus" INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "executionTime" INTEGER; -- milliseconds
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "riskLevel" VARCHAR(10) DEFAULT 'low'; -- low, medium, high, critical

-- Add indexes for enhanced audit logs
CREATE INDEX IF NOT EXISTS "audit_logs_sessionId_idx" ON audit_logs ("sessionId");
CREATE INDEX IF NOT EXISTS "audit_logs_requestId_idx" ON audit_logs ("requestId");
CREATE INDEX IF NOT EXISTS "audit_logs_riskLevel_idx" ON audit_logs ("riskLevel");

-- =====================================================
-- 12. PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================

-- Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS "bookings_student_status_date_idx" ON bookings ("studentId", "status", "bookedAt");
CREATE INDEX IF NOT EXISTS "bookings_slot_status_idx" ON bookings ("slotId", "status");
CREATE INDEX IF NOT EXISTS "slots_branch_date_active_idx" ON slots ("branchId", "date", "isBlocked");
CREATE INDEX IF NOT EXISTS "assessments_teacher_date_idx" ON assessments ("teacherId", "assessedAt");
CREATE INDEX IF NOT EXISTS "assessments_student_date_idx" ON assessments ("studentId", "assessedAt");
CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx" ON notifications ("userId", "isRead", "createdAt");

-- =====================================================
-- 13. DATA INTEGRITY CONSTRAINTS
-- =====================================================

-- Add check constraints for data validation
ALTER TABLE users ADD CONSTRAINT "users_loginAttempts_check" CHECK ("loginAttempts" >= 0);
ALTER TABLE users ADD CONSTRAINT "users_gender_check" CHECK ("gender" IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE bookings ADD CONSTRAINT "bookings_waitingListPosition_check" CHECK ("waitingListPosition" > 0);
ALTER TABLE assessments ADD CONSTRAINT "assessments_fluencyScore_check" CHECK ("fluencyScore" >= 0 AND "fluencyScore" <= 9);
ALTER TABLE assessments ADD CONSTRAINT "assessments_coherenceScore_check" CHECK ("coherenceScore" >= 0 AND "coherenceScore" <= 9);
ALTER TABLE assessments ADD CONSTRAINT "assessments_lexicalScore_check" CHECK ("lexicalScore" >= 0 AND "lexicalScore" <= 9);
ALTER TABLE assessments ADD CONSTRAINT "assessments_grammarScore_check" CHECK ("grammarScore" >= 0 AND "grammarScore" <= 9);
ALTER TABLE assessments ADD CONSTRAINT "assessments_pronunciationScore_check" CHECK ("pronunciationScore" >= 0 AND "pronunciationScore" <= 9);
ALTER TABLE assessments ADD CONSTRAINT "assessments_overallBand_check" CHECK ("overallBand" >= 0 AND "overallBand" <= 9);
ALTER TABLE notifications ADD CONSTRAINT "notifications_priority_check" CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE waiting_list ADD CONSTRAINT "waiting_list_position_check" CHECK ("position" > 0);
ALTER TABLE waiting_list ADD CONSTRAINT "waiting_list_status_check" CHECK ("status" IN ('waiting', 'notified', 'expired', 'cancelled'));

-- =====================================================
-- 14. INITIAL SYSTEM CONFIGURATION DATA
-- =====================================================

-- Insert default system configuration
INSERT INTO system_config ("key", "value", "type", "description", "category", "isPublic") VALUES
('booking_advance_notice_hours', '24', 'number', 'Minimum hours required for booking cancellation', 'booking', true),
('max_monthly_bookings_per_student', '1', 'number', 'Maximum bookings per student per month', 'booking', true),
('slot_capacity_default', '1', 'number', 'Default slot capacity', 'slot', true),
('assessment_score_increment', '0.5', 'number', 'Valid score increments for IELTS assessment', 'assessment', true),
('notification_retention_days', '30', 'number', 'Days to keep notifications', 'notification', false),
('session_timeout_minutes', '1440', 'number', 'User session timeout in minutes', 'security', false),
('max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', 'security', false),
('lockout_duration_minutes', '30', 'number', 'Account lockout duration in minutes', 'security', false),
('waiting_list_expiry_hours', '24', 'number', 'Waiting list notification expiry in hours', 'booking', true),
('enable_cross_branch_booking', 'true', 'boolean', 'Allow students to book across branches', 'booking', true)
ON CONFLICT ("key") DO NOTHING;

-- =====================================================
-- 15. UPDATE EXISTING DATA
-- =====================================================

-- Note: Paid student verification not required for MVP - students will be added manually

-- Set last login time for existing users (use created time as approximation)
UPDATE users SET "lastLoginAt" = "createdAt" WHERE "lastLoginAt" IS NULL;

-- =====================================================
-- 16. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active user sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  us.id,
  us."userId",
  u.name as "userName",
  u.role,
  us."lastActivityAt",
  us."createdAt"
FROM user_sessions us
JOIN users u ON us."userId" = u.id
WHERE us."isActive" = true AND us."expiresAt" > NOW();

-- View for booking statistics
CREATE OR REPLACE VIEW booking_stats AS
SELECT 
  b.id as "branchId",
  b.name as "branchName",
  COUNT(bk.id) as "totalBookings",
  COUNT(CASE WHEN bk.status = 'CONFIRMED' THEN 1 END) as "confirmedBookings",
  COUNT(CASE WHEN bk.status = 'CANCELLED' THEN 1 END) as "cancelledBookings",
  COUNT(CASE WHEN bk.status = 'COMPLETED' THEN 1 END) as "completedBookings",
  COUNT(CASE WHEN bk.status = 'NO_SHOW' THEN 1 END) as "noShowBookings",
  ROUND(CAST(AVG(CASE WHEN a.score IS NOT NULL THEN a.score END) AS NUMERIC), 1) as "averageScore"
FROM branches b
LEFT JOIN slots s ON b.id = s."branchId"
LEFT JOIN bookings bk ON s.id = bk."slotId"
LEFT JOIN assessments a ON bk.id = a."bookingId"
GROUP BY b.id, b.name;

-- View for teacher performance
CREATE OR REPLACE VIEW teacher_performance AS
SELECT 
  u.id as "teacherId",
  u.name as "teacherName",
  b.id as "branchId",
  b.name as "branchName",
  COUNT(DISTINCT bk.id) as "totalSessions",
  COUNT(CASE WHEN bk.attended = true THEN 1 END) as "attendedSessions",
  COUNT(CASE WHEN bk.attended = false THEN 1 END) as "noShowSessions",
  COUNT(a.id) as "assessmentsCompleted",
  ROUND(CAST(AVG(a.score) AS NUMERIC), 1) as "averageScore",
  ROUND(CAST((COUNT(CASE WHEN bk.attended = true THEN 1 END)::float / COUNT(bk.id)) * 100 AS NUMERIC), 2) as "attendanceRate"
FROM users u
JOIN branches b ON u."branchId" = b.id
LEFT JOIN slots s ON u.id = s."teacherId"
LEFT JOIN bookings bk ON s.id = bk."slotId"
LEFT JOIN assessments a ON bk.id = a."bookingId"
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.name, b.id, b.name;

-- =====================================================
-- SCRIPT COMPLETION
-- =====================================================

-- Update the updatedAt timestamp for all modified tables
UPDATE users SET "updatedAt" = NOW() WHERE "updatedAt" < NOW() - INTERVAL '1 second';
UPDATE branches SET "updatedAt" = NOW() WHERE "updatedAt" < NOW() - INTERVAL '1 second';
UPDATE slots SET "updatedAt" = NOW() WHERE "updatedAt" < NOW() - INTERVAL '1 second';
UPDATE bookings SET "updatedAt" = NOW() WHERE "updatedAt" < NOW() - INTERVAL '1 second';

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Database enhancement script completed successfully!';
    RAISE NOTICE 'Added % new columns to existing tables', (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name LIKE '%_idx' OR column_name IN (
            'lastLoginAt', 'loginAttempts', 'lockedUntil', 'profilePicture', 
            'department', 'isPaidStudent', 'studentId', 'emergencyContact',
            'dateOfBirth', 'gender', 'preferredLanguage'
        )
    );
    RAISE NOTICE 'Created % new tables', (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_preferences', 'user_sessions', 'waiting_list', 'system_config', 'branch_settings')
    );
    RAISE NOTICE 'Created % new indexes for performance optimization', (
        SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE '%_idx'
    );
END $$;
