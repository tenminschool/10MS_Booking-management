# Deployment Guide

Complete guide for deploying the 10 Minute School Speaking Test Booking Management System.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Environment Configuration](#environment-configuration)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Post-Deployment Setup](#post-deployment-setup)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- Git installed
- A Supabase account (for database)
- A deployment platform account (Vercel, Railway, or Render)

---

## Database Setup (Supabase)

> **Note:** This project uses **Supabase** as the PostgreSQL database provider. Supabase provides both the hosted database and the JavaScript client library for database connections.

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click **"New Project"**
4. Fill in:
   - **Project Name**: `10ms-booking-system` (or your choice)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### 2. Get Database Connection Details

After project creation (takes ~2 minutes):

1. Go to **Project Settings** → **Database**
2. Find **Connection String** section
3. Copy the **Connection Pooling** string (starts with `postgres://`)
4. This will be your `DATABASE_URL` for the backend environment variables

Example format:
```
postgres://postgres.abcdefghijklmnop:your-actual-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### 3. Setup Database Schema

**Option A: Using Supabase SQL Editor (Recommended)**

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents from `/backend/scripts/setup/setup-database.sql`
4. Paste and click **"Run"**
5. Wait for completion (may take 30-60 seconds)

**Option B: Using Supabase CLI (Advanced)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push schema (if using migration files)
supabase db push
```

> **Note:** Option A (SQL Editor) is recommended for first-time setup.

### 4. Verify Tables Created

In Supabase Dashboard:
1. Go to **Table Editor**
2. You should see tables like:
   - `users`
   - `branches`
   - `rooms`
   - `slots`
   - `bookings`
   - `assessments`
   - etc.

---

## Environment Configuration

### Backend Environment Variables

Create `/backend/.env` file:

```env
# Database (from Supabase Project Settings → Database → Connection String)
DATABASE_URL="postgres://postgres.abcdefghijklmnop:your-actual-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Supabase Configuration (from Supabase Project Settings → API)
SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Server
PORT=3001
NODE_ENV=production

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Frontend URL (update after frontend deployment)
FRONTEND_URL="https://lcbookings.10minuteschool.com"

# CORS Origins (your production domain)
CORS_ORIGIN="https://lcbookings.10minuteschool.com"
```

**Important Notes:**
- **JWT_SECRET**: Generate using: `openssl rand -base64 32`
- **DATABASE_URL**: Copy from Supabase Project Settings → Database → Connection String
- **SUPABASE_URL**: Copy from Supabase Project Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Copy from Supabase Project Settings → API → Service Role Key
- **FRONTEND_URL**: Will be updated after frontend deployment

**Getting Supabase Keys:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy **Project URL** (for SUPABASE_URL)
4. Copy **Service Role Key** (for SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

### Frontend Environment Variables

Create `/frontend/.env`:

```env
# Production - Backend API URL
VITE_API_URL="https://your-backend-url.railway.app"

# Local Development - Backend API URL
# VITE_API_URL="http://localhost:3001"
```

**Local Development Setup:**
- Frontend runs on: `http://localhost:5173` (Vite default port)
- Backend runs on: `http://localhost:3001`
- Set `VITE_API_URL="http://localhost:3001"` in `/frontend/.env.local`

**Production Setup:**
- Frontend domain: `https://lcbookings.10minuteschool.com`
- Backend API: Your deployed backend URL
- Set `VITE_API_URL` in Vercel environment variables

---

## Backend Deployment

> **Production Platform**: Digital Ocean VPS

### Build Configurations

The project includes two TypeScript build configurations:

- **Development Build** (`npm run build`): Includes source maps, declarations, and debugging info
- **Production Build** (`npm run build:prod`): Optimized build without source maps or declarations (~75% fewer files)

For deployment, always use the production build to reduce file count and improve performance.

**Quick deployment:** Run `npm run deploy` for automated production build and verification.

### Digital Ocean VPS Deployment

**Initial Server Setup:**

```bash
# 1. Create Ubuntu 22.04 droplet on Digital Ocean
# 2. SSH into your server
ssh root@your-server-ip

# 3. Update system
apt update && apt upgrade -y

# 4. Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 5. Install PM2 (process manager)
npm install -g pm2

# 6. Install Nginx
apt install -y nginx

# 7. Install SSL certificate tool
apt install -y certbot python3-certbot-nginx
```

**Deploy Application:**

```bash
# 1. Create app directory
mkdir -p /var/www/10ms-booking
cd /var/www/10ms-booking

# 2. Clone repository
git clone https://github.com/your-org/10MS_Booking-management.git .
cd backend

# 3. Install dependencies & build
npm install
npm run build:prod

# 4. Create environment file
nano .env
# Add all production environment variables (see Environment Configuration above)
```

**Configure PM2:**

```bash
# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: '10ms-api',
    script: 'dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

**Configure Nginx:**

```bash
# Create Nginx config
nano /etc/nginx/sites-available/10ms-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Your backend domain

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/10ms-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL
certbot --nginx -d api.yourdomain.com
```

**Monitoring:**
```bash
pm2 logs        # View logs
pm2 status      # Check status
pm2 monit       # Monitor resources
```

---

## Frontend Deployment

> **Production Domain**: `lcbookings.10minuteschool.com`
> 
> **Platform**: Vercel (static hosting with global CDN)
> 
> **Local Development**: Frontend runs on port `5173` (Vite default)

> **Why Vercel for frontend when backend is on Digital Ocean?**
> - Frontend is static files (HTML/CSS/JS) - doesn't need a VPS
> - Vercel provides global CDN for fast loading worldwide
> - Free SSL, auto-deployment from GitHub
> - Perfect for React/Vite applications
> - Backend API on Digital Ocean handles all server logic

### Vercel Deployment

1. **Sign up at [Vercel.com](https://vercel.com)**

2. **Import Project**
   - Click **"Add New"** → **"Project"**
   - Import your GitHub repository
   - Select **"Continue"**

3. **Configure Project**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**
   - Click **"Environment Variables"**
   - Add `VITE_API_URL` with your backend URL
   - Example: `https://your-backend-api.railway.app`

5. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete (~2-3 minutes)
   - Vercel will generate a URL (e.g., `https://your-project.vercel.app`)

6. **Configure Custom Domain**
   - Go to Project Settings → **Domains**
   - Click **"Add Domain"**
   - Enter: `lcbookings.10minuteschool.com`
   - Follow DNS configuration instructions:
     - Add a `CNAME` record pointing to Vercel's domain
     - Or add `A` records for Vercel's IP addresses
   - Wait for DNS propagation (~5-60 minutes)

7. **Update Backend CORS**
   - Go back to Railway/Render backend settings
   - Update environment variables:
     ```env
     FRONTEND_URL="https://lcbookings.10minuteschool.com"
     CORS_ORIGIN="https://lcbookings.10minuteschool.com"
     ```
   - Redeploy backend for changes to take effect

---

## Post-Deployment Setup

### 1. Create Admin Account

Run this SQL in Supabase SQL Editor:

```sql
-- Create Super Admin
INSERT INTO users (
  email,
  password_hash,
  full_name,
  phone,
  role,
  is_active
) VALUES (
  'admin@10minuteschool.com',
  '$2a$10$YourHashedPasswordHere', -- Use bcrypt to hash "admin123"
  'System Administrator',
  '+8801712345678',
  'SUPER_ADMIN',
  true
);
```

**Generate password hash:**
```bash
# Install bcrypt-cli if needed
npm install -g bcrypt-cli

# Generate hash for "admin123"
bcrypt-cli "admin123" 10
```

### 2. Create Initial Data

**Add a Branch:**
```sql
INSERT INTO branches (name, location, is_active) 
VALUES ('Dhanmondi', 'Dhaka', true);
```

**Add Rooms:**
```sql
INSERT INTO rooms (branch_id, name, capacity, is_active)
VALUES 
  (1, 'Room A1', 1, true),
  (1, 'Room A2', 1, true),
  (1, 'Room B1', 1, true);
```

### 3. Test the Application

1. **Visit Frontend URL**: `https://your-app.vercel.app`
2. **Login** with admin credentials
3. **Create test data**:
   - Add slots in Admin Dashboard
   - Create a test student account
   - Make a test booking
4. **Verify functionality**:
   - Check booking flow
   - Test notifications
   - Verify assessments

### 4. Configure Domain (Optional)

**For Vercel:**
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

**For Railway:**
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS records

---

## Troubleshooting

### Database Connection Issues

**Error: "Connection refused"**
```bash
# Check if DATABASE_URL is correct
# Verify Supabase project is active
# Check if IP is whitelisted in Supabase (should be 0.0.0.0/0 for serverless)
```

**Error: "Too many connections"**
```bash
# Use connection pooling URL from Supabase
# Format: postgres://...pooler.supabase.com:6543/...
```

### CORS Errors

**Error: "Access-Control-Allow-Origin"**
```bash
# Update backend environment variables:
CORS_ORIGIN="https://lcbookings.10minuteschool.com"
FRONTEND_URL="https://lcbookings.10minuteschool.com"

# For local development, also allow:
# CORS_ORIGIN="http://localhost:5173,https://lcbookings.10minuteschool.com"

# Redeploy backend
```

### Build Failures

**Frontend build fails:**
```bash
# Check all dependencies are in package.json
# Verify VITE_API_URL is set in environment variables
# Check Node.js version (should be 18+)
```

**Backend build fails:**
```bash
# Ensure all TypeScript files compile
# Check for missing dependencies
# Verify DATABASE_URL is correct
```

### Production Issues

**500 Internal Server Error:**
```bash
# Check backend logs
# Verify database migrations ran successfully
# Check environment variables are set correctly
```

**Login not working:**
```bash
# Verify JWT_SECRET is set
# Check CORS settings
# Verify admin account exists in database
```

---

## Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS on both frontend and backend
- [ ] Configure proper CORS origins
- [ ] Set NODE_ENV=production
- [ ] Review and limit database permissions
- [ ] Enable rate limiting on API
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database
- [ ] Review and update security headers

---

## Monitoring & Maintenance

### Health Check Endpoints

- Backend: `https://your-backend-url.railway.app/health`
- Should return: `{"status":"ok","timestamp":"..."}`

### Database Backups

**Supabase:**
- Go to Database → Backups
- Enable daily backups
- Configure retention period

### Logs

**Railway:**
- View logs in dashboard
- Use `railway logs` CLI command

**Vercel:**
- Check Function logs in dashboard
- Monitor performance metrics

---

## Support

For issues:
1. Check `/docs` folder for detailed documentation
2. Review this deployment guide
3. Check application logs
4. Contact: support@10minuteschool.com

---

## Next Steps

After successful deployment:
1. Set up monitoring (Sentry, LogRocket)
2. Configure notifications (to be implemented later)
3. Set up analytics (Google Analytics)
4. Create user documentation
5. Train administrators

---

**Last Updated:** January 2025
**Version:** 1.0.0

