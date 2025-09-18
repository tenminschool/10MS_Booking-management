# Requirements Document

## Introduction

The Speaking Test Booking Management System is designed to digitize and streamline the currently manual pen-and-paper booking process for 10 Minute School offline English Learning Center branches. The system will address inefficiencies faced by students, teachers, and branch staff by providing an online platform for booking management and basic assessment recording. The primary focus is on booking management with simple assessment score recording capabilities.

## Requirements

### Requirement 1

**User Story:** As a paid student, I want to view and filter available speaking test slots online, so that I can see availability without visiting the branch.

#### Acceptance Criteria

1. WHEN a paid student accesses the booking system THEN the system SHALL display all available speaking test slots with filtering options for daily, weekly, and monthly views
2. WHEN displaying slots THEN the system SHALL show date, time, teacher name, and available capacity for each slot
3. WHEN a slot is fully booked THEN the system SHALL mark it as unavailable and prevent further bookings
4. IF a student is not a paid user THEN the system SHALL deny access to booking features
5. WHEN filtering slots THEN the system SHALL allow students to view by specific date ranges, teachers, or time preferences

### Requirement 2

**User Story:** As a paid student, I want to book a speaking test slot online using my phone number identification, so that I can avoid long queues at the front desk.

#### Acceptance Criteria

1. WHEN a paid student selects an available slot THEN the system SHALL verify their phone number against the paid user database before allowing booking
2. WHEN a booking is confirmed THEN the system SHALL send both an SMS confirmation and display a confirmation message on the platform
3. WHEN a student attempts to book multiple slots for the same month THEN the system SHALL prevent duplicate bookings and show an error message
4. WHEN a booking is made THEN the system SHALL update the slot capacity in real-time
5. WHEN generating confirmation THEN the system SHALL include booking details that can be shown to admin/teachers during the scheduled session

### Requirement 3

**User Story:** As a student, I want to cancel or reschedule my booking, so that I have flexibility when my schedule changes.

#### Acceptance Criteria

1. WHEN a student wants to cancel THEN the system SHALL allow cancellation up to 24 hours before the scheduled time
2. WHEN a cancellation is made THEN the system SHALL free up the slot for other students
3. WHEN a student wants to reschedule THEN the system SHALL allow them to select a new available slot
4. WHEN rescheduling THEN the system SHALL follow the same 24-hour advance notice rule

### Requirement 4

**User Story:** As a teacher, I want to access my scheduled bookings and student information, so that I can prepare for sessions and track attendance.

#### Acceptance Criteria

1. WHEN a teacher logs into the system THEN the system SHALL display their upcoming scheduled sessions
2. WHEN viewing a session THEN the system SHALL show student names, contact information, and booking details
3. WHEN a session is completed THEN the system SHALL allow the teacher to mark attendance
4. WHEN marking attendance THEN the system SHALL record whether each student was present or absent

### Requirement 5

**User Story:** As a teacher, I want to record IELTS assessment scores and remarks using proper rubrics, so that I can maintain accurate documentation of student performance.

#### Acceptance Criteria

1. WHEN a speaking test is completed THEN the system SHALL allow the teacher to enter an IELTS score between 0-9 with 0.5 increments
2. WHEN entering scores THEN the system SHALL display IELTS speaking rubrics on the teacher scoring dashboard for reference
3. WHEN recording assessment THEN the system SHALL allow teachers to add written remarks about student performance based on IELTS criteria
4. WHEN assessment is saved THEN the system SHALL store the data permanently and make it accessible for future reference
5. WHEN viewing rubrics THEN the system SHALL show detailed IELTS speaking assessment criteria for accuracy

### Requirement 6

**User Story:** As branch staff, I want to manage teacher schedules and slot availability, so that I can prevent overbooking and optimize resource allocation.

#### Acceptance Criteria

1. WHEN branch staff accesses the admin panel THEN the system SHALL allow them to create and modify teacher schedules
2. WHEN creating slots THEN the system SHALL allow setting date, time, duration, teacher assignment, and maximum capacity
3. WHEN viewing bookings THEN the system SHALL show real-time occupancy rates and prevent overbooking
4. WHEN a slot reaches capacity THEN the system SHALL automatically mark it as unavailable

### Requirement 7

**User Story:** As branch staff, I want to track attendance and generate reports, so that I can ensure accurate teacher payment disbursements and monitor no-show rates.

#### Acceptance Criteria

1. WHEN generating reports THEN the system SHALL provide attendance summaries by teacher, date range, and student
2. WHEN calculating teacher payments THEN the system SHALL use actual attendance data rather than bookings
3. WHEN students are marked absent THEN the system SHALL track no-show patterns for accountability
4. WHEN viewing reports THEN the system SHALL show booking vs. attendance ratios to identify trends

### Requirement 8

**User Story:** As a system administrator, I want to manage user accounts with proper role hierarchy, so that I can maintain appropriate access control across different user types.

#### Acceptance Criteria

1. WHEN managing users THEN the system SHALL support four user roles: Super-Admin, Branch-Admin, Teacher, and Paid Student
2. WHEN a Super-Admin manages users THEN the system SHALL allow them to add/remove all other roles and assign specific activities or page access permissions
3. WHEN a Branch-Admin manages users THEN the system SHALL allow them to add only Teachers and Students within their branch
4. WHEN adding paid students THEN the system SHALL support bulk import via CSV/Excel files based on a predefined template format
5. WHEN configuring role permissions THEN the system SHALL enforce hierarchical access where Super-Admins have full control and Branch-Admins have limited scope

### Requirement 9

**User Story:** As a branch administrator, I want to manage paid student data through bulk import, so that I can efficiently onboard eligible students for speaking test bookings.

#### Acceptance Criteria

1. WHEN importing student data THEN the system SHALL accept CSV and Excel files based on a predefined template format
2. WHEN processing bulk import THEN the system SHALL validate phone numbers as unique identifiers for paid students
3. WHEN import is successful THEN the system SHALL create student accounts with phone number authentication
4. WHEN import contains errors THEN the system SHALL provide detailed error reports with specific row and column information
5. WHEN managing student data THEN the system SHALL allow branch administrators to view, edit, and deactivate paid student accounts

### Requirement 10

**User Story:** As a system administrator, I want comprehensive audit trails for all system activities, so that I can maintain accountability and track system changes.

#### Acceptance Criteria

1. WHEN any user modifies slots THEN the system SHALL log who made the change, what was changed, and when
2. WHEN accounts are created, modified, or deleted THEN the system SHALL record the action with user details and timestamp
3. WHEN bookings are made, cancelled, or rescheduled THEN the system SHALL maintain a complete audit history
4. WHEN viewing audit logs THEN the system SHALL allow filtering by user, action type, date range, and affected entity
5. WHEN accessing audit trails THEN the system SHALL restrict access based on user roles (Super-Admins see all, Branch-Admins see branch-specific)

### Requirement 11

**User Story:** As a student, I want to receive timely notifications and reminders, so that I don't miss my speaking test appointments and stay informed about booking changes.

#### Acceptance Criteria

1. WHEN a booking is confirmed THEN the system SHALL send immediate SMS and platform notifications
2. WHEN 24 hours before a scheduled slot THEN the system SHALL send reminder SMS and platform notifications to reduce no-shows
3. WHEN a teacher cancels a session THEN the system SHALL immediately notify all affected students via SMS and platform notifications
4. WHEN a slot becomes available due to cancellation THEN the system SHALL notify students on waiting lists if implemented
5. WHEN booking status changes THEN the system SHALL update students through their preferred notification channels

### Requirement 12

**User Story:** As a student, I want to book speaking tests across different branches and access my historical data, so that I have flexibility and can track my progress.

#### Acceptance Criteria

1. WHEN a paid student searches for slots THEN the system SHALL show available slots across all branches with branch identification
2. WHEN booking cross-branch THEN the system SHALL allow students to book at any branch where they are eligible
3. WHEN viewing booking history THEN the system SHALL show students their past bookings, scores, and teacher remarks across all branches
4. WHEN accessing personal data THEN the system SHALL allow students to view their IELTS scores and assessment history
5. WHEN displaying cross-branch data THEN the system SHALL clearly indicate which branch each booking/assessment belongs to

### Requirement 13

**User Story:** As a user with specific role permissions, I want role-based data access controls, so that sensitive information is properly protected and accessible only to authorized personnel.

#### Acceptance Criteria

1. WHEN students access their data THEN the system SHALL show only their own past bookings, scores, and assessment remarks
2. WHEN teachers access student data THEN the system SHALL show only students they have taught or are scheduled to teach
3. WHEN branch administrators access data THEN the system SHALL show only students, teachers, and bookings within their specific branch
4. WHEN super-administrators access data THEN the system SHALL provide consolidated cross-branch visibility of all system data
5. WHEN displaying IELTS scores THEN the system SHALL ensure students can see their own scores, teachers can see scores they entered, and administrators can see scores within their scope

### Requirement 14

**User Story:** As a system user, I want proper handling of cancellation and rescheduling edge cases, so that the system maintains fairness and prevents slot wastage.

#### Acceptance Criteria

1. WHEN a student cancels within 24 hours of the slot THEN the system SHALL mark the slot as blocked and not make it available for rebooking
2. WHEN a teacher cancels a session THEN the system SHALL automatically notify all affected students and provide them priority access to reschedule
3. WHEN teacher cancellation occurs THEN the system SHALL offer affected students first choice of alternative slots before general availability
4. WHEN handling late cancellations THEN the system SHALL track patterns and apply appropriate policies for repeat offenders
5. WHEN emergency cancellations happen THEN the system SHALL provide administrative override capabilities with proper audit logging

### Requirement 15

**User Story:** As a branch administrator and super-administrator, I want comprehensive reporting and analytics, so that I can make data-driven decisions about resource allocation and system optimization.

#### Acceptance Criteria

1. WHEN generating reports THEN the system SHALL include slot utilization rates, showing percentage of booked vs. available slots
2. WHEN analyzing trends THEN the system SHALL provide no-show percentages by student, teacher, branch, and time period
3. WHEN viewing analytics THEN the system SHALL show booking peak times, cancellation trends, and teacher workload distribution
4. WHEN accessing management insights THEN the system SHALL provide teacher performance metrics based on student attendance and satisfaction
5. WHEN reviewing system efficiency THEN the system SHALL generate reports on average booking lead time, popular time slots, and branch performance comparisons
6. WHEN exporting data THEN the system SHALL allow report downloads in multiple formats (PDF, Excel, CSV) for further analysis

### Requirement 16

**User Story:** As any user of the system, I want intuitive and professional URL structure that provides easy navigation and appropriate access control, so that I can efficiently access features relevant to my role.

#### Acceptance Criteria

1. WHEN accessing common features THEN the system SHALL use unified URLs that show role-appropriate content (e.g., /dashboard, /schedule, /bookings)
2. WHEN accessing administrative functions THEN the system SHALL use /admin/* prefixed URLs with proper role-based access control
3. WHEN navigating the system THEN the system SHALL provide clean, professional URLs without exposing user roles in the path
4. WHEN unauthorized users attempt to access admin routes THEN the system SHALL redirect to an unauthorized access page
5. WHEN users bookmark pages THEN the system SHALL maintain consistent URL structure across sessions
6. WHEN sharing URLs THEN the system SHALL ensure URLs are professional and appropriate for business communication

### Requirement 17

**User Story:** As any user of the system, I want the platform to be reliable, user-friendly, and follow 10 Minute School branding, so that I can complete my tasks efficiently in a familiar interface.

#### Acceptance Criteria

1. WHEN accessing the system THEN the system SHALL load within 3 seconds under normal conditions
2. WHEN using mobile devices THEN the system SHALL provide a responsive interface that works on smartphones and tablets
3. WHEN viewing the interface THEN the system SHALL use 10 Minute School brand colors (red, white) with proper contrast
4. WHEN users prefer dark mode THEN the system SHALL provide a dark theme toggle switch with black/dark color scheme
5. WHEN system errors occur THEN the system SHALL display clear error messages and recovery instructions
6. WHEN data is entered THEN the system SHALL validate inputs and prevent data corruption