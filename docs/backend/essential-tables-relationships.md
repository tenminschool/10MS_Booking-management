# Essential Tables Relationships (9 Tables)

## 📊 Table Relationship Overview

After removing the optional tables, here are the relationships between the remaining 9 essential tables:

## 🔗 Core Relationships

### 1. **USERS** (Central Entity)
```
users (id) 
├── → branches (branch_id) [Many-to-One]
├── → bookings (student_id) [One-to-Many] 
├── → bookings (teacher_id via slots) [One-to-Many]
├── → assessments (student_id) [One-to-Many]
├── → assessments (teacher_id) [One-to-Many]
├── → notifications (user_id) [One-to-Many]
└── → waiting_list (student_id) [One-to-Many]
```

### 2. **BRANCHES** (Location Entity)
```
branches (id)
├── → users (branch_id) [One-to-Many]
├── → slots (branch_id) [One-to-Many]
└── → rooms (branch_id) [One-to-Many]
```

### 3. **SLOTS** (Time Management)
```
slots (id)
├── → branches (branchId) [Many-to-One]
├── → users (teacherId) [Many-to-One]
├── → service_types (service_type_id) [Many-to-One]
├── → rooms (room_id) [Many-to-One]
├── → bookings (slotId) [One-to-Many]
└── → waiting_list (slotId) [One-to-Many]
```

### 4. **BOOKINGS** (Core Business Logic)
```
bookings (id)
├── → users (studentId) [Many-to-One]
├── → slots (slotId) [Many-to-One]
└── → assessments (bookingId) [One-to-One]
```

### 5. **ASSESSMENTS** (Results)
```
assessments (id)
├── → bookings (bookingId) [Many-to-One]
├── → users (studentId) [Many-to-One]
└── → users (teacherId) [Many-to-One]
```

## 📋 Detailed Relationship Matrix

| Table | Primary Key | Foreign Keys | References |
|-------|-------------|--------------|------------|
| **users** | id | branchId | branches(id) |
| **branches** | id | - | - |
| **slots** | id | branchId, teacherId, service_type_id, room_id | branches(id), users(id), service_types(id), rooms(id) |
| **bookings** | id | studentId, slotId, service_type_id | users(id), slots(id), service_types(id) |
| **assessments** | id | bookingId, studentId, teacherId | bookings(id), users(id), users(id) |
| **service_types** | id | - | - |
| **rooms** | id | branch_id | branches(id) |
| **notifications** | id | userId | users(id) |
| **waiting_list** | id | studentId, slotId | users(id), slots(id) |
| **user_sessions** | id | userId | users(id) |

## 🔄 Relationship Types

### One-to-Many Relationships:
- **branches** → users (one branch has many users)
- **branches** → slots (one branch has many slots)
- **branches** → rooms (one branch has many rooms)
- **users** → bookings (one user can have many bookings)
- **users** → assessments (one user can have many assessments)
- **users** → notifications (one user can have many notifications)
- **users** → user_sessions (one user can have many sessions)
- **users** → waiting_list (one user can be on many waiting lists)
- **slots** → bookings (one slot can have many bookings)
- **slots** → waiting_list (one slot can have many waiting list entries)
- **service_types** → slots (one service type can be used in many slots)
- **service_types** → bookings (one service type can be used in many bookings)
- **rooms** → slots (one room can be used for many slots)

### Many-to-One Relationships:
- **users** → branches (many users belong to one branch)
- **slots** → branches (many slots belong to one branch)
- **slots** → users/teachers (many slots belong to one teacher)
- **slots** → service_types (many slots use one service type)
- **slots** → rooms (many slots use one room)
- **bookings** → users/students (many bookings belong to one student)
- **bookings** → slots (many bookings use one slot)
- **bookings** → service_types (many bookings use one service type)
- **assessments** → bookings (many assessments belong to one booking)
- **assessments** → users/students (many assessments belong to one student)
- **assessments** → users/teachers (many assessments are created by one teacher)
- **notifications** → users (many notifications belong to one user)
- **waiting_list** → users (many waiting list entries belong to one user)
- **waiting_list** → slots (many waiting list entries are for one slot)
- **user_sessions** → users (many sessions belong to one user)

### One-to-One Relationships:
- **bookings** → assessments (one booking can have one assessment)

## 🎯 Key Business Flows

### 1. **Booking Flow**:
```
User → Branch → Slot → Service Type → Room → Booking → Assessment
```

### 2. **User Management Flow**:
```
Branch → Users (Teachers/Students) → Sessions → Notifications
```

### 3. **Resource Management Flow**:
```
Branch → Rooms → Slots → Service Types → Bookings
```

### 4. **Waiting List Flow**:
```
User → Slot → Waiting List → Notification (when available)
```

## 🔍 Query Patterns

### Common Joins:
```sql
-- Get booking details with all related info
SELECT b.*, u.name as student_name, s.date, st.name as service_type, r.room_name
FROM bookings b
JOIN users u ON b.studentId = u.id
JOIN slots s ON b.slotId = s.id  
JOIN service_types st ON b.service_type_id = st.id
JOIN rooms r ON s.room_id = r.id;

-- Get user's complete profile with branch info
SELECT u.*, b.name as branch_name, b.address
FROM users u
LEFT JOIN branches b ON u.branchId = b.id;

-- Get slot availability with room and service details
SELECT s.*, r.room_name, st.name as service_name, st.duration_minutes
FROM slots s
JOIN rooms r ON s.room_id = r.id
JOIN service_types st ON s.service_type_id = st.id;
```

## ✅ Benefits of This Simplified Schema

1. **Clear Relationships**: Each table has a clear purpose and well-defined relationships
2. **No Circular Dependencies**: Clean parent-child relationships
3. **Efficient Queries**: Optimized for common business operations
4. **Easy to Understand**: Straightforward data model
5. **Scalable**: Can handle growth without complexity
6. **Maintainable**: Fewer tables to manage and update
