# Database Schema Validation Guide

## 🛡️ Prevention Measures to Avoid camelCase vs snake_case Confusion

### 1. **Schema Reference Document**
Always refer to this document before writing any database queries or SQL scripts.

### 2. **Actual Database Schema** (THE SOURCE OF TRUTH)
```sql
-- USERS TABLE
CREATE TABLE public.users (
  id text NOT NULL,
  phone_number text,                    -- ✅ snake_case
  email text,
  name text NOT NULL,
  role "UserRole" NOT NULL,
  branch_id text,                       -- ✅ snake_case
  hashed_password text,                 -- ✅ snake_case
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login_at timestamp with time zone,
  login_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  profile_picture text,
  department text,
  student_id text,
  emergency_contact text,
  date_of_birth date,
  gender character varying,
  preferred_language character varying DEFAULT 'en'
);

-- BRANCHES TABLE
CREATE TABLE public.branches (
  id text NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  contact_number text NOT NULL,         -- ✅ Actual column name from setup-database.sql
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- SLOTS TABLE
CREATE TABLE public.slots (
  id text NOT NULL,
  branch_id text NOT NULL,              -- ✅ snake_case
  teacher_id text NOT NULL,             -- ✅ snake_case
  date date NOT NULL,
  start_time text NOT NULL,             -- ✅ snake_case
  end_time text NOT NULL,               -- ✅ snake_case
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
  service_type_id text,
  room_id text,
  price numeric
);

-- BOOKINGS TABLE
CREATE TABLE public.bookings (
  id text NOT NULL,
  student_id text NOT NULL,             -- ✅ snake_case
  slot_id text NOT NULL,                -- ✅ snake_case
  status "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  attended boolean,
  cancellation_reason text,
  booked_at timestamp with time zone NOT NULL DEFAULT now(),  -- ✅ snake_case
  cancelled_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  rescheduled_from text,
  rescheduled_at timestamp with time zone,
  reschedule_reason text,
  waiting_list_position integer,
  special_requirements text,
  booking_source character varying DEFAULT 'online',
  confirmation_sent_at timestamp with time zone,
  reminder_sent_at timestamp with time zone,
  service_type_id text,
  amount_paid numeric,
  payment_status text DEFAULT 'pending'
);

-- ASSESSMENTS TABLE
CREATE TABLE public.assessments (
  id text NOT NULL,
  booking_id text NOT NULL,             -- ✅ snake_case
  student_id text NOT NULL,             -- ✅ snake_case
  teacher_id text NOT NULL,             -- ✅ snake_case
  score double precision NOT NULL,
  remarks text,
  assessed_at timestamp with time zone NOT NULL DEFAULT now(),  -- ✅ snake_case
  fluency_score double precision,
  coherence_score double precision,
  lexical_score double precision,
  grammar_score double precision,
  pronunciation_score double precision,
  overall_band double precision,
  is_draft boolean DEFAULT false,
  submitted_at timestamp with time zone,
  reviewed_by text,
  reviewed_at timestamp with time zone
);

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id text NOT NULL,
  user_id text NOT NULL,                -- ✅ snake_case
  title text NOT NULL,
  message text NOT NULL,
  type "NotificationType" NOT NULL,
  status "NotificationStatus" NOT NULL DEFAULT 'SENT',
  is_read boolean NOT NULL DEFAULT false,  -- ✅ snake_case
  priority character varying DEFAULT 'normal',
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
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- WAITING_LIST TABLE
CREATE TABLE public.waiting_list (
  id text NOT NULL,
  student_id text NOT NULL,             -- ✅ snake_case
  slot_id text NOT NULL,                -- ✅ snake_case
  priority integer NOT NULL DEFAULT 5,
  position integer NOT NULL,
  status character varying DEFAULT 'waiting',
  requested_at timestamp with time zone DEFAULT now(),  -- ✅ snake_case
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- SERVICE_TYPES TABLE
CREATE TABLE public.service_types (
  id text NOT NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'paid',
  default_capacity integer DEFAULT 1,
  duration_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ROOMS TABLE
CREATE TABLE public.rooms (
  id text NOT NULL,
  branch_id text NOT NULL,              -- ✅ snake_case
  room_number text NOT NULL,            -- ✅ snake_case
  room_name text NOT NULL,              -- ✅ snake_case
  room_type text DEFAULT 'general',
  capacity integer NOT NULL DEFAULT 1,
  equipment text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

## 🔍 **Validation Checklist**

Before writing any SQL script or database query, ALWAYS check:

### ✅ **SQL Scripts Checklist**
- [ ] All column names use snake_case (e.g., `student_id`, not `studentId`)
- [ ] All table names use snake_case (e.g., `waiting_list`, not `waitingList`)
- [ ] All timestamp columns use snake_case (e.g., `created_at`, not `createdAt`)
- [ ] All foreign key columns use snake_case (e.g., `branch_id`, not `branchId`)

### ✅ **Supabase Queries Checklist**
- [ ] Query column names match the actual database schema exactly
- [ ] Use `.eq('student_id', value)` not `.eq('studentId', value)`
- [ ] Use `.order('booked_at', { ascending: false })` not `.order('bookedAt', { ascending: false })`
- [ ] Use `.select('user_id, created_at')` not `.select('userId, createdAt')`

### ✅ **TypeScript Interfaces Checklist**
- [ ] Interface properties match database column names exactly
- [ ] Use `student_id: string` not `studentId: string`
- [ ] Use `created_at: Date` not `createdAt: Date`
- [ ] Use `branch_id?: string` not `branchId?: string`

## 🚨 **Common Mistakes to Avoid**

### ❌ **WRONG - Don't Do This**
```typescript
// Supabase Query - WRONG
.eq('studentId', user.userId)           // ❌ Column doesn't exist
.order('bookedAt', { ascending: false }) // ❌ Column doesn't exist
.eq('branchId', branchId)               // ❌ Column doesn't exist

// SQL Script - WRONG
INSERT INTO users (studentId, bookedAt, branchId) VALUES (...)  // ❌ Columns don't exist

// TypeScript Interface - WRONG
interface User {
  studentId: string;    // ❌ Should match DB: student_id
  bookedAt: Date;       // ❌ Should match DB: booked_at
  branchId: string;     // ❌ Should match DB: branch_id
}
```

### ✅ **CORRECT - Do This Instead**
```typescript
// Supabase Query - CORRECT
.eq('student_id', user.userId)          // ✅ Matches actual DB column
.order('booked_at', { ascending: false }) // ✅ Matches actual DB column
.eq('branch_id', branchId)              // ✅ Matches actual DB column

// SQL Script - CORRECT
INSERT INTO users (student_id, booked_at, branch_id) VALUES (...)  // ✅ Matches actual DB columns

// TypeScript Interface - CORRECT
interface User {
  student_id: string;   // ✅ Matches actual DB column
  booked_at: Date;      // ✅ Matches actual DB column
  branch_id: string;    // ✅ Matches actual DB column
}
```

## 🔧 **Tools and Automation**

### 1. **Schema Validation Script**
Create a script to validate all queries against the actual schema.

### 2. **Pre-commit Hooks**
Add hooks to check for camelCase in SQL files.

### 3. **TypeScript Strict Mode**
Enable strict mode to catch type mismatches.

### 4. **Database Schema Documentation**
Keep this document updated with any schema changes.

## 📋 **Action Items for Developers**

1. **Before writing any database code:**
   - Read this schema reference
   - Check the actual database structure
   - Validate column names against this document

2. **When creating SQL scripts:**
   - Use only snake_case column names
   - Test the script on a sample database first
   - Verify all column names exist in the actual schema

3. **When writing Supabase queries:**
   - Copy column names directly from this schema reference
   - Never assume column names
   - Always use snake_case

4. **When updating TypeScript interfaces:**
   - Match the database schema exactly
   - Use snake_case for all properties
   - Update this document if schema changes

## 🎯 **Success Metrics**

- ✅ Zero camelCase column names in SQL scripts
- ✅ Zero camelCase column names in Supabase queries
- ✅ All TypeScript interfaces match database schema
- ✅ All database operations work without column errors
- ✅ Consistent naming across the entire codebase
