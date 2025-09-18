# Speaking Test Booking Management System

A comprehensive booking management system for 10 Minute School offline English Learning Center branches.

## Features

- 🏢 **Multi-Branch Support**: Students can book across different branches
- 📱 **Mobile-First Design**: Responsive interface with 10MS branding
- 🔐 **Role-Based Access**: Super-Admin, Branch-Admin, Teacher, and Student roles
- 📊 **Real-Time Dashboard**: Live booking metrics and analytics
- 💬 **Multi-Channel Notifications**: SMS and in-app notifications
- 📈 **IELTS Assessment**: Score recording with rubrics reference
- 📋 **Comprehensive Reporting**: Attendance tracking and export functionality

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui component library
- React Query for state management
- React Router for navigation

### Backend
- Node.js with Express.js
- TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication
- Bcrypt for password hashing

## Getting Started

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd speaking-test-booking-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   cd ..
   ```

3. **Start the database**
   ```bash
   docker-compose up -d
   ```

4. **Set up the database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

### Database Schema

The system uses **8 core tables** with optimized relationships:

1. **Branch** - Multi-branch support
2. **User** - Role-based authentication (Super-Admin, Branch-Admin, Teacher, Student)
3. **Slot** - Time slot management with capacity control
4. **Booking** - Booking management with status tracking
5. **Assessment** - IELTS scoring with rubrics
6. **Notification** - In-app notification system
7. **AuditLog** - Complete system activity tracking
8. **SystemSetting** - Runtime configuration management

**Key Relationships:**
- Branch → Users (1:Many)
- Branch → Slots (1:Many)  
- User → Bookings (1:Many)
- Slot → Bookings (1:Many)
- Booking → Assessment (1:1)
- User → Notifications (1:Many)
- User → AuditLogs (1:Many)

### Default Login Credentials

**Super Admin:**
- Email: admin@10minuteschool.com
- Password: admin123

**Branch Admin (Dhanmondi):**
- Email: dhanmondi@10minuteschool.com  
- Password: admin123

**Branch Admin (Gulshan):**
- Email: gulshan@10minuteschool.com
- Password: admin123

**Teachers:**
- Sarah Ahmed: sarah@10minuteschool.com / teacher123
- John Smith: john@10minuteschool.com / teacher123

**Students:**
- Phone: +8801712345678 (Ahmed Rahman)
- Phone: +8801812345678 (Fatima Khan)

## Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utility functions
│   │   └── types/          # TypeScript type definitions
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── controllers/    # Business logic controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic services
│   │   ├── types/          # TypeScript type definitions
│   │   └── prisma/         # Database schema and seed
└── docker-compose.yml      # Development database setup
```

## Development

### Database Management

```bash
# Generate Prisma client
cd backend && npx prisma generate

# Push schema changes to database
cd backend && npx prisma db push

# Run database migrations
cd backend && npx prisma migrate dev

# Seed the database
cd backend && npm run db:seed

# Open Prisma Studio
cd backend && npx prisma studio
```

### Available Scripts

```bash
# Start both frontend and backend
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only  
npm run dev:backend

# Build for production
npm run build
```

## API Endpoints

### Authentication
- `POST /auth/student/login` - Student phone login
- `POST /auth/staff/login` - Staff email/password login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Bookings
- `GET /slots` - Get available slots
- `POST /bookings` - Create booking
- `PUT /bookings/:id/cancel` - Cancel booking
- `PUT /bookings/:id/reschedule` - Reschedule booking

### More endpoints will be documented as development progresses...

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is proprietary to 10 Minute School.