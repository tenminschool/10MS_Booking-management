# User Flow & Layout Documentation

## Overview

This document provides detailed user flows, layout specifications, and component arrangements for the Speaking Test Booking Management System. It complements the design document with specific UI/UX patterns and interaction flows.

## Layout Architecture

### Global Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Header (Sticky)                          │
│  Logo + Nav Links (Desktop) | User Menu + Mobile Toggle     │
├─────────────────────────────────────────────────────────────┤
│                    Main Content Area                        │
│  ┌─────────────────────────────┬─────────────────────────┐  │
│  │                             │                         │  │
│  │     Primary Content         │   Secondary Content     │  │
│  │        (2/3 width)          │      (1/3 width)        │  │
│  │                             │                         │  │
│  │   Core user functions       │  Supporting features    │  │
│  │   Main workflows            │  Quick actions          │  │
│  │   Primary data              │  Notifications          │  │
│  │                             │  Stats/summaries        │  │
│  └─────────────────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Header Components:**
- Left: 10MS Logo + Navigation (Desktop only)
- Right: User Badge + Name + Logout (Desktop) | Hamburger Menu (Mobile)
- Mobile: Collapsible navigation drawer

**Navigation Pattern:**
- Desktop: Horizontal navigation bar with active state indicators
- Mobile: Slide-out drawer with full navigation menu
- Consistent across all user roles (content differs, structure same)

## Student Portal User Flows

### 1. Dashboard Page (`/dashboard`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Welcome Header (Full width, gradient background)           │
├─────────────────────────────────────────────────────────────┤
│  Two-Column Layout (2/3 + 1/3, single column on mobile)    │
│  ┌─────────────────────────────┬─────────────────────────┐ │
│  │     PRIMARY CONTENT         │   SECONDARY CONTENT     │ │
│  │        (2/3 width)          │      (1/3 width)        │ │
│  │                             │                         │ │
│  │  Upcoming Bookings          │  Quick Stats Cards      │ │
│  │  (Large card with list)     │  (Stacked vertically)   │ │
│  │                             │                         │ │
│  │  Quick Book Section         │  Recent Notifications   │ │
│  │  (Calendar + CTA)           │  (Compact list)         │ │
│  │                             │                         │ │
│  │  Recent Activity            │  Quick Actions          │ │
│  │  (Timeline/list)            │  (Button grid)          │ │
│  └─────────────────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Components Used:**
- Card, CardHeader, CardTitle, CardContent
- Button (primary CTA, outline variants)
- Badge (for status indicators)
- Grid layouts (responsive)

**User Flow:**
1. Land on dashboard → See welcome message + quick stats
2. View upcoming bookings → Click to go to bookings page
3. Check notifications → Click to go to notifications center
4. Use quick actions → Navigate to specific features
5. Primary CTA: "Book Now" → Navigate to schedule browser

### 2. Schedule Browser (`/schedule`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Page Header (Title + View Toggle Buttons)                 │
├─────────────────────────────────────────────────────────────┤
│  Two-Column Layout (2/3 + 1/3, single column on mobile)    │
│  ┌─────────────────────────────┬─────────────────────────┐ │
│  │     PRIMARY CONTENT         │   SECONDARY CONTENT     │ │
│  │        (2/3 width)          │      (1/3 width)        │ │
│  │                             │                         │ │
│  │  Date Navigation            │  Filters & Search       │ │
│  │  (Prev/Next + Range)        │  (Branch, Teacher, etc) │ │
│  │                             │                         │ │
│  │  Schedule View              │  Booking Summary        │ │
│  │  (Daily/Weekly/Monthly)     │  (Selected slot info)   │ │
│  │  - Slot cards grid          │                         │ │
│  │  - Calendar component       │  Quick Book             │ │
│  │  - Available slots          │  (Recent searches)      │ │
│  │                             │                         │ │
│  │                             │  My Next Booking        │ │
│  │                             │  (Quick reminder)       │ │
│  └─────────────────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Components Used:**
- Card (for filters and slot cards)
- Button (view toggles, navigation, booking actions)
- Calendar (monthly view)
- Badge (capacity indicators)
- Dialog (booking confirmation)

**User Flow:**
1. Enter schedule page → See weekly view by default
2. Filter by branch → Slots update in real-time
3. Navigate dates → Use prev/next or calendar picker
4. Switch views → Daily/Weekly/Monthly toggle
5. Select slot → Booking dialog opens
6. Confirm booking → Success feedback + redirect to bookings

**Slot Card Layout:**
```
┌─────────────────────────────────────┐
│  Time Range        Capacity Badge   │
│  Teacher Name      Branch Name      │
│  [Book Slot Button - Full Width]   │
└─────────────────────────────────────┘
```

### 3. My Bookings (`/bookings`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Page Header + Filter Tabs (Upcoming/Past/All)             │
├─────────────────────────────────────────────────────────────┤
│  Two-Column Layout (2/3 + 1/3, single column on mobile)    │
│  ┌─────────────────────────────┬─────────────────────────┐ │
│  │     PRIMARY CONTENT         │   SECONDARY CONTENT     │ │
│  │        (2/3 width)          │      (1/3 width)        │ │
│  │                             │                         │ │
│  │  Booking Cards List         │  Booking Statistics     │ │
│  │  (Vertical stack)           │  (Total, Attended, etc) │ │
│  │  - Expandable cards         │                         │ │
│  │  - Action buttons           │  Quick Actions          │ │
│  │  - Status indicators        │  - Book new slot        │ │
│  │                             │  - Download history     │ │
│  │  Pagination                 │                         │ │
│  │                             │  Upcoming Reminders     │ │
│  │                             │  (Next 3 bookings)      │ │
│  │                             │                         │ │
│  │                             │  Help & Support         │ │
│  │                             │  (FAQ, Contact)         │ │
│  └─────────────────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Booking Card Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Date & Time               Status Badge                     │
│  Teacher Name              Branch Name                      │
│  ┌─────────────┬─────────────┬─────────────────────────┐   │
│  │   Cancel    │  Reschedule │      View Details       │   │
│  └─────────────┴─────────────┴─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**User Flow:**
1. View bookings list → Filter by status tabs
2. Select booking → Expand to see action buttons
3. Cancel booking → Confirmation dialog + reason input
4. Reschedule → Navigate to schedule browser with pre-filter
5. View details → See full booking information

### 4. My Assessments (`/assessments`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Page Header + Summary Stats                                │
├─────────────────────────────────────────────────────────────┤
│  Assessment Table (Responsive, becomes cards on mobile)    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Date | Teacher | Branch | Score | Remarks | View   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**User Flow:**
1. View assessment history → See table/card list
2. Click view details → Modal with full assessment
3. Filter by date range → Table updates
4. Export assessments → Download CSV

### 5. Notifications (`/notifications`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Page Header + Mark All Read Button                         │
├─────────────────────────────────────────────────────────────┤
│  Notification List (Vertical stack)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Unread Notification (Blue background)             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Read Notification (Gray background)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Notification Card Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Icon  Title                           Timestamp            │
│        Message text                                         │
│        [Mark as Read] (if unread)                          │
└─────────────────────────────────────────────────────────────┘
```

## Teacher Portal User Flows

### 1. Teacher Dashboard (`/dashboard`)

**Layout Differences from Student:**
- Welcome message focuses on teaching schedule
- Stats show teaching metrics (sessions today, total students, etc.)
- Upcoming sessions instead of bookings
- Quick actions: View Schedule, Record Assessment, etc.

### 2. Teacher Schedule (`/schedule`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Page Header + Calendar View Toggle                         │
├─────────────────────────────────────────────────────────────┤
│  Weekly/Monthly Calendar Grid                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Time slots with assigned sessions                  │   │
│  │  Color-coded by status (confirmed/completed)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3. Teacher Sessions (`/bookings`)

**Session Card Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Date & Time               Student Count                    │
│  Student Names List        Branch Name                      │
│  ┌─────────────┬─────────────┬─────────────────────────┐   │
│  │ Mark Attend │ Record Score│      Cancel Session     │   │
│  └─────────────┴─────────────┴─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Admin Portal User Flows

### Branch Admin Dashboard

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Branch Overview Header (Branch name + key metrics)        │
├─────────────────────────────────────────────────────────────┤
│  Stats Grid (Branch-specific metrics)                      │
├─────────────────────────────────────────────────────────────┤
│  Three-Column Layout                                        │
│  ┌─────────┬─────────────┬─────────────────────────────┐   │
│  │ Today's │   Recent    │      Quick Actions          │   │
│  │Sessions │ Activities  │   (Admin functions)         │   │
│  └─────────┴─────────────┴─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Admin Routes Layout Pattern

**Consistent Admin Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Page Header + Primary Action Button                        │
├─────────────────────────────────────────────────────────────┤
│  Filters/Search Bar (if applicable)                        │
├─────────────────────────────────────────────────────────────┤
│  Data Table/Grid with Actions                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Sortable columns + Row actions                     │   │
│  │  Pagination at bottom                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Mobile Responsiveness Patterns

### Breakpoint Strategy
- **Mobile**: < 768px (Single column, stacked cards)
- **Tablet**: 768px - 1024px (Two columns, condensed navigation)
- **Desktop**: > 1024px (Full layout, horizontal navigation)

### Mobile Adaptations
1. **Navigation**: Hamburger menu with slide-out drawer
2. **Cards**: Full-width, increased padding
3. **Tables**: Convert to stacked cards with labels
4. **Grids**: Collapse to single/double column
5. **Dialogs**: Full-screen on mobile

## Component Specifications

### Card Variants
- **Dashboard Cards**: Stats with icon + number + description
- **Booking Cards**: Expandable with action buttons
- **Slot Cards**: Compact with booking CTA
- **Notification Cards**: Icon + content + timestamp

### Button Patterns
- **Primary**: Red background (10MS brand)
- **Secondary**: White background, red border
- **Ghost**: Transparent, used in navigation
- **Destructive**: Red background for cancel actions

### Badge Usage
- **Status**: Green (confirmed), Yellow (pending), Red (cancelled)
- **Capacity**: Blue for availability indicators
- **Role**: Gray for user role display
- **Count**: Red for notification counts

### Dialog Patterns
- **Confirmation**: Simple yes/no with details
- **Forms**: Multi-step with validation
- **Details**: Read-only information display

## Interaction Patterns

### Loading States
- Skeleton screens for initial loads
- Spinner for button actions
- Progressive loading for large lists

### Error Handling
- Toast notifications for actions
- Inline validation for forms
- Error boundaries for crashes

### Success Feedback
- Toast confirmations
- Badge updates
- Page redirects with success messages

This documentation should guide the implementation of consistent, user-friendly interfaces across all user roles while maintaining the hybrid URL architecture and mobile-first design principles.