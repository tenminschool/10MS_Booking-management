# User Flow and Requirements - Speaking Test Booking System

## Client Requirements Analysis

Based on the client's requirements, the system addresses these key issues:

### User-Side Issues:
- **Students lack clarity on monthly speaking test availability**
- **Students must physically visit the front desk to book a slot, often facing long queues**
- **No system exists for canceling or rescheduling slots**

### Teacher-Side Issues:
- **Teachers have no portal to access booking data or student profiles**
- **Assessments are typically done on paper, leading to poor documentation and loss of historical data**
- **Teachers lack visibility into how many students are scheduled for each session**

### Branch-Side Issues:
- **Overbooking is common, and absentee students face no accountability**
- **Tracking final attendance is difficult, creating discrepancies in teacher payment disbursements**
- **The front desk is heavily occupied with slot management, causing inefficiencies in overall branch operations**

## Corrected User Flow Design

### ✅ **UNIFIED DASHBOARD APPROACH**

**All users (Students, Teachers, Branch Admins, Super Admins) go to the SAME `/dashboard` page**, but the dashboard renders different content and functionalities based on their role.

### User Journey Flow:

```
Login → Dashboard (Role-Based Content) → Specific Actions
```

**NOT:**
```
Login → Role-Specific Pages → Different URLs
```

## Role-Based Dashboard Functionalities

### 1. **STUDENT Dashboard** (`/dashboard` for students)
**Addresses:** Students lack clarity on availability, physical visits, no cancellation system

**Dashboard Content:**
- **My Bookings Overview**: Current and upcoming bookings
- **Quick Book Section**: Browse and book available slots
- **Monthly Availability**: Clear view of available slots
- **Booking Management**: Cancel/reschedule with 24-hour notice
- **Score History**: Personal IELTS scores and progress
- **Notifications**: Booking confirmations, reminders, cancellations

**Key Actions:**
- Book new slots across branches
- Cancel/reschedule existing bookings
- View assessment scores and feedback
- Track progress over time

### 2. **TEACHER Dashboard** (`/dashboard` for teachers)
**Addresses:** No portal for booking data, paper-based assessments, no session visibility

**Dashboard Content:**
- **Today's Sessions**: Upcoming speaking tests for today
- **Tomorrow's Preview**: Next day's schedule
- **Student List**: Students in upcoming sessions
- **Assessment Tools**: Digital IELTS scoring and feedback
- **Session Management**: Mark attendance, record scores
- **Performance Metrics**: Teaching statistics and student progress

**Key Actions:**
- View assigned sessions and students
- Record digital assessments with IELTS rubrics
- Mark attendance for sessions
- Access student profiles and history

### 3. **BRANCH ADMIN Dashboard** (`/dashboard` for branch admins)
**Addresses:** Overbooking issues, attendance tracking, front desk efficiency

**Dashboard Content:**
- **Branch Overview**: Today's sessions and statistics
- **Booking Management**: Manage all branch bookings
- **Teacher Performance**: Track teacher utilization and attendance
- **Student Management**: Handle student accounts and bookings
- **Slot Management**: Create and manage available slots
- **Reports**: Branch-specific analytics and attendance tracking

**Key Actions:**
- Create and manage slots for teachers
- Handle booking cancellations and rescheduling
- Track attendance and teacher payments
- Manage branch users (teachers and students)
- Generate branch reports

### 4. **SUPER ADMIN Dashboard** (`/dashboard` for super admins)
**Addresses:** System-wide oversight and multi-branch management

**Dashboard Content:**
- **System Overview**: Cross-branch metrics and performance
- **Branch Performance**: Compare all branches
- **System Health**: Database status, services, alerts
- **User Management**: Manage all users across branches
- **Global Settings**: System configuration and business rules
- **Comprehensive Reports**: System-wide analytics

**Key Actions:**
- Manage all branches and users
- Configure system settings and business rules
- Monitor system health and performance
- Generate comprehensive reports
- Handle system-wide issues

## Navigation Structure

### Unified Navigation Menu:
- **Dashboard** (Role-based content)
- **Schedule** (All roles can access, but see different data)
- **Bookings** (All roles can access, but see different data)
- **Assessments** (All roles can access, but see different data)
- **Profile** (All roles can access their own profile)
- **Admin Routes** (Only visible to admins):
  - `/admin/slots` (Branch Admin + Super Admin)
  - `/admin/branches` (Super Admin only)
  - `/admin/settings` (Super Admin only)

## Implementation Benefits

### 1. **Simplified User Experience**
- Single entry point for all users
- Consistent navigation and layout
- Role-based content rendering

### 2. **Addresses Client Requirements**
- **Students**: Clear availability, online booking, cancellation system
- **Teachers**: Digital portal, assessment tools, session visibility
- **Branch Admins**: Efficient management, attendance tracking, payment accuracy
- **Super Admins**: System oversight, multi-branch management

### 3. **Technical Benefits**
- Single dashboard component with role-based rendering
- Consistent API endpoints with role-based filtering
- Simplified routing and navigation
- Easier maintenance and updates

## Data Access Control

### Role-Based Data Filtering:
- **Students**: Only their own bookings and assessments
- **Teachers**: Their assigned slots and students
- **Branch Admins**: Data within their branch only
- **Super Admins**: All data across all branches

### API Endpoints:
All endpoints use role-based filtering:
- `/api/bookings` - Returns data based on user role
- `/api/slots` - Returns data based on user role
- `/api/assessments` - Returns data based on user role
- `/api/dashboard/metrics` - Returns role-specific metrics

## Security and Permissions

### Authentication:
- JWT-based authentication for all users
- Role information embedded in JWT token
- Automatic token refresh

### Authorization:
- Role-based access control at API level
- Frontend route protection based on roles
- Data filtering based on user permissions

## Future Enhancements

### Phase 2 Features:
- **Mobile App**: Native mobile application
- **Advanced Analytics**: Machine learning insights
- **Integration APIs**: Third-party system connections
- **Real-time Notifications**: Push notifications
- **Advanced Reporting**: Custom report builder

## Testing Strategy

### Role-Based Testing:
1. **Login Flow**: Test all four user types login and redirect to dashboard
2. **Dashboard Content**: Verify role-specific content rendering
3. **Data Access**: Confirm role-based data filtering
4. **Navigation**: Test all navigation paths for each role
5. **Permissions**: Verify admin-only routes are protected

### User Journey Testing:
1. **Student Journey**: Login → Dashboard → Book Slot → View Scores
2. **Teacher Journey**: Login → Dashboard → View Sessions → Record Assessment
3. **Branch Admin Journey**: Login → Dashboard → Manage Slots → Track Attendance
4. **Super Admin Journey**: Login → Dashboard → System Overview → Manage Branches

This unified dashboard approach provides a clean, intuitive user experience while addressing all the client's requirements through role-based functionality rather than separate pages.
