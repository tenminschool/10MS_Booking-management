# User Capabilities Matrix

This document outlines the specific capabilities and functionalities available to each user role in the 10MS Booking Management System.

## Role Overview

| Role | Description | Access Level |
|------|-------------|--------------|
| **STUDENT** | End users who book speaking tests | Limited to personal data and booking |
| **TEACHER** | Staff who conduct assessments | Branch-specific teaching data |
| **BRANCH_ADMIN** | Branch managers with admin privileges | Branch-wide management |
| **SUPER_ADMIN** | System administrators | Global system access |

## Dashboard Capabilities

### STUDENT Dashboard
- **View**: Personal booking statistics
- **Actions**: 
  - Book new speaking tests
  - View upcoming bookings
  - Cancel/reschedule bookings
  - View assessment results
- **Data**: Only own bookings and assessments

### TEACHER Dashboard
- **View**: Teaching schedule and student assignments
- **Actions**:
  - View assigned sessions
  - Access assessment tools
  - Record student scores
  - View teaching statistics
- **Data**: Only own branch slots and assigned students

### BRANCH_ADMIN Dashboard
- **View**: Branch performance metrics
- **Actions**:
  - Manage branch slots
  - View branch bookings
  - Monitor teacher performance
  - Generate branch reports
- **Data**: Branch-specific data only

### SUPER_ADMIN Dashboard
- **View**: System-wide metrics and analytics
- **Actions**:
  - Manage all branches
  - System configuration
  - User management
  - Global reporting
- **Data**: Access to all system data

## Schedule Page Capabilities

### STUDENT Schedule View
- **Functionality**: Browse and book available slots
- **Filters**: 
  - Branch selection (all branches)
  - Service type selection
  - Date range
- **Actions**:
  - Book available slots
  - View slot details
  - Cannot edit or manage slots

### TEACHER Schedule View
- **Functionality**: View assigned teaching slots
- **Filters**: 
  - Service type selection only
  - Branch filter hidden (shows own branch only)
- **Actions**:
  - View slot details
  - See student bookings
  - Cannot book or edit slots
- **Data**: Only own branch slots assigned to them

### BRANCH_ADMIN Schedule View
- **Functionality**: Manage branch slots and view global availability
- **Filters**: 
  - Branch selection (own branch + all branches)
  - Service type selection
  - Date range
- **Actions**:
  - Create new slots
  - Edit own branch slots
  - Delete own branch slots
  - View all global slots (read-only for other branches)

### SUPER_ADMIN Schedule View
- **Functionality**: Full slot management across all branches
- **Filters**: 
  - All branches
  - Service type selection
  - Date range
- **Actions**:
  - Create slots for any branch
  - Edit any slot
  - Delete any slot
  - Full system management

## Assessment Page Capabilities

### STUDENT Assessment View
- **Functionality**: View personal assessment results
- **Data**:
  - Own assessment history
  - Score progression
  - Teacher feedback
  - Performance statistics
- **Actions**:
  - View detailed results
  - Track progress over time
  - Cannot create or edit assessments

### TEACHER Assessment View
- **Functionality**: Conduct and manage student assessments
- **Data**:
  - Assigned students list
  - Pending assessments
  - Completed assessments
  - Assessment guidelines
- **Actions**:
  - Start new assessments
  - Record student scores (0-9 scale)
  - Add detailed feedback
  - End assessments with timer
  - View assessment history
- **Assessment Process**:
  1. **Pre-assessment**: View assigned students and guidelines
  2. **Confirmation**: Confirm start with summary guidelines
  3. **Scoring**: Provide scores with timer functionality
  4. **Summary**: View results after completion

### BRANCH_ADMIN Assessment View
- **Functionality**: Monitor branch assessment performance
- **Data**:
  - All assessments in branch
  - Teacher performance metrics
  - Student performance statistics
  - Branch-wide trends
- **Actions**:
  - View all branch assessments
  - Generate performance reports
  - Monitor teacher productivity
  - Cannot directly conduct assessments

### SUPER_ADMIN Assessment View
- **Functionality**: System-wide assessment monitoring
- **Data**:
  - All assessments across all branches
  - Global performance metrics
  - System-wide statistics
  - Cross-branch comparisons
- **Actions**:
  - View all assessments
  - Generate system reports
  - Monitor overall performance
  - Cannot directly conduct assessments

## Booking Page Capabilities

### STUDENT Booking View
- **Functionality**: Manage personal bookings
- **Data**:
  - Own bookings only
  - Booking history
  - Cancellation records
- **Actions**:
  - Cancel bookings
  - Reschedule bookings
  - View booking details
  - Cannot manage other users' bookings

### TEACHER Booking View
- **Functionality**: View student bookings for assigned slots
- **Data**:
  - Student bookings for own slots
  - Attendance records
  - Booking status updates
- **Actions**:
  - View student details
  - Mark attendance
  - Update booking status
  - Cannot book or cancel for students

### BRANCH_ADMIN Booking View
- **Functionality**: Manage all branch bookings
- **Data**:
  - All bookings in branch
  - Booking statistics
  - Teacher booking assignments
- **Actions**:
  - View all branch bookings
  - Manage booking status
  - Assign teachers to slots
  - Generate booking reports

### SUPER_ADMIN Booking View
- **Functionality**: System-wide booking management
- **Data**:
  - All bookings across all branches
  - Global booking statistics
  - System-wide trends
- **Actions**:
  - View all bookings
  - Manage any booking
  - Generate system reports
  - Full booking administration

# 🎭 **Role-Based Capabilities Matrix**

## **10MS Booking Management System - User Access Overview**

| **Page/Feature** | **Student** | **Teacher** | **Branch Admin** | **Super Admin** |
|------------------|-------------|-------------|------------------|-----------------|
| **🔐 Authentication** | | | | |
| Login | ✅ Can login | ✅ Can login | ✅ Can login | ✅ Can login |
| Profile Management | ✅ Own profile only | ✅ Own profile only | ✅ Own profile only | ✅ Own profile only |
| **📊 Dashboard** | | | | |
| Student Dashboard | ✅ Personal stats, book new tests | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable |
| Teacher Dashboard | ❌ Not applicable | ✅ Teaching schedule, assessment tools | ❌ Not applicable | ❌ Not applicable |
| Admin Dashboard | ❌ Not applicable | ❌ Not applicable | ✅ Branch metrics, management tools | ✅ System-wide metrics, full management |
| **📅 Schedule Page** | | | | |
| View Available Slots | ✅ All branches | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable |
| View Own Branch Slots | ❌ Not applicable | ✅ Own branch only | ❌ Not applicable | ❌ Not applicable |
| View All Slots (Global) | ❌ Not applicable | ❌ Not applicable | ✅ View only | ✅ View only |
| Book Slots | ✅ Can book any available | ❌ Cannot book | ❌ Cannot book | ❌ Cannot book |
| Create New Slots | ❌ Cannot create | ❌ Cannot create | ✅ Own branch only | ✅ Any branch |
| Edit Slots | ❌ Cannot edit | ❌ Cannot edit | ✅ Own branch only | ✅ Any branch |
| Delete Slots | ❌ Cannot delete | ❌ Cannot delete | ✅ Own branch only | ✅ Any branch |
| **📋 Bookings Page** | | | | |
| View Own Bookings | ✅ Own bookings only | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable |
| View Assigned Sessions | ❌ Not applicable | ✅ Own slots only | ❌ Not applicable | ❌ Not applicable |
| View Branch Bookings | ❌ Not applicable | ❌ Not applicable | ✅ Own branch only | ❌ Not applicable |
| View All Bookings | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable | ✅ All branches |
| Cancel Bookings | ✅ Own bookings only | ❌ Cannot cancel | ✅ Own branch only | ✅ Any booking |
| Reschedule Bookings | ✅ Own bookings only | ❌ Cannot reschedule | ✅ Own branch only | ✅ Any booking |
| Mark Attendance | ❌ Cannot mark | ✅ Own sessions only | ✅ Own branch only | ✅ Any session |
| **🎓 Assessments Page** | | | | |
| View Own Results | ✅ Own assessments only | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable |
| View Assigned Students | ❌ Not applicable | ✅ Own students only | ❌ Not applicable | ❌ Not applicable |
| View Branch Assessments | ❌ Not applicable | ❌ Not applicable | ✅ Own branch only | ❌ Not applicable |
| View All Assessments | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable | ✅ All branches |
| **Teacher Assessment Workflow** | | | | |
| Pre-Assessment Guidelines | ❌ Not applicable | ✅ View assessment criteria | ❌ Not applicable | ❌ Not applicable |
| Start Assessment Confirmation | ❌ Not applicable | ✅ Confirmation popup | ❌ Not applicable | ❌ Not applicable |
| During Assessment Scoring | ❌ Not applicable | ✅ Score 4 criteria + overall | ❌ Not applicable | ❌ Not applicable |
| Assessment Timer | ❌ Not applicable | ✅ Real-time timer | ❌ Not applicable | ❌ Not applicable |
| Score Validation | ❌ Not applicable | ✅ Prevent incomplete submission | ❌ Not applicable | ❌ Not applicable |
| Finish Assessment Confirmation | ❌ Not applicable | ✅ Confirmation popup | ❌ Not applicable | ❌ Not applicable |
| Post-Assessment Summary | ❌ Not applicable | ✅ Results summary view | ❌ Not applicable | ❌ Not applicable |
| Record Scores | ❌ Cannot record | ✅ Own students only | ❌ Cannot record | ❌ Cannot record |
| Start Assessments | ❌ Cannot start | ✅ Own students only | ❌ Cannot start | ❌ Cannot start |
| End Assessments | ❌ Cannot end | ✅ Own assessments only | ❌ Cannot end | ❌ Cannot end |
| **⚙️ Admin Pages** | | | | |
| Admin Slots Management | ❌ No access | ❌ No access | ✅ Own branch only | ✅ All branches |
| Admin Branches Management | ❌ No access | ❌ No access | ❌ No access | ✅ All branches |
| Admin Users Management | ❌ No access | ❌ No access | ✅ Own branch only | ✅ All users |
| Admin Bookings Management | ❌ No access | ❌ No access | ✅ Own branch only | ✅ All bookings |
| Admin Assessments Management | ❌ No access | ❌ No access | ✅ Own branch only | ✅ All assessments |
| Admin Notifications | ❌ No access | ❌ No access | ❌ No access | ✅ System-wide |
| Admin Settings | ❌ No access | ❌ No access | ❌ No access | ✅ System settings |
| **📊 Reports & Analytics** | | | | |
| Personal Progress Reports | ✅ Own data only | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable |
| Teaching Performance Reports | ❌ Not applicable | ✅ Own data only | ❌ Not applicable | ❌ Not applicable |
| Branch Performance Reports | ❌ Not applicable | ❌ Not applicable | ✅ Own branch only | ❌ Not applicable |
| System-wide Reports | ❌ Not applicable | ❌ Not applicable | ❌ Not applicable | ✅ All data |
| **🔔 Notifications** | | | | |
| Receive Notifications | ✅ Own notifications | ✅ Own notifications | ✅ Branch notifications | ✅ All notifications |
| Send Notifications | ❌ Cannot send | ❌ Cannot send | ✅ Branch users only | ✅ Any user |
| Manage Notification Settings | ✅ Own settings | ✅ Own settings | ✅ Own settings | ✅ Own settings |

## **🎯 Key Role Characteristics**

### **👨‍🎓 Student**
- **Primary Function**: Book speaking tests and view results
- **Data Access**: Only personal data (bookings, assessments, profile)
- **Actions**: Book, cancel, reschedule own bookings; view own results
- **Restrictions**: Cannot access admin functions or other users' data

### **👨‍🏫 Teacher**
- **Primary Function**: Conduct assessments and manage assigned students
- **Data Access**: Own branch slots, assigned students, teaching schedule
- **Actions**: Mark attendance, record scores, start/end assessments
- **Restrictions**: Cannot book slots, cannot access other branches or admin functions

### **🏢 Branch Admin**
- **Primary Function**: Manage branch operations and monitor performance
- **Data Access**: Own branch data only, global view (read-only)
- **Actions**: Create/edit slots, manage bookings, view reports for own branch
- **Restrictions**: Cannot access other branches' data or system settings

### **👑 Super Admin**
- **Primary Function**: System-wide management and oversight
- **Data Access**: All data across all branches and users
- **Actions**: Full CRUD operations on all resources, system configuration
- **Restrictions**: None (full system access)

## **🎓 Teacher Assessment Workflow Details**

### **Three-Step Assessment Process for Teachers**

The teacher assessment interface follows a structured three-step process:

#### **Step 1: Pre-Assessment (Guidelines)**
- Teachers see assessment guidelines and criteria
- Four assessment criteria displayed:
  - **Fluency & Coherence (25%)**: Speech smoothness, logical flow, idea development
  - **Lexical Resource (25%)**: Vocabulary range, accuracy, word choice appropriateness  
  - **Grammar & Accuracy (25%)**: Grammatical accuracy, sentence structure range
  - **Pronunciation (25%)**: Clarity, stress, rhythm, intonation patterns
- Confirmation popup before starting assessment
- Student information displayed (name, date, time slot)

#### **Step 2: During Assessment (Scoring)**
- Real-time assessment timer displayed
- Four scoring dropdowns (1-9 scale) for each criterion:
  - Fluency & Coherence
  - Lexical Resource  
  - Grammar & Accuracy
  - Pronunciation
- Overall Band Score dropdown (1-9, including half scores like 5.5, 6.5, etc.)
- **Score Validation**: "Finish Assessment" button disabled until all scores are filled
- Student session details displayed
- Option to cancel assessment at any time

#### **Step 3: Post-Assessment (Summary)**
- Assessment completion confirmation
- Comprehensive results summary showing:
  - Individual scores for all four criteria
  - Overall Band Score prominently displayed
  - Assessment duration
  - Student information
- Options to close or start a new assessment

#### **Key Features**
- **Confirmation Dialogs**: Both start and finish actions require confirmation
- **Score Validation**: Cannot submit incomplete assessments
- **Timer**: Real-time tracking of assessment duration
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme Support**: Full dark/light theme compatibility

## **🔍 Admin Access Patterns Clarification**

### **Branch Admin & Super Admin Access Through Admin Pages**

**Important Note**: While Branch Admins and Super Admins may show "Not applicable" for regular user-facing pages (like `/schedule`, `/bookings`, `/assessments`), they can actually **view and manage all data** through their dedicated admin pages:

- **Branch Admins** access data through:
  - `/admin/slots` - View and manage branch slots
  - `/admin/bookings` - View and manage branch bookings  
  - `/admin/assessments` - View and manage branch assessments
  - `/admin/users` - View and manage branch users

- **Super Admins** access data through:
  - `/admin/slots` - View and manage ALL slots across all branches
  - `/admin/bookings` - View and manage ALL bookings across all branches
  - `/admin/assessments` - View and manage ALL assessments across all branches
  - `/admin/users` - View and manage ALL users across all branches
  - `/admin/branches` - Manage branch information

**"Not applicable"** means the user doesn't use the regular user interface for that function, but has full administrative access through the admin interface.

## **🔒 Security Features**

- **Branch Isolation**: Teachers and Branch Admins can only access their assigned branch
- **Role-Based UI**: Interface adapts based on user role
- **API Authorization**: Backend validates permissions for all operations
- **Data Filtering**: Database queries automatically filter by user role and branch
- **Audit Logging**: All actions are logged for security monitoring

## Data Access Matrix

| Data Type | STUDENT | TEACHER | BRANCH_ADMIN | SUPER_ADMIN |
|-----------|---------|---------|--------------|-------------|
| Own Profile | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Own Bookings | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Own Assessments | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Branch Users | ❌ | ✅ Own Branch | ✅ Own Branch | ✅ All Branches |
| Branch Slots | ✅ View Only | ✅ Own Branch | ✅ Own Branch | ✅ All Branches |
| Branch Bookings | ❌ | ✅ Own Slots | ✅ Own Branch | ✅ All Branches |
| Branch Assessments | ❌ | ✅ Own Students | ✅ Own Branch | ✅ All Branches |
| Other Branches | ❌ | ❌ | ✅ View Only | ✅ Full |
| System Settings | ❌ | ❌ | ❌ | ✅ Full |
| User Management | ❌ | ❌ | ✅ Own Branch | ✅ All Users |
| Reports | ❌ | ✅ Own Data | ✅ Own Branch | ✅ All Data |

## Security Considerations

### Branch Isolation
- Teachers can only access data from their assigned branch
- Branch admins can only manage their own branch
- Cross-branch data access is restricted except for super admins

### Data Privacy
- Students can only see their own data
- Teachers cannot access other teachers' students
- Assessment data is protected by branch boundaries

### Role Escalation
- No role can escalate privileges beyond their assigned level
- All actions are logged for audit purposes
- Branch admins cannot access super admin functions

## Implementation Notes

### Frontend Role Checks
- All pages implement role-based rendering
- UI elements are conditionally displayed based on user role
- Navigation menus adapt to user permissions

### Backend Authorization
- API endpoints validate user permissions
- Database queries are filtered by user role and branch
- All mutations require appropriate authorization

### Database Access Patterns
- Teachers: Filter by `teacherId` and `branchId`
- Branch Admins: Filter by `branchId`
- Super Admins: No filtering (full access)
- Students: Filter by `studentId`

## Future Enhancements

### Planned Features
- Advanced reporting for all roles
- Bulk operations for admins
- Mobile-optimized interfaces
- Real-time notifications
- Assessment analytics dashboard

### Role Expansion
- Support for additional user types
- Custom role permissions
- Temporary role assignments
- Role-based feature flags