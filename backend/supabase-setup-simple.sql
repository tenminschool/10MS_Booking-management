-- Simple Supabase Database Setup
-- Run this in the Supabase SQL Editor

-- Create custom types
DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'ASSESSMENT_READY', 'SYSTEM_ANNOUNCEMENT', 'ANNOUNCEMENT', 'REMINDER', 'URGENT', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  address text NOT NULL,
  contact_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT branches_pkey PRIMARY KEY (id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  phone_number text,
  email text,
  name text NOT NULL,
  role "UserRole" NOT NULL,
  branch_id text,
  hashed_password text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login_at timestamp with time zone,
  login_attempts integer DEFAULT 0 CHECK (login_attempts >= 0),
  locked_until timestamp with time zone,
  profile_picture text,
  department text,
  student_id text,
  emergency_contact text,
  date_of_birth date,
  gender character varying CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  preferred_language character varying DEFAULT 'en',
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

-- Create slots table
CREATE TABLE IF NOT EXISTS public.slots (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  branch_id text NOT NULL,
  teacher_id text NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  booked_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  blocked_by text,
  blocked_at timestamp with time zone,
  max_capacity integer DEFAULT 1,
  waiting_list_enabled boolean DEFAULT false,
  special_instructions text,
  room_number text,
  CONSTRAINT slots_pkey PRIMARY KEY (id),
  CONSTRAINT slots_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT slots_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id)
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL,
  slot_id text NOT NULL,
  status "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  attended boolean,
  cancellation_reason text,
  booked_at timestamp with time zone NOT NULL DEFAULT now(),
  cancelled_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  rescheduled_from text,
  rescheduled_at timestamp with time zone,
  reschedule_reason text,
  waiting_list_position integer CHECK (waiting_list_position > 0),
  special_requirements text,
  booking_source character varying DEFAULT 'online',
  confirmation_sent_at timestamp with time zone,
  reminder_sent_at timestamp with time zone,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

-- Create notifications table (enhanced)
CREATE TABLE IF NOT EXISTS public.notifications (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type "NotificationType" NOT NULL,
  status "NotificationStatus" NOT NULL DEFAULT 'SENT',
  is_read boolean NOT NULL DEFAULT false,
  priority character varying DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category character varying,
  action_url text,
  tags text[] DEFAULT '{}',
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  expires_at timestamp with time zone,
  sent_via character varying DEFAULT 'in_app',
  external_id text,
  metadata jsonb DEFAULT '{}',
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Create waiting_list table (enhanced)
CREATE TABLE IF NOT EXISTS public.waiting_list (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL,
  slot_id text NOT NULL,
  priority integer NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  position integer NOT NULL CHECK (position > 0),
  status character varying DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'cancelled')),
  requested_at timestamp with time zone DEFAULT now(),
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT waiting_list_pkey PRIMARY KEY (id),
  CONSTRAINT waiting_list_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT waiting_list_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS public.assessments (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  booking_id text NOT NULL,
  student_id text NOT NULL,
  teacher_id text NOT NULL,
  score double precision NOT NULL,
  remarks text,
  assessed_at timestamp with time zone NOT NULL DEFAULT now(),
  fluency_score double precision CHECK (fluency_score >= 0 AND fluency_score <= 9),
  coherence_score double precision CHECK (coherence_score >= 0 AND coherence_score <= 9),
  lexical_score double precision CHECK (lexical_score >= 0 AND lexical_score <= 9),
  grammar_score double precision CHECK (grammar_score >= 0 AND grammar_score <= 9),
  pronunciation_score double precision CHECK (pronunciation_score >= 0 AND pronunciation_score <= 9),
  overall_band double precision CHECK (overall_band >= 0 AND overall_band <= 9),
  is_draft boolean DEFAULT false,
  submitted_at timestamp with time zone,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  CONSTRAINT assessments_pkey PRIMARY KEY (id),
  CONSTRAINT assessments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  session_id text,
  request_id text,
  response_status integer,
  execution_time integer,
  risk_level character varying DEFAULT 'low',
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_by text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_slots_branch_id ON public.slots(branch_id);
CREATE INDEX IF NOT EXISTS idx_slots_teacher_id ON public.slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_waiting_list_student_id ON public.waiting_list(student_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_slot_id ON public.waiting_list(slot_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_status ON public.waiting_list(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- Insert sample data for testing
INSERT INTO public.branches (id, name, address, contact_number) VALUES 
('branch-1', 'Main Branch', '123 Main Street, Dhaka', '+880-1234567890'),
('branch-2', 'Gulshan Branch', '456 Gulshan Avenue, Dhaka', '+880-1234567891')
ON CONFLICT (id) DO NOTHING;

-- Insert sample users
INSERT INTO public.users (id, name, email, role, branch_id, hashed_password) VALUES 
('super-admin-1', 'Super Admin', 'admin@10ms.com', 'SUPER_ADMIN', NULL, '$2b$10$dummy.hash.for.testing'),
('branch-admin-1', 'Branch Admin', 'branch@10ms.com', 'BRANCH_ADMIN', 'branch-1', '$2b$10$dummy.hash.for.testing'),
('teacher-1', 'John Teacher', 'teacher@10ms.com', 'TEACHER', 'branch-1', '$2b$10$dummy.hash.for.testing'),
('student-1', 'Alice Student', 'student@10ms.com', 'STUDENT', 'branch-1', '$2b$10$dummy.hash.for.testing')
ON CONFLICT (id) DO NOTHING;

-- Insert sample slots
INSERT INTO public.slots (id, branch_id, teacher_id, date, start_time, end_time, capacity, booked_count) VALUES 
('slot-1', 'branch-1', 'teacher-1', CURRENT_DATE + INTERVAL '1 day', '09:00', '10:00', 1, 0),
('slot-2', 'branch-1', 'teacher-1', CURRENT_DATE + INTERVAL '1 day', '10:00', '11:00', 1, 0),
('slot-3', 'branch-1', 'teacher-1', CURRENT_DATE + INTERVAL '2 days', '09:00', '10:00', 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert sample notifications
INSERT INTO public.notifications (id, user_id, title, message, type, status) VALUES 
('notif-1', 'student-1', 'Welcome!', 'Welcome to the speaking test booking system.', 'ANNOUNCEMENT', 'SENT'),
('notif-2', 'teacher-1', 'New Slot Assigned', 'You have been assigned a new teaching slot.', 'ANNOUNCEMENT', 'SENT')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) for better security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (can be enhanced later)
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid()::text = student_id);
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own waiting list entries" ON public.waiting_list FOR SELECT USING (auth.uid()::text = student_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
