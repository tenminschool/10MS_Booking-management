-- Demo Data for Teacher Sarah Ahmed (Actual Schema - CamelCase)
-- This script creates comprehensive demo data for testing teacher functionality
-- Based on actual database schema inspection

-- Note: This script uses existing teacher-sarah and creates all necessary related data
-- Run this script after ensuring the base schema is set up

-- Step 1: Create additional students for testing
INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-001', 'Rahim Khan', '+8801798765001', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-001')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765001');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-002', 'Fatima Begum', '+8801798765002', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-002')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765002');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-003', 'Karim Uddin', '+8801798765003', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-003')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765003');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-004', 'Ayesha Rahman', '+8801798765004', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-004')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765004');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-005', 'Mohammad Ali', '+8801798765005', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-005')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765005');

-- Step 2: Create additional slots for Sarah Ahmed
-- Get the first available service type and room for Sarah's branch
INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-001',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-15', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-001');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-002',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-15', '09:30', '09:45', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-002');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-003',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-15', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-003');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-004',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-16', '11:00', '11:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-004');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-005',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-16', '14:00', '14:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-005');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-006',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-10-01', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-006');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-007',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-10-01', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-007');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-008',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-10-02', '11:00', '11:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-008');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-009',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-10-15', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-009');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-010',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-10-15', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-010');

-- Step 3: Create bookings for Sarah Ahmed's slots
INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-001', 'student-demo-001', 'slot-sarah-demo-001', 'COMPLETED', true, 
  '2025-01-14 10:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-001');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-002', 'student-demo-002', 'slot-sarah-demo-002', 'COMPLETED', true, 
  '2025-01-14 10:30:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-002');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-003', 'student-demo-003', 'slot-sarah-demo-003', 'COMPLETED', true, 
  '2025-01-14 11:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-003');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-004', 'student-demo-004', 'slot-sarah-demo-006', 'COMPLETED', true, 
  '2025-09-30 10:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-004');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-005', 'student-demo-005', 'slot-sarah-demo-007', 'COMPLETED', true, 
  '2025-09-30 10:30:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-005');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-006', 'student-demo-001', 'slot-sarah-demo-008', 'COMPLETED', true, 
  '2025-10-01 11:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-006');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-007', 'student-demo-002', 'slot-sarah-demo-004', 'NO_SHOW', false, 
  '2025-01-15 12:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-007');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-008', 'student-demo-003', 'slot-sarah-demo-009', 'CONFIRMED', null, 
  '2025-10-08 10:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-008');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-009', 'student-demo-004', 'slot-sarah-demo-010', 'CONFIRMED', null, 
  '2025-10-08 10:30:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-009');

-- Summary
-- Created:
-- - 5 students (all assigned to same branch as Sarah Ahmed)
-- - 10 slots for Sarah Ahmed (past and future)
-- - 9 bookings (3 completed with assessments to be added, 3 completed pending assessment, 1 no-show, 2 upcoming)
-- This provides a good mix of data for testing teacher functionality