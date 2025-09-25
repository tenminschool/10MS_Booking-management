# Frontend Access Guide - Speaking Test Booking System

## 🔧 Styling Issue Fix

The frontend is showing no styling because Tailwind CSS might not be processing correctly. Here's how to fix it:

### Quick Fix
1. **Restart the frontend development server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **If styling still doesn't work, rebuild the CSS**:
   ```bash
   cd frontend
   npm install
   npm run build
   npm run dev
   ```

3. **Alternative: Force Tailwind rebuild**:
   ```bash
   cd frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

## 🔐 Login Credentials

### Staff Login (Email + Password)

#### Super Admin
- **Email**: `admin@10minuteschool.com`
- **Password**: `admin123`
- **Access**: All branches, all features, system settings

#### Branch Admins
- **Dhanmondi Branch Admin**:
  - Email: `dhanmondi@10minuteschool.com`
  - Password: `admin123`
  - Access: Dhanmondi branch only

- **Gulshan Branch Admin**:
  - Email: `gulshan@10minuteschool.com`
  - Password: `admin123`
  - Access: Gulshan branch only

#### Teachers
- **Sarah Ahmed (Dhanmondi)**:
  - Email: `sarah@10minuteschool.com`
  - Password: `teacher123`
  - Access: Teaching functions, assessment recording

- **John Smith (Gulshan)**:
  - Email: `john@10minuteschool.com`
  - Password: `teacher123`
  - Access: Teaching functions, assessment recording

### Student Login (Phone + OTP)
- **Student 1**: `+8801712345678`
- **Student 2**: `+8801812345678`
- **OTP**: Use any 6-digit number (e.g., `123456`) - it's mocked in development

## 🌐 Page URLs (Local Development)

### Base URL
```
http://localhost:5173
```

### Public Pages
- **Login Page**: `http://localhost:5173/login`

### Protected Pages (Requires Login)

#### Dashboard & Main Features
- **Dashboard**: `http://localhost:5173/dashboard`
- **Schedule Browser**: `http://localhost:5173/schedule`
- **My Bookings**: `http://localhost:5173/bookings`
- **Assessments**: `http://localhost:5173/assessments`
- **Notifications**: `http://localhost:5173/notifications`

#### Admin Pages (Admin/Super Admin Only)
- **Slot Management**: `http://localhost:5173/admin/slots`
- **Branch Management**: `http://localhost:5173/admin/branches` (Super Admin only)
- **System Settings**: `http://localhost:5173/admin/settings` (Super Admin only)

#### Additional Admin Pages (May need implementation)
- **User Management**: `http://localhost:5173/admin/users`
- **Reports**: `http://localhost:5173/admin/reports`
- **CSV Import**: `http://localhost:5173/admin/import`

## 🎭 User Role Access Matrix

| Page | Student | Teacher | Branch Admin | Super Admin |
|------|---------|---------|--------------|-------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Schedule | ✅ | ✅ | ✅ | ✅ |
| Bookings | ✅ (Own) | ✅ (Assigned) | ✅ (Branch) | ✅ (All) |
| Assessments | ✅ (Own) | ✅ (Record) | ✅ (Branch) | ✅ (All) |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Admin Slots | ❌ | ❌ | ✅ | ✅ |
| Admin Branches | ❌ | ❌ | ❌ | ✅ |
| Admin Settings | ❌ | ❌ | ❌ | ✅ |

## 🧪 Testing Different User Experiences

### 1. Student Experience
```bash
# Login as student
Phone: +8801712345678
OTP: 123456

# Test flow:
1. Browse available slots → /schedule
2. Book a slot
3. View bookings → /bookings
4. Check notifications → /notifications
5. View assessment results → /assessments
```

### 2. Teacher Experience
```bash
# Login as teacher
Email: sarah@10minuteschool.com
Password: teacher123

# Test flow:
1. View assigned sessions → /bookings
2. Record assessments → /assessments
3. Check notifications → /notifications
4. View dashboard metrics → /dashboard
```

### 3. Branch Admin Experience
```bash
# Login as branch admin
Email: dhanmondi@10minuteschool.com
Password: admin123

# Test flow:
1. Manage slots → /admin/slots
2. View branch bookings → /bookings
3. Generate reports → /admin/reports
4. Manage branch users → /admin/users
5. View branch analytics → /dashboard
```

### 4. Super Admin Experience
```bash
# Login as super admin
Email: admin@10minuteschool.com
Password: admin123

# Test flow:
1. System overview → /dashboard
2. Manage all branches → /admin/branches
3. System settings → /admin/settings
4. Cross-branch reports → /admin/reports
5. All slots management → /admin/slots
```

## 🔍 Debugging Tips

### If Pages Don't Load
1. **Check Authentication**: Make sure you're logged in with the correct role
2. **Check Network Tab**: Look for API errors in browser dev tools
3. **Check Console**: Look for JavaScript errors
4. **Verify Backend**: Make sure backend is running on `http://localhost:3001`

### If Styling Is Missing
1. **Hard Refresh**: Press `Ctrl+F5` or `Cmd+Shift+R`
2. **Clear Cache**: Clear browser cache and reload
3. **Check CSS**: Open dev tools and verify CSS is loading
4. **Restart Dev Server**: Stop and restart `npm run dev`

### Common Issues
- **404 Errors**: Some admin pages might not be fully implemented yet
- **Access Denied**: Make sure you're using the correct user role for the page
- **API Errors**: Backend might not be running or database not seeded

## 🚀 Quick Start Commands

### Start the System
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev

# Terminal 3: Seed Database (if needed)
cd backend
npm run db:seed
```

### Access the System
1. Open browser to `http://localhost:5173`
2. Login with any of the credentials above
3. Navigate through the different pages
4. Test different user roles by logging out and logging in with different credentials

## 📱 Mobile Testing

### Test on Different Screen Sizes
1. Open browser dev tools (F12)
2. Click device toolbar icon
3. Test different device sizes:
   - iPhone SE (375x667)
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - Desktop (1920x1080)

### Mobile-Specific Features
- Touch-friendly buttons and forms
- Responsive navigation (hamburger menu)
- Optimized layouts for small screens
- Mobile-friendly date/time pickers

## 🎯 Feature Testing Checklist

### Authentication
- [ ] Staff email/password login
- [ ] Student phone/OTP login
- [ ] Role-based page access
- [ ] Logout functionality

### Booking System
- [ ] Browse available slots
- [ ] Create new booking
- [ ] Cancel booking (24-hour rule)
- [ ] Reschedule booking
- [ ] Cross-branch booking (students)

### Assessment System
- [ ] Record IELTS scores (teachers)
- [ ] View assessment history
- [ ] Score validation (0-9 with 0.5 increments)
- [ ] Assessment analytics

### Notification System
- [ ] In-app notifications
- [ ] Notification history
- [ ] Mark as read/unread
- [ ] Notification filtering

### Admin Features
- [ ] Slot management
- [ ] User management
- [ ] Branch management (super admin)
- [ ] System settings (super admin)
- [ ] Reports and analytics

---

**Happy Testing! 🎉**

If you encounter any issues, check the browser console for errors and ensure both backend and frontend servers are running properly.