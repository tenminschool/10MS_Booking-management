# Database Schema Analysis

## ✅ Database Naming Convention

This project uses **snake_case** in the database and **camelCase** in TypeScript code, which is standard practice with Supabase + TypeScript.

### How It Works:
- **Database columns**: `student_id`, `booked_at`, `created_at` (snake_case)
- **TypeScript code**: `studentId`, `bookedAt`, `createdAt` (camelCase)
- **Supabase Client**: Automatically converts between the two formats

This is **NOT a bug** - it's how Supabase's TypeScript client works by design.

## 📊 Current State Analysis

### 1. **Actual Database Schema** (snake_case) ✅
```sql
-- From setup-database.sql - THE TRUTH
CREATE TABLE public.users (
  id text NOT NULL,
  phone_number text,           -- ✅ snake_case
  email text,
  name text NOT NULL,
  role "UserRole" NOT NULL,
  branch_id text,              -- ✅ snake_case
  hashed_password text,        -- ✅ snake_case
  created_at timestamp with time zone NOT NULL DEFAULT now(),  -- ✅ snake_case
  updated_at timestamp with time zone NOT NULL DEFAULT now()   -- ✅ snake_case
);

CREATE TABLE public.bookings (
  id text NOT NULL,
  student_id text NOT NULL,    -- ✅ snake_case
  slot_id text NOT NULL,       -- ✅ snake_case
  booked_at timestamp with time zone NOT NULL DEFAULT now(),   -- ✅ snake_case
  updated_at timestamp with time zone NOT NULL DEFAULT now()   -- ✅ snake_case
);
```

### 2. **Application Code** (camelCase) ✅
```typescript
// backend/src/routes/dashboard.ts - CORRECT
.eq('studentId', user.userId)           // ✅ Supabase converts to student_id
.order('bookedAt', { ascending: false }) // ✅ Supabase converts to booked_at

// backend/src/routes/bookings.ts - CORRECT
.eq('studentId', user.userId)           // ✅ Works correctly
```

### 3. **TypeScript Interfaces** (camelCase) ✅
```typescript
// backend/src/types/database.ts - CORRECT
export interface User {
  id: string;
  phoneNumber?: string;  // ✅ Matches Supabase client output
  role: UserRole;
  branchId?: string;     // ✅ Matches Supabase client output
}
```

## 📋 Database Schema Overview

### Core Tables

#### Users Table
```sql
CREATE TABLE public.users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone_number text,
  role "UserRole" NOT NULL,
  branch_id text,
  hashed_password text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Bookings Table
```sql
CREATE TABLE public.bookings (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES users(id),
  slot_id text NOT NULL REFERENCES slots(id),
  status "BookingStatus" DEFAULT 'CONFIRMED',
  attended boolean,
  booked_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Slots Table
```sql
CREATE TABLE public.slots (
  id text PRIMARY KEY,
  teacher_id text REFERENCES users(id),
  room_id text REFERENCES rooms(id),
  branch_id text REFERENCES branches(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer DEFAULT 1,
  is_available boolean DEFAULT true
);
```

#### Assessments Table
```sql
CREATE TABLE public.assessments (
  id text PRIMARY KEY,
  booking_id text REFERENCES bookings(id),
  student_id text REFERENCES users(id),
  teacher_id text REFERENCES users(id),
  score float NOT NULL,
  fluency_score float,
  coherence_score float,
  grammar_score float,
  vocabulary_score float,
  pronunciation_score float,
  remarks text,
  assessed_at timestamptz DEFAULT now()
);
```

## 🔍 Key Points

1. **Database uses snake_case**: `student_id`, `booked_at`, `created_at`
2. **Supabase client converts automatically**: Can use either `studentId` or `student_id` in queries
3. **TypeScript interfaces use camelCase**: Matches JavaScript conventions
4. **Both approaches work**: The current implementation is correct

## 📚 Best Practices

1. **In Supabase queries**: Use camelCase (matches TypeScript)
2. **In raw SQL**: Use snake_case (matches database)
3. **In TypeScript types**: Use camelCase (matches JavaScript)
4. **Be consistent**: Choose one approach per context
