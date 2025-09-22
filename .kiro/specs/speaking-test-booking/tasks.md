# Implementation Plan

- [x] 1. Set up project foundation and development environment
  - Initialize React TypeScript project with Vite
  - Set up Express.js TypeScript backend with proper folder structure
  - Configure Prisma ORM with PostgreSQL database schema
  - Install and configure Shadcn/ui components with 10MS branding (red, white, dark theme)
  - Set up basic development environment with Docker Compose for database
  - _Requirements: 16.1, 16.3, 16.4_

- [x] 2. Implement enhanced database models with audit trails and system settings
  - Create comprehensive Prisma schema with Branch, User, Slot, Booking, Assessment, Notification, AuditLog, and SystemSetting models
  - Implement database indexes for optimal query performance on frequently accessed fields
  - Add business rule constraints (unique booking per student per slot, role-based branch assignments)
  - Implement database migrations and enhanced seed script with multiple branches, system settings, and sample data
  - Set up JWT authentication middleware and password hashing with bcrypt
  - Create basic authentication endpoints for staff login (email/password)
  - _Requirements: 8.1, 8.5, 10.1, 10.2, 12.5, 13.1, 13.2_

- [x] 3. Build student phone number authentication system
  - Implement SMS OTP service integration for student authentication
  - Create student login endpoints with phone number verification
  - Build phone number validation and OTP verification logic
  - Add student authentication middleware and session management
  - _Requirements: 2.1, 9.2, 9.3, 11.1_

- [x] 4. Create role-based access control and multi-branch user management
  - Implement role-based middleware for route protection with branch-specific permissions
  - Create user management endpoints for CRUD operations across branches
  - Build branch management system for Super-Admins to create and manage branches
  - Build bulk student import functionality with CSV parsing, validation, and branch assignment
  - Add error handling for duplicate phone numbers and invalid data formats
  - _Requirements: 8.2, 8.3, 9.1, 9.4, 9.5, 12.5, 13.3, 13.4_

- [x] 5. Develop cross-branch slot management system
  - Create slot creation and management endpoints with teacher and branch assignment
  - Implement slot availability calculation and capacity management across branches
  - Build slot filtering and querying logic (daily, weekly, monthly views) with branch selection
  - Add validation for slot conflicts, business rules, and cross-branch constraints
  - Create branch listing endpoints for slot browser functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 1.2, 12.1, 12.5_

- [x] 6. Build cross-branch booking functionality with business rules
  - Implement booking creation with duplicate prevention, capacity checks, and cross-branch support
  - Create booking cancellation logic with 24-hour rule enforcement
  - Build booking rescheduling functionality with cross-branch slot availability validation
  - Add real-time slot capacity updates and booking status management across branches
  - Implement monthly duplicate booking prevention across all branches
  - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 12.1, 12.2_

- [x] 7. Implement multi-channel notification system (SMS + In-App)
  - Set up SMS gateway integration for booking confirmations and reminders
  - Create in-app notification system with database storage and read/unread status
  - Build notification templates for both SMS and in-app channels
  - Implement automated 24-hour reminder system with cron jobs for both channels
  - Add SMS delivery status tracking and in-app notification management
  - _Requirements: 2.2, 2.5, 11.1, 11.2, 11.3, 11.5_

- [x] 8. Create student portal with hybrid URL architecture
  - Implement React Router with hybrid URL structure (unified + admin routes)
  - Build student dashboard (/dashboard) with upcoming bookings, notifications, and quick booking access
  - Implement slot browser (/schedule) with calendar view and filtering options (date, teacher, branch)
  - Create booking management interface (/bookings) for viewing, canceling, and rescheduling across branches
  - Add assessment history page (/assessments) and notification center (/notifications)
  - Add mobile-responsive design using Shadcn Card, Calendar, Dialog, and Badge components
  - _Requirements: 1.1, 1.2, 1.5, 12.1, 12.3, 12.5, 16.2, 16.6_

- [x] 9. Develop teacher portal with unified URL structure
  - Build teacher dashboard (/dashboard) showing today's sessions and quick actions
  - Implement teacher schedule view (/schedule) with weekly/monthly calendar of assigned slots
  - Create session management interface (/bookings) with student details and attendance marking
  - Add assessment recording page (/assessments) with IELTS scoring interface
  - Implement role-based content rendering for shared URLs
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Build assessment recording system with IELTS scoring and cross-branch access
  - Create assessment recording interface with IELTS score input (0-9, 0.5 increments)
  - Implement IELTS rubrics display for teacher reference during scoring
  - Build assessment history view for teachers and students with role-based access across branches
  - Add assessment data validation, permanent storage, and branch context
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.3, 12.4, 13.1, 13.5_

- [x] 11. Create branch admin portal with hybrid URL structure
  - Build branch admin dashboard (/dashboard) with branch overview and key metrics
  - Implement unified pages: schedule overview (/schedule), session tracking (/bookings), assessment analytics (/assessments)
  - Create admin-specific routes: slot management (/admin/slots), student import (/admin/import), user management (/admin/users)
  - Build branch-specific reporting dashboard (/admin/reports) with charts and CSV export functionality
  - Add route protection and role-based access control for admin routes
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 9.1, 9.4, 15.1, 15.2, 15.6_

- [x] 12. Implement super admin portal with comprehensive admin routes
  - Create system dashboard (/dashboard) with cross-branch metrics and comparative charts
  - Implement unified overview pages: system schedule (/schedule), all sessions (/bookings), assessment analytics (/assessments)
  - Build super-admin routes: branch management (/admin/branches), user administration (/admin/users), system reports (/admin/reports)
  - Create system configuration interface (/admin/settings) for business rules and notification templates
  - Implement hierarchical route protection (Super-Admin access to all admin routes)
  - _Requirements: 8.2, 12.5, 13.4, 15.1, 15.2, 15.3, 15.5, 15.6_

- [x] 13. Implement audit logging and system configuration
  - Create audit logging middleware to track all database changes (CREATE, UPDATE, DELETE operations)
  - Implement audit log viewing interface for administrators with filtering capabilities
  - Build system settings management interface for configuring business rules
  - Add audit trail for sensitive operations (user management, booking changes, assessment modifications)
  - Create system settings API endpoints for runtime configuration management
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 14. Add comprehensive error handling and validation
  - Implement client-side form validation using Shadcn form components
  - Create server-side validation for all API endpoints with clear error messages
  - Add business rule validation (duplicate bookings, capacity limits, 24-hour cancellation)
  - Build error logging system and user-friendly error displays
  - _Requirements: 17.5, 17.6_

- [x] 15. Build comprehensive reporting and analytics system
  - Create attendance report generation with teacher, date range, student, and branch filters
  - Implement no-show tracking and pattern analysis for accountability across branches
  - Build analytics dashboard with slot utilization, booking trends, and branch comparisons
  - Create real-time dashboard metrics API for live data updates
  - Add CSV export functionality for all reports with proper formatting and branch context
  - _Requirements: 7.1, 7.3, 7.4, 15.1, 15.2, 15.3, 15.5, 15.6_

- [x] 16. Implement advanced booking features and cross-branch edge cases
  - Add late cancellation handling with slot blocking for within 24-hour cancellations
  - Implement teacher cancellation workflow with automatic multi-channel student notifications
  - Build priority rescheduling system for students affected by teacher cancellations (cross-branch options)
  - Add administrative override capabilities with proper audit logging
  - Handle cross-branch booking conflicts and business rule enforcement using system settings
  - _Requirements: 14.1, 14.2, 14.3, 14.5, 12.2_

- [x] 17. Create comprehensive testing suite for multi-branch system
  - Write integration tests for cross-branch booking flow (browse, book, confirm, cancel)
  - Test authentication systems for both student phone login and staff email login
  - Create tests for assessment recording, CSV import, and role-based access control across branches
  - Test multi-channel notification system (SMS + in-app) and delivery verification
  - Test audit logging system and system settings management
  - Add mobile responsiveness testing and cross-branch data isolation validation
  - _Requirements: All core functionality validation including cross-branch features and audit trails_

- [x] 18. Set up production deployment and monitoring
  - Configure production environment with VPS, Nginx, and PM2
  - Set up PostgreSQL database with proper backup procedures and audit log retention
  - Implement basic monitoring with health checks, error logging, and audit trail monitoring
  - Configure HTTPS, environment variables, and security measures
  - _Requirements: 17.1, Security and deployment requirements_

- [x] 19. Perform end-to-end testing and multi-branch system integration
  - Conduct complete user journey testing for all four user roles across multiple branches
  - Test multi-channel notifications (SMS + in-app), booking confirmations, and reminder systems
  - Validate cross-branch business rules, edge cases, and error handling scenarios
  - Test reporting dashboards, analytics, audit logs, and export functionality across branches
  - Validate system settings management and business rule enforcement
  - Perform mobile device testing and cross-browser compatibility checks
  - _Requirements: All requirements validation including cross-branch functionality, audit trails, and user acceptance_