# Database Design for Speaking Test Booking MVP

## Overview
The database is designed to support a multi-branch speaking test booking system with role-based access control, real-time booking management, assessment recording, and comprehensive reporting.

## Core Tables & Relationships

### 1. **Branch** (Master Data)
```sql
branches {
  id: String (PK, CUID)
  name: String
  address: String
  contactNumber: String
  isActive: Boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```
**Purpose**: Store branch information for multi-branch support
**Relationships**: 
- One-to-Many with User (branch can have many users)
- One-to-Many with Slot (branch can have many slots)

### 2. **User** (Authentication & Authorization)
```sql
users {
  id: String (PK, CUID)
  phoneNumber: String? (UNIQUE, for students)
  email: String? (UNIQUE, for staff)
  name: String
  role: UserRole (SUPER_ADMIN, BRANCH_ADMIN, TEACHER, STUDENT)
  branchId: String? (FK to Branch)
  hashedPassword: String? (for staff)
  isActive: Boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```
**Purpose**: Store all user types with role-based access
**Relationships**:
- Many-to-One with Branch (user belongs to one branch, optional for super-admin)
- One-to-Many with Slot (teacher can have many slots)
- One-to-Many with Booking (student can have many bookings)
- One-to-Many with Assessment (as student and as teacher)
- One-to-Many with Notification (user can have many notifications)

### 3. **Slot** (Time Slot Management)
```sql
slots {
  id: String (PK, CUID)
  branchId: String (FK to Branch)
  teacherId: String (FK to User)
  date: Date
  startTime: String (HH:MM format)
  endTime: String (HH:MM format)
  capacity: Int (default: 1)
  createdAt: DateTime
  updatedAt: DateTime
}
```
**Purpose**: Store available time slots for speaking tests
**Relationships**:
- Many-to-One with Branch (slot belongs to one branch)
- Many-to-One with User (slot assigned to one teacher)
- One-to-Many with Booking (slot can have multiple bookings up to capacity)

### 4. **Booking** (Booking Management)
```sql
bookings {
  id: String (PK, CUID)
  studentId: String (FK to User)
  slotId: String (FK to Slot)
  status: BookingStatus (CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
  attended: Boolean?
  cancellationReason: String?
  bookedAt: DateTime (default: now)
  cancelledAt: DateTime?
  updatedAt: DateTime
}
```
**Purpose**: Store booking information and status
**Relationships**:
- Many-to-One with User (booking belongs to one student)
- Many-to-One with Slot (booking belongs to one slot)
- One-to-One with Assessment (booking can have one assessment)

### 5. **Assessment** (IELTS Scoring)
```sql
assessments {
  id: String (PK, CUID)
  bookingId: String (FK to Booking, UNIQUE)
  studentId: String (FK to User)
  teacherId: String (FK to User)
  score: Float (IELTS score 0-9 with 0.5 increments)
  remarks: String?
  assessedAt: DateTime (default: now)
}
```
**Purpose**: Store IELTS assessment scores and teacher remarks
**Relationships**:
- One-to-One with Booking (assessment belongs to one booking)
- Many-to-One with User (as student - student can have many assessments)
- Many-to-One with User (as teacher - teacher can create many assessments)

### 6. **Notification** (Communication)
```sql
notifications {
  id: String (PK, CUID)
  userId: String (FK to User)
  title: String
  message: String
  type: NotificationType (BOOKING_CONFIRMED, BOOKING_REMINDER, BOOKING_CANCELLED, SYSTEM_ALERT)
  isRead: Boolean (default: false)
  createdAt: DateTime
}
```
**Purpose**: Store in-app notifications for users
**Relationships**:
- Many-to-One with User (notification belongs to one user)

## Additional Tables for MVP Enhancement

### 7. **AuditLog** (System Accountability)
```sql
audit_logs {
  id: String (PK, CUID)
  userId: String (FK to User)
  entityType: String (table name)
  entityId: String (record ID)
  action: String (CREATE, UPDATE, DELETE)
  oldValues: JSON?
  newValues: JSON?
  timestamp: DateTime (default: now)
  ipAddress: String?
  userAgent: String?
}
```
**Purpose**: Track all system changes for accountability
**Relationships**:
- Many-to-One with User (audit log belongs to one user)

### 8. **SystemSettings** (Configuration)
```sql
system_settings {
  id: String (PK, CUID)
  key: String (UNIQUE)
  value: String
  description: String?
  updatedBy: String (FK to User)
  updatedAt: DateTime
}
```
**Purpose**: Store system configuration settings
**Relationships**:
- Many-to-One with User (setting updated by one user)

## Relationship Summary

### One-to-One Relationships
1. **Booking ↔ Assessment**: Each booking can have exactly one assessment
2. **SystemSettings ↔ User**: Each setting update is tracked to one user

### One-to-Many Relationships
1. **Branch → User**: One branch has many users
2. **Branch → Slot**: One branch has many slots
3. **User → Slot**: One teacher has many slots (TeacherSlots)
4. **User → Booking**: One student has many bookings (StudentBookings)
5. **User → Assessment**: One student has many assessments (StudentAssessments)
6. **User → Assessment**: One teacher creates many assessments (TeacherAssessments)
7. **User → Notification**: One user has many notifications
8. **User → AuditLog**: One user creates many audit logs
9. **Slot → Booking**: One slot has many bookings (up to capacity)

### Many-to-Many Relationships
None in the current MVP design (kept simple for faster development)

## Indexes for Performance

### Primary Indexes (Automatic)
- All `id` fields (Primary Keys)
- `phoneNumber` (Unique)
- `email` (Unique)
- `bookingId` in Assessment (Unique)

### Additional Indexes Needed
```sql
-- User lookups
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch_role ON users(branchId, role);
CREATE INDEX idx_users_phone ON users(phoneNumber) WHERE phoneNumber IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Slot queries
CREATE INDEX idx_slots_branch_date ON slots(branchId, date);
CREATE INDEX idx_slots_teacher_date ON slots(teacherId, date);
CREATE INDEX idx_slots_date ON slots(date);

-- Booking queries
CREATE INDEX idx_bookings_student ON bookings(studentId);
CREATE INDEX idx_bookings_slot ON bookings(slotId);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(bookedAt);

-- Assessment queries
CREATE INDEX idx_assessments_student ON assessments(studentId);
CREATE INDEX idx_assessments_teacher ON assessments(teacherId);
CREATE INDEX idx_assessments_date ON assessments(assessedAt);

-- Notification queries
CREATE INDEX idx_notifications_user_read ON notifications(userId, isRead);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Audit log queries
CREATE INDEX idx_audit_logs_user ON audit_logs(userId);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entityType, entityId);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

## Data Constraints & Business Rules

### User Constraints
- Students must have phoneNumber, staff must have email
- Only one user per phoneNumber/email
- branchId required for BRANCH_ADMIN and TEACHER roles
- branchId optional for SUPER_ADMIN (can access all branches)

### Slot Constraints
- startTime must be before endTime
- capacity must be >= 1
- No overlapping slots for same teacher
- Slots can only be created for future dates

### Booking Constraints
- Student can only book one slot per month (business rule)
- Cannot book slots in the past
- Cannot exceed slot capacity
- Cancellation only allowed 24+ hours before slot time

### Assessment Constraints
- Score must be between 0.0 and 9.0 with 0.5 increments
- Can only assess completed bookings
- One assessment per booking

## Migration Strategy

### Phase 1: Core Tables (Current)
✅ Branch, User, Slot, Booking, Assessment, Notification

### Phase 2: Enhancement Tables
- AuditLog (for accountability)
- SystemSettings (for configuration)

### Phase 3: Performance Optimization
- Add indexes based on query patterns
- Optimize queries based on usage analytics

## Backup & Recovery Strategy

### Daily Backups
- Full database backup at 2 AM daily
- Transaction log backups every 15 minutes
- Retention: 30 days for daily, 7 days for transaction logs

### Disaster Recovery
- Primary database with read replica
- Automated failover capability
- Recovery Time Objective (RTO): 15 minutes
- Recovery Point Objective (RPO): 15 minutes

This database design supports all MVP requirements while maintaining scalability for future enhancements.