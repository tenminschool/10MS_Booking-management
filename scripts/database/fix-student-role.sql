-- Fix student role for student@10minuteschool.com
-- This script ensures the user has the correct STUDENT role

-- First, check if the user exists and what role they have
SELECT id, email, name, role, "phoneNumber" 
FROM public.users 
WHERE email = 'student@10minuteschool.com';

-- Update the user role to STUDENT if it's not already
UPDATE public.users 
SET role = 'STUDENT', "updatedAt" = NOW()
WHERE email = 'student@10minuteschool.com' 
AND role != 'STUDENT';

-- Verify the update
SELECT id, email, name, role, "phoneNumber" 
FROM public.users 
WHERE email = 'student@10minuteschool.com';

-- If the user doesn't exist, create them
INSERT INTO public.users (
  id, 
  email, 
  name, 
  role, 
  "isActive", 
  "createdAt", 
  "updatedAt"
)
SELECT 
  'student-email-' || extract(epoch from now())::text,
  'student@10minuteschool.com',
  'Test Student',
  'STUDENT',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'student@10minuteschool.com'
);

-- Final verification
SELECT id, email, name, role, "phoneNumber", "isActive"
FROM public.users 
WHERE email = 'student@10minuteschool.com';
