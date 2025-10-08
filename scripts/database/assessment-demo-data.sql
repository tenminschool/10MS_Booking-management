-- Assessment Demo Data for Teacher Sarah Ahmed (Actual Schema - CamelCase)
-- This script creates comprehensive assessment data for testing teacher assessment functionality
-- Based on actual database schema inspection
-- IMPORTANT: Run demo-data-sarah-ahmed.sql FIRST before running this script

-- Create assessments for the completed bookings
INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-001',
  'booking-sarah-demo-001',
  'student-demo-001',
  'teacher-sarah',
  7.0, 7.0, 7.0, 6.5, 7.0, 7.5, 7.0,
  'Rahim demonstrated good fluency with natural pauses and self-correction. Vocabulary was appropriate but could be more varied. Grammar was mostly accurate with occasional errors. Pronunciation was clear and generally easy to understand.',
  '2025-01-15 09:30:00', false, '2025-01-15 09:30:00', 'teacher-sarah', '2025-01-15 09:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-001')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-001');

INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-002',
  'booking-sarah-demo-002',
  'student-demo-002',
  'teacher-sarah',
  6.5, 6.5, 6.0, 6.5, 6.5, 7.0, 6.5,
  'Fatima spoke with reasonable fluency but had some hesitation. Ideas were generally clear but could be more developed. Used basic vocabulary appropriately. Grammar was mostly accurate. Pronunciation was clear.',
  '2025-01-15 09:50:00', false, '2025-01-15 09:50:00', 'teacher-sarah', '2025-01-15 09:50:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-002')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-002');

INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-003',
  'booking-sarah-demo-003',
  'student-demo-003',
  'teacher-sarah',
  8.0, 8.0, 8.0, 7.5, 8.0, 8.5, 8.0,
  'Excellent performance! Karim spoke fluently with very little hesitation. Ideas were well-developed and coherent. Used sophisticated vocabulary appropriately. Grammar was highly accurate. Pronunciation was clear and natural.',
  '2025-01-15 10:30:00', false, '2025-01-15 10:30:00', 'teacher-sarah', '2025-01-15 10:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-003')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-003');

-- Additional students for more assessment data
INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-006', 'Nazmul Hasan', '+8801798765006', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-006')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765006');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-007', 'Taslima Khatun', '+8801798765007', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-007')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765007');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-008', 'Abdul Kader', '+8801798765008', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-008')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765008');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-009', 'Rashida Begum', '+8801798765009', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-009')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765009');

INSERT INTO public.users (id, name, "phoneNumber", role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'student-demo-010', 'Mahmudul Hasan', '+8801798765010', 'STUDENT', 
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1), 
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'student-demo-010')
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE "phoneNumber" = '+8801798765010');

-- Create more slots for additional assessment data
INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-011',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-10', '09:00', '09:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-011');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-012',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-10', '10:00', '10:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-012');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-013',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-11', '11:00', '11:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-013');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-014',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-11', '14:00', '14:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-014');

INSERT INTO public.slots (
  id, "branchId", "teacherId", service_type_id, room_id, 
  date, "startTime", "endTime", capacity, price, 
  "createdAt", "updatedAt"
)
SELECT 
  'slot-sarah-demo-015',
  (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1),
  'teacher-sarah',
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1),
  (SELECT id FROM public.rooms WHERE branch_id = (SELECT "branchId" FROM public.users WHERE id = 'teacher-sarah' LIMIT 1) LIMIT 1),
  '2025-01-12', '15:00', '15:15', 1, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.slots WHERE id = 'slot-sarah-demo-015');

-- Create more bookings
INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-011', 'student-demo-006', 'slot-sarah-demo-011', 'COMPLETED', true, 
  '2025-01-09 10:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-011');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-012', 'student-demo-007', 'slot-sarah-demo-012', 'COMPLETED', true, 
  '2025-01-09 10:30:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-012');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-013', 'student-demo-008', 'slot-sarah-demo-013', 'COMPLETED', true, 
  '2025-01-10 11:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-013');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-014', 'student-demo-009', 'slot-sarah-demo-014', 'COMPLETED', false, 
  '2025-01-10 13:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-014');

INSERT INTO public.bookings (
  id, "studentId", "slotId", status, attended, 
  "bookedAt", "updatedAt", service_type_id, amount_paid, payment_status
)
SELECT 
  'booking-sarah-demo-015', 'student-demo-010', 'slot-sarah-demo-015', 'COMPLETED', true, 
  '2025-01-11 14:00:00', NOW(), 
  (SELECT id FROM public.service_types WHERE is_active = true LIMIT 1), 
  500, 'paid'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-015');

-- Create more assessments with varied scores
INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-004',
  'booking-sarah-demo-011',
  'student-demo-006',
  'teacher-sarah',
  7.5, 7.5, 7.5, 7.0, 7.5, 8.0, 7.5,
  'Strong performance! Nazmul spoke fluently with natural rhythm. Ideas were well-organized and coherent. Used a good range of vocabulary. Grammar was mostly accurate with complex structures. Pronunciation was very clear.',
  '2025-01-10 09:30:00', false, '2025-01-10 09:30:00', 'teacher-sarah', '2025-01-10 09:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-004')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-011');

INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-005',
  'booking-sarah-demo-012',
  'student-demo-007',
  'teacher-sarah',
  6.0, 6.0, 5.5, 6.0, 6.0, 6.5, 6.0,
  'Taslima spoke with some fluency but frequent hesitation. Ideas were sometimes unclear. Vocabulary was basic but sufficient. Grammar had some errors but was generally understandable. Pronunciation was mostly clear.',
  '2025-01-10 10:30:00', false, '2025-01-10 10:30:00', 'teacher-sarah', '2025-01-10 10:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-005')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-012');

INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-006',
  'booking-sarah-demo-013',
  'student-demo-008',
  'teacher-sarah',
  8.5, 8.5, 8.5, 8.0, 8.5, 9.0, 8.5,
  'Outstanding performance! Abdul demonstrated near-native fluency. Ideas were sophisticated and well-articulated. Excellent vocabulary range and accuracy. Grammar was exemplary. Pronunciation was natural and effortless.',
  '2025-01-11 11:30:00', false, '2025-01-11 11:30:00', 'teacher-sarah', '2025-01-11 11:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-006')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-013');

INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-007',
  'booking-sarah-demo-014',
  'student-demo-009',
  'teacher-sarah',
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  'Student did not attend the session. No assessment conducted.',
  '2025-01-11 14:30:00', false, '2025-01-11 14:30:00', 'teacher-sarah', '2025-01-11 14:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-007')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-014');

INSERT INTO public.assessments (
  id, 
  "bookingId", 
  "studentId", 
  "teacherId", 
  score, 
  "fluencyScore",
  "coherenceScore",
  "lexicalScore",
  "grammarScore",
  "pronunciationScore",
  "overallBand",
  remarks, 
  "assessedAt",
  "isDraft",
  "submittedAt",
  "reviewedBy",
  "reviewedAt"
)
SELECT 
  'assessment-sarah-demo-008',
  'booking-sarah-demo-015',
  'student-demo-010',
  'teacher-sarah',
  5.5, 5.5, 5.0, 5.5, 6.0, 6.0, 5.5,
  'Mahmudul struggled with fluency and had significant hesitation throughout. Ideas were underdeveloped. Vocabulary was limited. Grammar had frequent errors. Needs more practice and confidence building.',
  '2025-01-12 15:30:00', false, '2025-01-12 15:30:00', 'teacher-sarah', '2025-01-12 15:30:00'
WHERE NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = 'assessment-sarah-demo-008')
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = 'booking-sarah-demo-015');

-- Summary of created data:
-- Total created:
-- - 10 students (5 from first script + 5 additional)
-- - 15 slots for Sarah Ahmed (10 from first script + 5 additional)
-- - 14 bookings total:
--   * 8 with assessments (3 from first script bookings + 5 new)
--   * 3 completed without assessments (pending assessment from first script)
--   * 1 no-show with assessment
--   * 2 confirmed upcoming bookings
-- - 8 comprehensive assessments with detailed IELTS scoring

-- This provides:
-- ✅ Students with completed assessments (for viewing results)
-- ✅ Students with pending assessments (for conducting new assessments)  
-- ✅ Mix of score ranges (5.5 to 8.5)
-- ✅ No-show case
-- ✅ Upcoming confirmed bookings
-- ✅ All students belong to Sarah Ahmed's branch