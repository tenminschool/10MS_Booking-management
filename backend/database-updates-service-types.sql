-- Service Types Implementation - Phase 1
-- Database schema updates for service types system

-- 1. Create service_types table (scalable design)
CREATE TABLE IF NOT EXISTS public.service_types (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  name text NOT NULL, -- 'CBT Full Mock', 'PBT Full Mock', etc.
  code text NOT NULL UNIQUE, -- 'CBT_FULL_MOCK', 'PBT_FULL_MOCK', etc.
  description text,
  category text NOT NULL DEFAULT 'paid', -- 'paid' or 'free'
  default_capacity integer DEFAULT 1,
  duration_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_types_pkey PRIMARY KEY (id)
);

-- 2. Insert initial service types for paid users
INSERT INTO public.service_types (name, code, description, category, default_capacity, duration_minutes) VALUES
('CBT Full Mock', 'CBT_FULL_MOCK', 'Computer Based Test Full Mock - Complete IELTS simulation', 'paid', 1, 180),
('PBT Full Mock', 'PBT_FULL_MOCK', 'Paper Based Test Full Mock - Complete IELTS simulation', 'paid', 1, 180),
('Speaking Mock Test', 'SPEAKING_MOCK_TEST', 'IELTS Speaking Mock Test - 15 minutes assessment', 'paid', 1, 15),
('1:1 Counselling', 'ONE_ON_ONE_COUNSELLING', 'Personal Counselling Session - Individual guidance', 'paid', 1, 60),
('Exam Accelerator Service', 'EXAM_ACCELERATOR_SERVICE', 'Intensive Exam Preparation - Focused study session', 'paid', 1, 120);

-- 3. Create pricing table for paid services
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  service_type_id text NOT NULL,
  branch_id text, -- NULL means applies to all branches
  price decimal(10,2) NOT NULL,
  currency text DEFAULT 'BDT',
  is_active boolean DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT service_pricing_service_type_fkey FOREIGN KEY (service_type_id) REFERENCES public.service_types(id),
  CONSTRAINT service_pricing_branch_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

-- 4. Create rooms table (future-proof design)
CREATE TABLE IF NOT EXISTS public.rooms (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  branch_id text NOT NULL,
  room_number text NOT NULL,
  room_name text NOT NULL,
  room_type text DEFAULT 'general', -- 'general', 'computer_lab', 'counselling', 'exam_hall'
  capacity integer NOT NULL DEFAULT 1,
  equipment text[], -- Available equipment
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT rooms_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT rooms_unique_per_branch UNIQUE (branch_id, room_number)
);

-- 5. Update slots table to include service type and room
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS service_type_id text REFERENCES public.service_types(id),
ADD COLUMN IF NOT EXISTS room_id text REFERENCES public.rooms(id),
ADD COLUMN IF NOT EXISTS price decimal(10,2); -- Slot-specific pricing override

-- 6. Update bookings table to include service type and payment info
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_type_id text REFERENCES public.service_types(id),
ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2),
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'; -- 'pending', 'paid', 'free'

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_slots_service_type ON public.slots(service_type_id);
CREATE INDEX IF NOT EXISTS idx_slots_room_id ON public.slots(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_type ON public.bookings(service_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_service_pricing_service_type ON public.service_pricing(service_type_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_branch ON public.service_pricing(branch_id);

-- 8. Insert sample rooms for existing branches (if any)
-- This will be populated by the application when branches are created

-- 9. Set default service type for existing slots (if any)
UPDATE public.slots 
SET service_type_id = (SELECT id FROM public.service_types WHERE code = 'SPEAKING_MOCK_TEST' LIMIT 1)
WHERE service_type_id IS NULL;

-- 10. Set default payment status for existing bookings (if any)
UPDATE public.bookings 
SET payment_status = 'free'
WHERE payment_status IS NULL;
