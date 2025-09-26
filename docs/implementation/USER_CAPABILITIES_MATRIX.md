# User Capabilities Matrix - Speaking Test Booking System

## Overview
This document provides a comprehensive breakdown of what each user type can see and do across different pages and features in the system.

## Legend
- ✅ **Can Do**: User has full access to this action
- ❌ **Cannot Do**: User has no access to this action
- ⚠️ **Limited**: User has restricted access to this action
- 🔒 **Own Only**: User can only access their own data
- 🌐 **All**: User can access all data within their scope

---

## 1. SUPER ADMIN Capabilities

### Dashboard Page
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **System Overview** | 🌐 All | View system-wide statistics and metrics |
| **Branch Performance** | 🌐 All | Compare performance across all branches |
| **User Statistics** | 🌐 All | Total users, active users, role distribution |
| **Booking Analytics** | 🌐 All | Cross-branch booking trends and patterns |
| **Revenue Reports** | 🌐 All | Financial metrics and revenue tracking |
| **System Health** | 🌐 All | Database status, server performance, error rates |

### Branches Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Branches** | 🌐 All | See all branches in the system |
| **Create Branch** | ✅ Full | Add new branches with complete details |
| **Edit Branch** | ✅ Full | Modify any branch information |
| **Delete Branch** | ✅ Full | Remove branches (with safety checks) |
| **Branch Settings** | ✅ Full | Configure branch-specific settings |
| **Branch Users** | 🌐 All | View all users in any branch |

### Users Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Users** | 🌐 All | See all users across all branches |
| **Create Users** | ✅ Full | Create any role (Super Admin, Branch Admin, Teacher, Student) |
| **Edit Users** | ✅ Full | Modify any user's information |
| **Delete Users** | ✅ Full | Deactivate or delete any user |
| **Role Management** | ✅ Full | Assign and change user roles |
| **Bulk Operations** | ✅ Full | Bulk import, export, and modify users |

### Slots Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Slots** | 🌐 All | See all slots across all branches |
| **Create Slots** | ✅ Full | Create slots for any branch and teacher |
| **Edit Slots** | ✅ Full | Modify any slot details |
| **Delete Slots** | ✅ Full | Remove any slot |
| **Block Slots** | ✅ Full | Block slots for maintenance or other reasons |
| **Slot Analytics** | 🌐 All | View slot utilization across branches |

### Bookings Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Bookings** | 🌐 All | See all bookings across all branches |
| **Create Bookings** | ✅ Full | Book slots for any student |
| **Edit Bookings** | ✅ Full | Modify any booking details |
| **Cancel Bookings** | ✅ Full | Cancel any booking with override powers |
| **Booking Analytics** | 🌐 All | Cross-branch booking patterns and trends |
| **Override Rules** | ✅ Full | Override business rules when necessary |

### Assessments Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Assessments** | 🌐 All | See all assessments across all branches |
| **Create Assessments** | ✅ Full | Record assessments for any booking |
| **Edit Assessments** | ✅ Full | Modify any assessment details |
| **Delete Assessments** | ✅ Full | Remove any assessment |
| **Assessment Analytics** | 🌐 All | Cross-branch assessment trends and scores |

### Reports & Analytics
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **System Reports** | 🌐 All | Comprehensive system-wide reports |
| **Branch Comparison** | 🌐 All | Compare performance across branches |
| **User Analytics** | 🌐 All | User behavior and engagement metrics |
| **Financial Reports** | 🌐 All | Revenue, costs, and profitability analysis |
| **Export Data** | ✅ Full | Export any data in multiple formats |
| **Custom Reports** | ✅ Full | Create custom report configurations |

### System Settings
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Global Settings** | ✅ Full | Configure system-wide parameters |
| **Business Rules** | ✅ Full | Set and modify business logic rules |
| **Notification Settings** | ✅ Full | Configure notification templates and rules |
| **Security Settings** | ✅ Full | Manage security policies and access controls |
| **Backup Settings** | ✅ Full | Configure data backup and recovery |

### Audit & Monitoring
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Audit Logs** | 🌐 All | View all system activities and changes |
| **User Activities** | 🌐 All | Track all user actions across the system |
| **System Logs** | 🌐 All | View system logs and error reports |
| **Performance Monitoring** | 🌐 All | Monitor system performance metrics |
| **Security Monitoring** | 🌐 All | Track security events and threats |

---

## 2. BRANCH ADMIN Capabilities

### Dashboard Page
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Branch Overview** | 🔒 Own Branch | View statistics for their branch only |
| **Branch Performance** | 🔒 Own Branch | Performance metrics for their branch |
| **User Statistics** | 🔒 Own Branch | Users in their branch only |
| **Booking Analytics** | 🔒 Own Branch | Booking trends for their branch |
| **Teacher Performance** | 🔒 Own Branch | Performance of teachers in their branch |

### Branches Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Branch** | 🔒 Own Branch | See only their branch information |
| **Edit Branch** | ✅ Full | Modify their branch details |
| **Branch Settings** | ✅ Full | Configure branch-specific settings |
| **Branch Users** | 🔒 Own Branch | View users in their branch only |

### Users Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Users** | 🔒 Own Branch | See only users in their branch |
| **Create Users** | ⚠️ Limited | Create Teachers and Students only |
| **Edit Users** | 🔒 Own Branch | Modify users in their branch |
| **Delete Users** | 🔒 Own Branch | Deactivate users in their branch |
| **Role Management** | ⚠️ Limited | Assign Teacher and Student roles only |
| **Bulk Import** | ✅ Full | Import students via CSV/Excel |

### Slots Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Slots** | 🔒 Own Branch | See slots for their branch only |
| **Create Slots** | ✅ Full | Create slots for their branch |
| **Edit Slots** | 🔒 Own Branch | Modify slots in their branch |
| **Delete Slots** | 🔒 Own Branch | Remove slots in their branch |
| **Block Slots** | ✅ Full | Block slots in their branch |
| **Slot Analytics** | 🔒 Own Branch | View slot utilization for their branch |

### Bookings Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Bookings** | 🔒 Own Branch | See bookings for their branch only |
| **Create Bookings** | ✅ Full | Book slots for students in their branch |
| **Edit Bookings** | 🔒 Own Branch | Modify bookings in their branch |
| **Cancel Bookings** | 🔒 Own Branch | Cancel bookings in their branch |
| **Booking Analytics** | 🔒 Own Branch | Booking patterns for their branch |

### Assessments Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Assessments** | 🔒 Own Branch | See assessments for their branch |
| **Create Assessments** | ✅ Full | Record assessments for their branch |
| **Edit Assessments** | 🔒 Own Branch | Modify assessments in their branch |
| **Assessment Analytics** | 🔒 Own Branch | Assessment trends for their branch |

### Reports & Analytics
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Branch Reports** | 🔒 Own Branch | Reports for their branch only |
| **Teacher Performance** | 🔒 Own Branch | Performance of their teachers |
| **Student Progress** | 🔒 Own Branch | Progress of students in their branch |
| **Export Data** | 🔒 Own Branch | Export data for their branch only |

### Settings
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Branch Settings** | ✅ Full | Configure branch-specific settings |
| **Profile Settings** | 🔒 Own | Modify their own profile |
| **Notification Settings** | 🔒 Own | Configure their notification preferences |

### Audit & Monitoring
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Branch Audit Logs** | 🔒 Own Branch | View activities in their branch only |
| **User Activities** | 🔒 Own Branch | Track user actions in their branch |

---

## 3. TEACHER Capabilities

### Dashboard Page
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **My Schedule** | 🔒 Own | View their upcoming sessions |
| **Today's Sessions** | 🔒 Own | Sessions scheduled for today |
| **Student List** | 🔒 Own | Students in their upcoming sessions |
| **Performance Summary** | 🔒 Own | Their teaching performance metrics |

### Branches Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Branch** | 🔒 Own Branch | See their branch information only |
| **Branch Info** | ❌ No Access | Cannot modify branch details |

### Users Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Students** | 🔒 Own Sessions | See students in their sessions only |
| **Student Profiles** | 🔒 Own Sessions | View profiles of their students |
| **Profile Settings** | 🔒 Own | Modify their own profile only |

### Slots Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View My Slots** | 🔒 Own | See only their assigned slots |
| **Slot Details** | 🔒 Own | View details of their slots |
| **Slot Status** | ❌ No Access | Cannot modify slot details |

### Bookings Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View My Bookings** | 🔒 Own | See bookings for their sessions |
| **Student Attendance** | ✅ Full | Mark attendance for their sessions |
| **Booking Details** | 🔒 Own | View details of their session bookings |

### Assessments Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View My Assessments** | 🔒 Own | See assessments they've conducted |
| **Create Assessment** | ✅ Full | Record assessments for their sessions |
| **Edit Assessment** | 🔒 Own | Modify their own assessments |
| **IELTS Rubrics** | ✅ Full | Access IELTS scoring rubrics |
| **Assessment History** | 🔒 Own | View their assessment history |

### Reports & Analytics
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **My Performance** | 🔒 Own | View their teaching performance |
| **Student Progress** | 🔒 Own Sessions | Progress of their students |
| **Assessment Scores** | 🔒 Own | Scores they've recorded |

### Settings
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Profile Settings** | 🔒 Own | Modify their own profile |
| **Notification Settings** | 🔒 Own | Configure their notifications |
| **Teaching Preferences** | 🔒 Own | Set their teaching preferences |

### Audit & Monitoring
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **My Activities** | 🔒 Own | View their own activities only |

---

## 4. STUDENT Capabilities

### Dashboard Page
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **My Bookings** | 🔒 Own | View their current and past bookings |
| **My Scores** | 🔒 Own | View their assessment scores |
| **Upcoming Sessions** | 🔒 Own | See their upcoming speaking tests |
| **Progress Tracking** | 🔒 Own | Track their learning progress |

### Branches Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Branches** | 🌐 All | See all available branches |
| **Branch Details** | 🌐 All | View branch information and contact details |

### Users Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **My Profile** | 🔒 Own | View and edit their own profile |
| **Profile Settings** | 🔒 Own | Modify their personal information |
| **Contact Info** | 🔒 Own | Update their contact details |

### Slots Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View Available Slots** | 🌐 All | See available slots across all branches |
| **Filter Slots** | 🌐 All | Filter by date, time, teacher, branch |
| **Slot Details** | 🌐 All | View details of available slots |

### Bookings Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View My Bookings** | 🔒 Own | See their own bookings only |
| **Create Booking** | ✅ Full | Book available slots |
| **Cancel Booking** | ⚠️ Limited | Cancel with 24-hour notice rule |
| **Reschedule Booking** | ⚠️ Limited | Reschedule with 24-hour notice rule |
| **Booking History** | 🔒 Own | View their booking history |

### Assessments Management
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **View My Assessments** | 🔒 Own | See their own assessment results |
| **IELTS Scores** | 🔒 Own | View their IELTS speaking scores |
| **Teacher Remarks** | 🔒 Own | Read teacher feedback and remarks |
| **Score History** | 🔒 Own | Track their score progression |

### Reports & Analytics
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **My Progress** | 🔒 Own | View their learning progress |
| **Score Trends** | 🔒 Own | Track their score improvements |
| **Performance Summary** | 🔒 Own | Summary of their performance |

### Settings
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **Profile Settings** | 🔒 Own | Modify their personal information |
| **Notification Settings** | 🔒 Own | Configure their notification preferences |
| **Privacy Settings** | 🔒 Own | Manage their privacy preferences |

### Audit & Monitoring
| Feature | Access Level | Description |
|---------|-------------|-------------|
| **No Access** | ❌ No Access | Students cannot view audit logs |

---

## Access Control Summary

### Data Scope by Role
- **Super Admin**: All data across all branches
- **Branch Admin**: Data within their assigned branch only
- **Teacher**: Data related to their assigned sessions and students
- **Student**: Their own personal data only

### Action Permissions by Role
- **Super Admin**: Full CRUD access to all entities
- **Branch Admin**: Full CRUD within their branch scope
- **Teacher**: Limited to their teaching responsibilities
- **Student**: Limited to their personal data and booking actions

### Security Considerations
- All users can only access data within their authorized scope
- Sensitive operations require proper authentication
- Audit trails are maintained for all significant actions
- Role-based access is enforced at both UI and API levels
