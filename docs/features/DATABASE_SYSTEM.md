# Database System Documentation

## Overview
The database is designed to support a multi-branch speaking test booking system with role-based access control, real-time booking management, assessment recording, and comprehensive reporting.

## Database Architecture

### Core Tables Implemented (8 Tables)

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **Branch** | Multi-branch support | Branch info, contact details, active status |
| **User** | Authentication & roles | Phone/email login, 4 role types, branch assignment |
| **Slot** | Time slot management | Date/time, capacity, teacher assignment |
| **Booking** | Booking management | Status tracking, attendance, cancellation |
| **Assessment** | IELTS scoring | 0-9 scores, teacher remarks, rubrics |
| **Notification** | In-app messaging | Read/unread status, notification types |
| **AuditLog** | System accountability | All changes tracked with user/timestamp |
| **SystemSetting** | Runtime config | Business rules, configurable parameters |

## Table Schemas

### 1. Branch (Master Data)
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

### 2. User (Authentication & Authorization)
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

### 3. Slot (Time Slot Management)
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

### 4. Booking (Booking Management)
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

### 5. Assessment (IELTS Scoring)
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

### 6. Notification (Communication)
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

### 7. AuditLog (System Accountability)
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

### 8. SystemSettings (Configuration)
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

## Relationship Matrix

### One-to-One Relationships
- **Booking ↔ Assessment**: Each booking can have exactly one assessment

### One-to-Many Relationships
- **Branch → User**: One branch has many users
- **Branch → Slot**: One branch has many slots
- **User → Slot**: One teacher has many slots (TeacherSlots)
- **User → Booking**: One student has many bookings (StudentBookings)
- **User → Assessment**: One student has many assessments (StudentAssessments)
- **User → Assessment**: One teacher creates many assessments (TeacherAssessments)
- **User → Notification**: One user has many notifications
- **User → AuditLog**: One user creates many audit logs
- **Slot → Booking**: One slot has many bookings (up to capacity)

### Many-to-Many Relationships
None in the current MVP design (kept simple for faster development)

## Performance Optimizations

### Database Indexes
```sql
-- User performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch_role ON users(branchId, role);
CREATE INDEX idx_users_phone ON users(phoneNumber) WHERE phoneNumber IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Slot queries
CREATE INDEX idx_slots_branch_date ON slots(branchId, date);
CREATE INDEX idx_slots_teacher_date ON slots(teacherId, date);
CREATE INDEX idx_slots_date ON slots(date);

-- Booking operations
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

## Security Features

### Data Protection
- **Password hashing**: Bcrypt for all staff passwords
- **Phone number uniqueness**: Prevents duplicate student accounts
- **Role-based access**: Proper foreign key constraints
- **Audit trail**: Complete accountability for all changes

### Business Rule Enforcement
- **Booking limits**: One booking per student per month (configurable)
- **Cancellation window**: 24-hour minimum (configurable)
- **Capacity control**: Prevents slot overbooking
- **Assessment integrity**: One assessment per booking

## Scalability Considerations

### Current Capacity
- **Branches**: Unlimited
- **Users per branch**: 10,000+ (with indexes)
- **Slots per day**: 1,000+ per branch
- **Bookings per month**: 50,000+ (with proper indexing)
- **Audit logs**: 1M+ entries (with archival strategy)

### Growth Path
- **Read replicas**: For reporting queries
- **Partitioning**: Audit logs by date
- **Caching**: Redis for frequently accessed data
- **Archive strategy**: Old audit logs to separate storage

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

## Status: ✅ Fully Implemented and Operational

The database system is fully implemented with:
- **Complete Schema**: All 8 tables with proper relationships
- **Performance Optimized**: Comprehensive indexing strategy
- **Business Rules**: All constraints and validations implemented
- **Audit Trail**: Complete change tracking system
- **Security**: Role-based access and data protection
- **Scalability**: Designed for growth and performance

The database supports all MVP requirements while maintaining scalability for future enhancements.