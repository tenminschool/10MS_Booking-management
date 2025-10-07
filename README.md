# 10 Minute School Speaking Test Booking System

A comprehensive booking management system for speaking test appointments at 10 Minute School.

## 🚀 Quick Start

### Development Setup

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Test Credentials
- **Staff**: admin@10minuteschool.com / admin123
- **Student**: +8801712345678 / any 6-digit OTP

### 🚀 Production Deployment

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide** including:
- Supabase database setup
- Railway/Vercel deployment
- Environment configuration
- Post-deployment checklist

## 📁 Project Structure

```
10MS_Booking_management/
├── 📚 docs/                    # All documentation (organized)
│   ├── tasks/                  # Task implementation summaries
│   ├── fixes/                  # Bug fixes and error resolutions
│   ├── guides/                 # User guides and how-tos
│   ├── reports/                # Status reports and analysis
│   ├── testing/                # Testing documentation
│   └── setup/                  # Setup and configuration
├── 🛠️ scripts/                 # Utility scripts (organized)
│   ├── utilities/              # General utilities
│   ├── validation/             # Validation scripts
│   └── testing/                # Test runners
├── 🖥️ backend/                 # Backend API (Express + TypeScript)
├── 🌐 frontend/                # Frontend (React + TypeScript)
├── 🚀 deployment/              # Deployment configurations
└── 🤖 .kiro/                   # Kiro IDE specifications
```

## ✨ Features

- **Multi-role Authentication**: Students (OTP), Staff (email/password)
- **Branch Management**: Multiple branch support
- **Slot Management**: Flexible time slot creation
- **Booking System**: Student booking with conflict prevention
- **Assessment System**: IELTS-style scoring
- **Dashboard**: Role-specific dashboards with metrics
- **Responsive Design**: Mobile-friendly interface
- **Mock Data Fallback**: Fully functional without database

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **Supabase** (PostgreSQL database + JavaScript client)
- **JWT** authentication + **Zod** validation

### Frontend  
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** + **React Query** + **React Router**
- **Three.js** + **React Three Fiber** (Neural network background)

## 📖 Documentation

All documentation is now organized in the [`docs/`](./docs/) directory:

- **📋 [Task Summaries](./docs/tasks/)** - Implementation reports
- **🔧 [Bug Fixes](./docs/fixes/)** - Error resolutions  
- **📖 [User Guides](./docs/guides/)** - How-to documentation
- **📊 [Status Reports](./docs/reports/)** - System analysis
- **⚙️ [Setup Guides](./docs/setup/)** - Configuration help

## 🧪 Testing & Utilities

Utility scripts are organized in the [`scripts/`](./scripts/) directory:

```bash
# Test all API endpoints
node scripts/utilities/test-all-endpoints.js

# Check server status  
node scripts/utilities/check-server-status.js

# Run comprehensive E2E tests
npx tsx scripts/testing/run-comprehensive-e2e-tests.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Git

### Installation
```bash
# Clone and install
git clone <repository-url>
cd 10MS_Booking_management
npm install

# Start development servers
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5175
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🎯 User Roles

1. **Students**: Book tests, view assessments
2. **Teachers**: Manage slots, conduct assessments  
3. **Branch Admins**: Branch operations and user management
4. **Super Admins**: System-wide administration

## 📊 Current Status

- ✅ **All API endpoints working** (with mock data)
- ✅ **Frontend fully functional** 
- ✅ **Authentication system working**
- ✅ **Navigation improvements implemented**
- ✅ **Console errors resolved**
- ✅ **Comprehensive testing suite**
- ✅ **Documentation organized**

## 🔍 Quick Links

- [📖 Complete Documentation](./docs/README.md)
- [🚀 Frontend Access Guide](./docs/guides/FRONTEND_ACCESS_GUIDE.md)
- [⚙️ Database Design](./docs/setup/DATABASE_DESIGN.md)
- [🧪 Testing Guide](./docs/guides/TASK19_E2E_TESTING_GUIDE.md)
- [📊 Server Status](./docs/reports/SERVER_STATUS_REPORT.md)

## 🤝 Contributing

1. Review documentation in [`docs/`](./docs/)
2. Use utility scripts in [`scripts/`](./scripts/) for testing
3. Follow established patterns and conventions
4. Update documentation for any changes

---

**Ready to use!** The system is fully functional with mock data and comprehensive testing. Check the [documentation](./docs/) for detailed guides and information.