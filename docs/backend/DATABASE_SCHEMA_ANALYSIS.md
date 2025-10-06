# Database Schema Analysis - Root Cause of camelCase vs snake_case Confusion

## 🚨 ROOT CAUSE IDENTIFIED

The persistent confusion between camelCase and snake_case is caused by **INCONSISTENT DATABASE QUERY USAGE** in the application code.

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

### 2. **Application Code** (MIXED - WRONG) ❌
```typescript
// backend/src/routes/dashboard.ts - WRONG USAGE
.eq('studentId', user.userId)           // ❌ Should be 'student_id'
.order('bookedAt', { ascending: false }) // ❌ Should be 'booked_at'

// backend/src/routes/users.ts - WRONG USAGE  
.eq('branchId', branchId as string)     // ❌ Should be 'branch_id'

// backend/src/routes/bookings.ts - WRONG USAGE
.eq('studentId', user.userId)           // ❌ Should be 'student_id'
```

### 3. **TypeScript Interfaces** (camelCase) ⚠️
```typescript
// backend/src/types/database.ts - INCONSISTENT
export interface User {
  id: string;
  phoneNumber?: string;  // ❌ Should match DB: phone_number
  role: UserRole;
  branchId?: string;     // ❌ Should match DB: branch_id
}
```

## 🔧 THE FIX

### Step 1: Update All Supabase Queries to Use snake_case

**Files that need fixing:**
- `backend/src/routes/dashboard.ts`
- `backend/src/routes/users.ts` 
- `backend/src/routes/bookings.ts`
- `backend/src/routes/slots.ts`
- `backend/src/routes/rooms.ts`
- `backend/src/routes/notifications.ts`
- `backend/src/routes/assessments.ts`
- `backend/src/routes/auth.ts`

### Step 2: Update TypeScript Interfaces

**Files that need fixing:**
- `backend/src/types/database.ts`

### Step 3: Create Consistent Naming Convention

**Decision: Use snake_case everywhere**
- Database columns: `student_id`, `booked_at`, `branch_id`
- Supabase queries: `'student_id'`, `'booked_at'`, `'branch_id'`
- TypeScript interfaces: `student_id`, `booked_at`, `branch_id`

## 📋 Specific Changes Needed

### 1. Dashboard Routes
```typescript
// WRONG (current)
.eq('studentId', user.userId)
.order('bookedAt', { ascending: false })

// CORRECT (should be)
.eq('student_id', user.userId)
.order('booked_at', { ascending: false })
```

### 2. User Routes
```typescript
// WRONG (current)
.eq('branchId', branchId as string)

// CORRECT (should be)
.eq('branch_id', branchId as string)
```

### 3. Booking Routes
```typescript
// WRONG (current)
.eq('studentId', user.userId)
.eq('slotId', slotId)

// CORRECT (should be)
.eq('student_id', user.userId)
.eq('slot_id', slotId)
```

### 4. TypeScript Interfaces
```typescript
// WRONG (current)
export interface User {
  phoneNumber?: string;
  branchId?: string;
}

// CORRECT (should be)
export interface User {
  phone_number?: string;
  branch_id?: string;
}
```

## 🎯 Why This Happened

1. **Mixed Database Systems**: The project uses both Supabase (snake_case) and Prisma (camelCase)
2. **Copy-Paste Errors**: Developers copied camelCase patterns from Prisma to Supabase queries
3. **No Schema Validation**: No automated checks to ensure query column names match actual database schema
4. **Inconsistent Documentation**: The actual schema wasn't clearly documented

## ✅ Prevention Strategy

1. **Always check actual database schema** before writing queries
2. **Use consistent naming convention** across the entire project
3. **Add schema validation** to catch mismatches early
4. **Document the actual schema** clearly
5. **Use TypeScript strict mode** to catch type mismatches

## 🚀 Next Steps

1. Fix all Supabase queries to use snake_case
2. Update TypeScript interfaces to match database schema
3. Test all endpoints to ensure they work correctly
4. Add schema validation to prevent future issues
5. Update documentation to reflect the correct schema
