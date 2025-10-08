-- Demo notifications for teachers
-- This script adds sample notifications for teachers to test the notification system

-- First, let's get the teacher user ID (assuming Sarah Ahmed is a teacher)
-- You may need to adjust the user ID based on your actual data

-- Insert demo notifications for teachers
INSERT INTO notifications (
  id,
  user_id,
  title,
  message,
  type,
  is_read,
  created_at,
  priority,
  category
) VALUES 
-- Notification 1: Booking reminder
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
  'Upcoming Session Reminder',
  'You have a speaking test session tomorrow at 10:00 AM with 3 students at Gulshan Branch.',
  'BOOKING_REMINDER',
  false,
  NOW() - INTERVAL '2 hours',
  'normal',
  'booking'
),

-- Notification 2: New booking
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
  'New Booking Confirmed',
  'A new student has booked your session on December 15th at 2:00 PM.',
  'BOOKING_CONFIRMED',
  false,
  NOW() - INTERVAL '1 day',
  'normal',
  'booking'
),

-- Notification 3: System alert
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
  'System Maintenance',
  'Scheduled maintenance will occur on Sunday, December 17th from 2:00 AM to 4:00 AM.',
  'SYSTEM_ALERT',
  true,
  NOW() - INTERVAL '3 days',
  'high',
  'system'
),

-- Notification 4: Assessment reminder
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
  'Assessment Due',
  'You have pending assessments to complete for 2 students from yesterday''s sessions.',
  'BOOKING_REMINDER',
  false,
  NOW() - INTERVAL '6 hours',
  'high',
  'assessment'
),

-- Notification 5: Welcome message (read)
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
  'Welcome to 10MS!',
  'Thank you for joining our teaching platform. Your dashboard is ready to use.',
  'SYSTEM_ALERT',
  true,
  NOW() - INTERVAL '1 week',
  'low',
  'system'
);

-- If no teacher exists, create a fallback notification for any user with role 'TEACHER'
-- This ensures the script works even if the specific teacher doesn't exist
DO $$
DECLARE
    teacher_id TEXT;
BEGIN
    -- Get the first teacher user ID
    SELECT id INTO teacher_id FROM users WHERE role = 'TEACHER' LIMIT 1;
    
    -- If no teacher exists, create a notification for the first user (fallback)
    IF teacher_id IS NULL THEN
        SELECT id INTO teacher_id FROM users LIMIT 1;
        
        -- Insert a simple notification
        INSERT INTO notifications (
            id,
            user_id,
            title,
            message,
            type,
            is_read,
            created_at,
            priority,
            category
        ) VALUES (
            gen_random_uuid(),
            teacher_id,
            'Demo Notification',
            'This is a demo notification to test the notification system.',
            'SYSTEM_ALERT',
            false,
            NOW(),
            'normal',
            'system'
        );
    END IF;
END $$;
