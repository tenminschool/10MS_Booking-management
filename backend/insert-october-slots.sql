-- Insert October 2024 slots for 5 branches
-- Run this script in your Supabase SQL Editor

-- First, insert the 5 branches if they don't exist
INSERT INTO public.branches (id, name, address, "contactNumber", "isActive", "createdAt", "updatedAt") VALUES 
('branch-mirpur', 'Mirpur Branch', 'House 12, Road 7, Mirpur 1, Dhaka 1216', '+880-2-9001234', true, NOW(), NOW()),
('branch-uttara', 'Uttara Branch', 'House 15, Sector 7, Uttara, Dhaka 1230', '+880-2-9001235', true, NOW(), NOW()),
('branch-mogbazar', 'Mogbazar Branch', 'House 8, Mogbazar, Dhaka 1217', '+880-2-9001236', true, NOW(), NOW()),
('branch-panthapath', 'Panthapath Branch', 'House 25, Panthapath, Dhaka 1205', '+880-2-9001237', true, NOW(), NOW()),
('branch-chittagong', 'Chittagong Branch', 'House 30, Agrabad, Chittagong 4100', '+880-2-9001238', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert super admins first
INSERT INTO public.users (id, name, email, role, "hashedPassword", "isActive", "createdAt", "updatedAt", "lastLoginAt", "loginAttempts", "preferredLanguage") VALUES 
('super-admin-raied', 'Raied', 'raied@10minuteschool.com', 'SUPER_ADMIN', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('super-admin-mukit', 'Mukit', 'mukit@10minuteschool.com', 'SUPER_ADMIN', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('super-admin-avipsu', 'Avipsu', 'avipsu@10minuteschool.com', 'SUPER_ADMIN', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en')
ON CONFLICT (id) DO NOTHING;

-- Insert sample teachers for each branch
INSERT INTO public.users (id, name, email, role, "branchId", "hashedPassword", "isActive", "createdAt", "updatedAt", "lastLoginAt", "loginAttempts", "preferredLanguage") VALUES 
('teacher-mirpur-1', 'Sarah Ahmed', 'sarah@10ms.com', 'TEACHER', 'branch-mirpur', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-mirpur-2', 'Rahim Khan', 'rahim@10ms.com', 'TEACHER', 'branch-mirpur', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-uttara-1', 'Fatima Begum', 'fatima@10ms.com', 'TEACHER', 'branch-uttara', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-uttara-2', 'Karim Uddin', 'karim@10ms.com', 'TEACHER', 'branch-uttara', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-mogbazar-1', 'Ayesha Rahman', 'ayesha@10ms.com', 'TEACHER', 'branch-mogbazar', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-mogbazar-2', 'Hasan Ali', 'hasan@10ms.com', 'TEACHER', 'branch-mogbazar', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-panthapath-1', 'Nusrat Jahan', 'nusrat@10ms.com', 'TEACHER', 'branch-panthapath', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-panthapath-2', 'Mohammad Ali', 'mohammad@10ms.com', 'TEACHER', 'branch-panthapath', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-chittagong-1', 'Rashida Khatun', 'rashida@10ms.com', 'TEACHER', 'branch-chittagong', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en'),
('teacher-chittagong-2', 'Abdul Rahman', 'abdul@10ms.com', 'TEACHER', 'branch-chittagong', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en')
ON CONFLICT (id) DO NOTHING;

-- Insert sample student for bookings
INSERT INTO public.users (id, name, email, role, "hashedPassword", "isActive", "createdAt", "updatedAt", "lastLoginAt", "loginAttempts", "preferredLanguage") VALUES 
('student-1', 'Test Student', 'student@test.com', 'STUDENT', '$2b$10$dummy.hash.for.testing', true, NOW(), NOW(), NOW(), 0, 'en')
ON CONFLICT (id) DO NOTHING;

-- Generate slots for October 2024 (31 days)
-- Each branch will have 2-3 slots per day with different time slots
-- Time slots: 9:00-10:00, 10:30-11:30, 2:00-3:00, 3:30-4:30, 5:00-6:00

-- Generate slots for October 2024 - Simple approach with explicit time values
-- Each branch will have 2-3 slots per day with different time slots

-- Mirpur Branch Slots (3 days sample)
INSERT INTO public.slots (id, "branchId", "teacherId", date, "startTime", "endTime", capacity, "createdAt", "updatedAt", "isBlocked", "maxCapacity", "waitingListEnabled", "roomNumber") VALUES 
('slot-branch-mirpur-20241001-1', 'branch-mirpur', 'teacher-mirpur-1', '2024-10-01', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-mirpur-20241001-2', 'branch-mirpur', 'teacher-mirpur-2', '2024-10-01', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-mirpur-20241001-3', 'branch-mirpur', 'teacher-mirpur-1', '2024-10-01', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-mirpur-20241002-1', 'branch-mirpur', 'teacher-mirpur-2', '2024-10-02', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-mirpur-20241002-2', 'branch-mirpur', 'teacher-mirpur-1', '2024-10-02', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-mirpur-20241002-3', 'branch-mirpur', 'teacher-mirpur-2', '2024-10-02', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-mirpur-20241003-1', 'branch-mirpur', 'teacher-mirpur-1', '2024-10-03', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-mirpur-20241003-2', 'branch-mirpur', 'teacher-mirpur-2', '2024-10-03', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-mirpur-20241003-3', 'branch-mirpur', 'teacher-mirpur-1', '2024-10-03', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3')
ON CONFLICT (id) DO NOTHING;

-- Uttara Branch Slots (3 days sample)
INSERT INTO public.slots (id, "branchId", "teacherId", date, "startTime", "endTime", capacity, "createdAt", "updatedAt", "isBlocked", "maxCapacity", "waitingListEnabled", "roomNumber") VALUES 
('slot-branch-uttara-20241001-1', 'branch-uttara', 'teacher-uttara-1', '2024-10-01', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-uttara-20241001-2', 'branch-uttara', 'teacher-uttara-2', '2024-10-01', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-uttara-20241001-3', 'branch-uttara', 'teacher-uttara-1', '2024-10-01', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-uttara-20241002-1', 'branch-uttara', 'teacher-uttara-2', '2024-10-02', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-uttara-20241002-2', 'branch-uttara', 'teacher-uttara-1', '2024-10-02', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-uttara-20241002-3', 'branch-uttara', 'teacher-uttara-2', '2024-10-02', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-uttara-20241003-1', 'branch-uttara', 'teacher-uttara-1', '2024-10-03', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-uttara-20241003-2', 'branch-uttara', 'teacher-uttara-2', '2024-10-03', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-uttara-20241003-3', 'branch-uttara', 'teacher-uttara-1', '2024-10-03', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3')
ON CONFLICT (id) DO NOTHING;

-- Mogbazar Branch Slots (3 days sample)
INSERT INTO public.slots (id, "branchId", "teacherId", date, "startTime", "endTime", capacity, "createdAt", "updatedAt", "isBlocked", "maxCapacity", "waitingListEnabled", "roomNumber") VALUES 
('slot-branch-mogbazar-20241001-1', 'branch-mogbazar', 'teacher-mogbazar-1', '2024-10-01', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-mogbazar-20241001-2', 'branch-mogbazar', 'teacher-mogbazar-2', '2024-10-01', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-mogbazar-20241001-3', 'branch-mogbazar', 'teacher-mogbazar-1', '2024-10-01', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-mogbazar-20241002-1', 'branch-mogbazar', 'teacher-mogbazar-2', '2024-10-02', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-mogbazar-20241002-2', 'branch-mogbazar', 'teacher-mogbazar-1', '2024-10-02', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-mogbazar-20241002-3', 'branch-mogbazar', 'teacher-mogbazar-2', '2024-10-02', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-mogbazar-20241003-1', 'branch-mogbazar', 'teacher-mogbazar-1', '2024-10-03', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-mogbazar-20241003-2', 'branch-mogbazar', 'teacher-mogbazar-2', '2024-10-03', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-mogbazar-20241003-3', 'branch-mogbazar', 'teacher-mogbazar-1', '2024-10-03', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3')
ON CONFLICT (id) DO NOTHING;

-- Panthapath Branch Slots (3 days sample)
INSERT INTO public.slots (id, "branchId", "teacherId", date, "startTime", "endTime", capacity, "createdAt", "updatedAt", "isBlocked", "maxCapacity", "waitingListEnabled", "roomNumber") VALUES 
('slot-branch-panthapath-20241001-1', 'branch-panthapath', 'teacher-panthapath-1', '2024-10-01', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-panthapath-20241001-2', 'branch-panthapath', 'teacher-panthapath-2', '2024-10-01', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-panthapath-20241001-3', 'branch-panthapath', 'teacher-panthapath-1', '2024-10-01', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-panthapath-20241002-1', 'branch-panthapath', 'teacher-panthapath-2', '2024-10-02', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-panthapath-20241002-2', 'branch-panthapath', 'teacher-panthapath-1', '2024-10-02', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-panthapath-20241002-3', 'branch-panthapath', 'teacher-panthapath-2', '2024-10-02', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-panthapath-20241003-1', 'branch-panthapath', 'teacher-panthapath-1', '2024-10-03', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-panthapath-20241003-2', 'branch-panthapath', 'teacher-panthapath-2', '2024-10-03', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-panthapath-20241003-3', 'branch-panthapath', 'teacher-panthapath-1', '2024-10-03', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3')
ON CONFLICT (id) DO NOTHING;

-- Chittagong Branch Slots (3 days sample)
INSERT INTO public.slots (id, "branchId", "teacherId", date, "startTime", "endTime", capacity, "createdAt", "updatedAt", "isBlocked", "maxCapacity", "waitingListEnabled", "roomNumber") VALUES 
('slot-branch-chittagong-20241001-1', 'branch-chittagong', 'teacher-chittagong-1', '2024-10-01', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-chittagong-20241001-2', 'branch-chittagong', 'teacher-chittagong-2', '2024-10-01', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-chittagong-20241001-3', 'branch-chittagong', 'teacher-chittagong-1', '2024-10-01', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-chittagong-20241002-1', 'branch-chittagong', 'teacher-chittagong-2', '2024-10-02', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-chittagong-20241002-2', 'branch-chittagong', 'teacher-chittagong-1', '2024-10-02', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-chittagong-20241002-3', 'branch-chittagong', 'teacher-chittagong-2', '2024-10-02', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3'),
('slot-branch-chittagong-20241003-1', 'branch-chittagong', 'teacher-chittagong-1', '2024-10-03', '09:00', '10:00', 2, NOW(), NOW(), false, 2, false, 'Room 1'),
('slot-branch-chittagong-20241003-2', 'branch-chittagong', 'teacher-chittagong-2', '2024-10-03', '10:30', '11:30', 1, NOW(), NOW(), false, 1, false, 'Room 2'),
('slot-branch-chittagong-20241003-3', 'branch-chittagong', 'teacher-chittagong-1', '2024-10-03', '14:00', '15:00', 1, NOW(), NOW(), false, 1, false, 'Room 3')
ON CONFLICT (id) DO NOTHING;

-- Create some sample bookings for October slots
INSERT INTO public.bookings (id, "studentId", "slotId", status, "bookedAt", "updatedAt") VALUES 
('booking-1', 'student-1', 'slot-branch-mirpur-20241001-1', 'CONFIRMED', NOW(), NOW()),
('booking-2', 'student-1', 'slot-branch-uttara-20241002-1', 'CONFIRMED', NOW(), NOW()),
('booking-3', 'student-1', 'slot-branch-mogbazar-20241003-1', 'CONFIRMED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
