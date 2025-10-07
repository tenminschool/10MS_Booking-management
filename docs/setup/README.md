# Setup and Configuration Documentation

This directory contains installation, configuration, and system setup documentation for the 10MS Speaking Test Booking System.

## ⚙️ Available Documents

### Database Documentation
- `DATABASE_DESIGN.md` - Complete database schema and design documentation
- `DATABASE_SUMMARY.md` - Database summary and overview

### Setup Guides
- `SETUP_NOTES.md` - Initial setup notes and configuration instructions

## 🏗️ Setup Categories

### 1. **Database Setup**
Complete database configuration and schema information
- Database design and relationships
- Table structures and constraints
- Initial data and migrations
- Connection configuration

### 2. **System Configuration**
Environment setup and system configuration
- Environment variables
- Server configuration
- API setup
- Authentication configuration

### 3. **Development Environment**
Local development setup instructions
- Prerequisites and dependencies
- Installation procedures
- Development server setup
- Testing environment configuration

## 🚀 Quick Setup Guide

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (or Supabase account)
- Git for version control

### Basic Setup Steps
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd 10MS_Booking_management
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update database connection strings
   - Configure authentication secrets

4. **Database Setup**
   - Review `DATABASE_DESIGN.md` for schema
   - Run database migrations
   - Seed initial data

5. **Start Development Servers**
   ```bash
   npm run dev
   ```

### Current Configuration
- **Backend**: Port 3001
- **Frontend**: Port 5175 (auto-assigned)
- **Database**: Mock data fallback (Supabase unreachable)
- **Authentication**: Mock system for development

## 📋 Configuration Files

### Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=development
```

### Key Configuration Areas
- **Database Connection**: PostgreSQL/Supabase
- **Authentication**: JWT-based with mock fallback
- **API Configuration**: Express.js server
- **Frontend**: Vite development server

## 🔧 Troubleshooting Setup

### Common Issues
1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Use mock data fallback for development

2. **Port Already in Use**
   - Frontend auto-assigns alternative ports
   - Backend uses PORT environment variable
   - Check for conflicting processes

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check mock authentication configuration
   - Validate API endpoints

### Development Mode
The system includes comprehensive mock data fallback:
- Mock authentication system
- Mock database responses
- Mock API endpoints
- Full functionality without external dependencies

## 📊 System Architecture

### Backend Components
- Express.js API server
- Supabase for database
- JWT authentication
- Mock data services

### Frontend Components
- React with TypeScript
- Vite build system
- Tailwind CSS styling
- React Query for API calls

### Database Design
- User management system
- Branch and slot management
- Booking system
- Assessment tracking
- Notification system

## 🔍 Additional Resources

- **Database Schema**: See `DATABASE_DESIGN.md`
- **API Documentation**: Check backend route files
- **Frontend Guide**: See `../guides/FRONTEND_ACCESS_GUIDE.md`
- **Testing Setup**: See `../guides/TASK19_E2E_TESTING_GUIDE.md`