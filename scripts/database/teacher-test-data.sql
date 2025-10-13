-- Teacher Test Data - For Testing "Mark Attendance" and "Record Assessment" Features
-- This script creates bookings specifically for teacher functionality testing
-- Run this AFTER demo-data-sarah-ahmed.sql
--
-- What this creates:
-- 1. CONFIRMED bookings for TODAY/TOMORROW - for testing "Mark Attendance"
-- 2. COMPLETED bookings WITHOUT assessments - for testing "Record Assessment"

-- ============================================================================
-- Part 1: Create CONFIRMED bookings for TODAY/TOMORROW
-- These bookings can be used to test "Mark Attendance" feature
-- ============================================================================

-- Create future slots for TODAY
INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-today-01',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE, '14:00', '14:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-today-01');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-today-02',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE, '15:00', '15:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-today-02');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-today-03',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE, '16:00', '16:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-today-03');

-- Create future slots for TOMORROW
INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-tomorrow-01',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-tomorrow-01');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-tomorrow-02',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-tomorrow-02');

-- Create CONFIRMED bookings for these slots (students can mark attendance)
INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-attendance-01', 'student-demo-001', 'slot-sarah-test-today-01', 'CONFIRMED', null, 
  NOW() - INTERVAL '2 hours', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-attendance-01');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-attendance-02', 'student-demo-002', 'slot-sarah-test-today-02', 'CONFIRMED', null, 
  NOW() - INTERVAL '2 hours', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-attendance-02');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-attendance-03', 'student-demo-003', 'slot-sarah-test-today-03', 'CONFIRMED', null, 
  NOW() - INTERVAL '2 hours', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-attendance-03');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-attendance-04', 'student-demo-004', 'slot-sarah-test-tomorrow-01', 'CONFIRMED', null, 
  NOW() - INTERVAL '1 day', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-attendance-04');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-attendance-05', 'student-demo-005', 'slot-sarah-test-tomorrow-02', 'CONFIRMED', null, 
  NOW() - INTERVAL '1 day', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-attendance-05');

-- ============================================================================
-- Part 2: Create COMPLETED bookings WITHOUT assessments
-- These bookings can be used to test "Record Assessment" feature
-- ============================================================================

-- Create past slots (YESTERDAY and 2 days ago)
INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-01',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-01');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-02',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-02');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-03',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day', '11:00', '11:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-03');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-04',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '2 days', '14:00', '14:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-04');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-05',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '2 days', '15:00', '15:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-05');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-06',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '3 days', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-06');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-test-past-07',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '3 days', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-test-past-07');

-- Create COMPLETED bookings WITHOUT assessments (for testing assessment recording)
INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-01', 'student-demo-001', 'slot-sarah-test-past-01', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '2 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-01');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-02', 'student-demo-002', 'slot-sarah-test-past-02', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '2 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-02');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-03', 'student-demo-003', 'slot-sarah-test-past-03', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '2 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-03');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-04', 'student-demo-004', 'slot-sarah-test-past-04', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '3 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-04');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-05', 'student-demo-005', 'slot-sarah-test-past-05', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '3 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-05');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-06', 'student-demo-006', 'slot-sarah-test-past-06', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '4 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-06')
  AND EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-006');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-test-assessment-07', 'student-demo-007', 'slot-sarah-test-past-07', 'COMPLETED', true, 
  CURRENT_DATE - INTERVAL '4 days', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-test-assessment-07')
  AND EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-007');

-- ============================================================================
-- SUMMARY OF CREATED TEST DATA
-- ============================================================================
-- 
-- TOTAL CREATED:
-- ✅ 12 slots for Teacher Sarah
--    - 5 slots for TODAY/TOMORROW (for attendance marking)
--    - 7 slots for PAST dates (for assessment recording)
--
-- ✅ 12 bookings:
--    - 5 CONFIRMED bookings (today/tomorrow) → Test "Mark Attendance"
--    - 7 COMPLETED bookings WITHOUT assessments → Test "Record Assessment"
--
-- HOW TO USE:
-- 
-- 1. Mark Attendance Testing:
--    - Login as teacher (sarah@10minuteschool.com)
--    - Navigate to bookings
--    - You should see 5 CONFIRMED bookings for today/tomorrow
--    - Mark attendance as COMPLETED, NO_SHOW, or CANCELLED
--
-- 2. Record Assessment Testing:
--    - Login as teacher (sarah@10minuteschool.com)
--    - Navigate to assessments
--    - You should see 7 COMPLETED bookings without assessments
--    - Record IELTS scores (Fluency, Lexical, Grammar, Pronunciation, Overall Band)
--    - Add remarks/feedback
--
-- NOTE: Uses existing students from demo-data-sarah-ahmed.sql
--       Make sure to run demo-data-sarah-ahmed.sql first!
-- ============================================================================

