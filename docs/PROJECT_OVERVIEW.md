# Speaking Test Booking System - Project Overview

## System Overview
Multi-branch speaking test booking system for 10 Minute School with role-based access control, real-time booking management, IELTS assessment recording, and comprehensive reporting capabilities.

## Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Supabase
- **Frontend**: React, TypeScript, Vite
- **Authentication**: JWT-based with role-based access control
- **Deployment**: Docker, PM2, Nginx

### System Components
- **Multi-branch Support**: Centralized system supporting multiple physical branches
- **Role-based Access**: 4 user roles (Super Admin, Branch Admin, Teacher, Student)
- **Service Types Management**: Multiple test/service types (CBT, PBT, Speaking, Counselling, Exam Accelerator)
- **Room Management**: Branch-based room assignment and capacity management
- **Real-time Booking**: Live slot availability and booking management with service types
- **Assessment System**: IELTS scoring with detailed rubrics
- **Notification System**: Multi-channel notifications (SMS + in-app)
- **Reporting Dashboard**: Comprehensive analytics and reporting
- **Audit System**: Complete change tracking and accountability

## User Roles & Permissions

### Super Admin
- **Access**: All branches and system-wide operations
- **Capabilities**: 
  - Manage all branches, users, and system settings
  - Create and manage service types (CBT, PBT, Speaking, Counselling, Exam Accelerator)
  - Manage rooms across all branches
  - Create slots with service types and room assignments
  - View comprehensive reports across all branches
  - System configuration and maintenance
  - Full audit trail access

### Branch Admin
- **Access**: Single branch operations
- **Capabilities**:
  - Manage branch users (teachers and students)
  - Create and manage rooms for their branch
  - Create and manage slots with service types and room assignments
  - View branch-specific reports and analytics
  - Handle branch-level bookings and assessments

### Teacher
- **Access**: Own slots and assigned students
- **Capabilities**:
  - View and manage assigned slots
  - Conduct assessments with IELTS scoring
  - Mark attendance for bookings
  - Access teaching-related reports

### Student
- **Access**: Own bookings and assessments
- **Capabilities**:
  - Browse and filter slots by service type (CBT, PBT, Speaking, Counselling, Exam Accelerator)
  - Book slots with service type and room information
  - View booking history with service and room details
  - Receive notifications and reminders
  - Access personal assessment history

## Core Features

### 1. Booking Management
- **Service Type Selection**: Students can filter and book by service type (CBT, PBT, Speaking, Counselling, Exam Accelerator)
- **Room Assignment**: Slots can be assigned to specific rooms within branches
- **Cross-branch Booking**: Students can book slots in any branch
- **Real-time Availability**: Live slot capacity and availability updates
- **Business Rules**: Monthly booking limits, 24-hour cancellation policy
- **Booking Lifecycle**: Confirmed → Completed/Cancelled/No-show
- **Rescheduling**: Cross-branch rescheduling with capacity management

### 2. Assessment System
- **IELTS Scoring**: 0-9 scale with 0.5 increments
- **Detailed Rubrics**: Complete IELTS criteria for teacher reference
- **Score Validation**: Strict validation for score accuracy
- **Assessment History**: Role-based access to assessment records
- **Teacher Feedback**: Required remarks for each assessment

### 3. Slot Management
- **Service Type Integration**: Slots created with specific service types (CBT, PBT, Speaking, Counselling, Exam Accelerator)
- **Room Assignment**: Slots can be assigned to specific rooms with capacity management
- **Flexible Scheduling**: Date, time, and capacity management
- **Teacher Assignment**: Slots assigned to specific teachers
- **Capacity Control**: Multiple students per slot with capacity limits
- **Conflict Detection**: Prevents overlapping teacher schedules
- **Bulk Operations**: Create multiple slots efficiently

### 4. Notification System
- **Multi-channel Delivery**: SMS and in-app notifications
- **Automated Reminders**: 24-hour booking reminders
- **Status Updates**: Booking confirmations, cancellations, changes
- **Template Management**: Customizable notification templates
- **Delivery Tracking**: Notification status and read receipts

### 5. Service Types & Room Management
- **Service Types**: CBT Full Mock, PBT Full Mock, Speaking Mock Test, 1:1 Counselling, Exam Accelerator Service
- **Duration Management**: Each service type has configurable duration (15-180 minutes)
- **Capacity Settings**: Default capacity per service type with override capability
- **Room Assignment**: Branch-based room management with capacity tracking
- **Room Types**: General, Computer Lab, Counselling, Exam Hall with equipment tracking
- **Integration**: Seamless integration with slot creation and booking management

### 6. Reporting & Analytics
- **Real-time Dashboard**: Live metrics and key performance indicators
- **Performance Analytics**: Teacher performance and utilization rates
- **Attendance Tracking**: Detailed attendance patterns and statistics
- **No-show Analysis**: Pattern detection and risk assessment
- **Export Capabilities**: CSV and PDF report generation
- **Cross-branch Comparison**: Multi-branch performance analysis

### 7. System Administration
- **User Management**: Create, update, and manage user accounts
- **Branch Management**: Multi-branch configuration and settings
- **System Settings**: Configurable business rules and parameters
- **Audit Logging**: Complete change tracking and accountability
- **Security Management**: Role-based permissions and access control

## Technical Implementation

### Database Design
- **8 Core Tables**: Branch, User, Slot, Booking, Assessment, Notification, AuditLog, SystemSetting
- **Optimized Performance**: Comprehensive indexing strategy
- **Data Integrity**: Foreign key constraints and business rule validation
- **Audit Trail**: Complete change tracking with user attribution
- **Scalability**: Designed for growth with read replicas and partitioning

### API Architecture
- **RESTful Design**: Standard HTTP methods and status codes
- **Role-based Endpoints**: Access control at the API level
- **Validation Middleware**: Input validation and sanitization
- **Error Handling**: Comprehensive error responses and logging
- **Performance Optimization**: Efficient queries and caching strategies

### Frontend Architecture
- **Component-based Design**: Reusable React components
- **State Management**: React Query for server state management
- **Responsive Design**: Mobile-first responsive interface
- **Type Safety**: Full TypeScript implementation
- **User Experience**: Intuitive navigation and interaction patterns

### Security Implementation
- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Password hashing and sensitive data encryption
- **Input Validation**: Comprehensive input sanitization and validation
- **Audit Trail**: Complete activity logging and monitoring

## Development Workflow

### Testing Strategy
- **Comprehensive Test Suite**: Integration tests for all major functionality
- **Cross-branch Testing**: Multi-branch scenario validation
- **Role-based Testing**: All user roles and permissions tested
- **Business Rule Testing**: All constraints and rules validated
- **Mobile Testing**: Mobile responsiveness and compatibility
- **Security Testing**: Data isolation and access control verification

### Quality Assurance
- **Code Quality**: TypeScript for type safety and error prevention
- **Performance Monitoring**: Database query optimization and response time tracking
- **Error Handling**: Graceful error handling and user feedback
- **Documentation**: Comprehensive documentation for all features
- **Code Reviews**: Peer review process for all changes

### Deployment Strategy
- **Containerization**: Docker containers for consistent deployment
- **Process Management**: PM2 for application process management
- **Reverse Proxy**: Nginx for load balancing and SSL termination
- **Database Management**: PostgreSQL with backup and recovery procedures
- **Monitoring**: Application and infrastructure monitoring

## Project Status

### ✅ Completed Features
- **Multi-branch Architecture**: Fully implemented and operational
- **User Management**: All roles and permissions working
- **Booking System**: Complete booking lifecycle management
- **Assessment System**: IELTS scoring with rubrics and validation
- **Notification System**: Multi-channel notifications working
- **Reporting Dashboard**: Comprehensive analytics and reporting
- **Testing Suite**: Complete integration test coverage
- **Documentation**: Comprehensive feature documentation

### 🔄 Ongoing Maintenance
- **Performance Optimization**: Continuous query and response time optimization
- **Feature Enhancements**: User feedback-driven improvements
- **Security Updates**: Regular security patches and updates
- **Documentation Updates**: Keeping documentation current with changes

### 📈 Future Enhancements
- **Mobile Application**: Native mobile app development
- **Advanced Analytics**: Machine learning-based insights
- **Integration APIs**: Third-party system integrations
- **Scalability Improvements**: Database sharding and microservices
- **Advanced Notifications**: Push notifications and email integration

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Docker (optional but recommended)

### Quick Start
1. **Clone Repository**: `git clone [repository-url]`
2. **Install Dependencies**: `npm install` in both backend and frontend directories
3. **Database Setup**: Configure PostgreSQL and run migrations
4. **Environment Configuration**: Set up `.env` files with required variables
5. **Start Development**: `npm run dev` in both backend and frontend
6. **Access Application**: Frontend at `http://localhost:3000`, Backend at `http://localhost:3001`

### Documentation Structure
- **Feature Documentation**: `docs/features/` - Detailed feature specifications
- **Setup Guides**: `docs/setup/` - Installation and configuration guides
- **API Documentation**: `docs/api/` - API endpoint documentation
- **Deployment Guides**: `deployment/` - Production deployment instructions

This system provides a comprehensive solution for managing speaking test bookings across multiple branches with robust security, performance, and scalability features.