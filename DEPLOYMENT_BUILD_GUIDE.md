# Deployment Build Guide

## 🎯 Purpose
This guide ensures **consistent builds** across all environments (local, staging, production) and prevents type definition conflicts.

## 🔧 Prerequisites

### Required Versions
- **Node.js**: v18.0.0 or higher (tested with v22.16.0)
- **npm**: 9.0.0 or higher (tested with 11.4.2)
- **TypeScript**: 5.8.3 (managed via package.json)

### Verify Your Environment
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

## 📦 Clean Installation Process

### For Development Team / CI/CD

**IMPORTANT**: Always perform a clean install when deploying or when encountering type errors:

```bash
# 1. Clean all node_modules and caches
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf backend/node_modules backend/package-lock.json

# 2. Clear npm cache (optional but recommended)
npm cache clean --force

# 3. Install from root (this ensures proper hoisting)
npm install

# 4. Install frontend dependencies
cd frontend && npm install && cd ..

# 5. Install backend dependencies  
cd backend && npm install && cd ..

# 6. Build everything
npm run build
```

### For Quick Local Development
If you haven't changed dependencies:
```bash
npm install
npm run build
```

## 🚨 Common Issues & Solutions

### Issue 1: TypeScript Type Conflicts with Multer

**Symptom**: 
```
error TS2769: No overload matches this call
...multer/node_modules/@types/express...
```

**Root Cause**: Type definition conflicts between `@types/express` and `@types/multer`

**Solution**:
1. ✅ Fixed in codebase by:
   - Updated TypeScript to 5.8.3 in backend
   - Updated `@types/express` to v5.0.0
   - Updated `@types/multer` to v1.4.12
   - Added type casting for multer middleware

2. If still occurs, run clean install (see above)

### Issue 2: Different Behavior on Different Machines

**Root Cause**: 
- Different npm versions handle package hoisting differently
- Stale `package-lock.json` files
- Mixed npm/yarn usage

**Solution**:
1. **Standardize on npm** (not yarn) for consistency
2. Always commit `package-lock.json` to git
3. Use `npm ci` in CI/CD instead of `npm install`
4. Run clean install when switching branches

### Issue 3: Build Works Locally but Fails in Deployment

**Root Cause**:
- Different Node.js versions
- Cached node_modules in deployment environment
- Missing devDependencies in production

**Solution**:
1. Ensure Node.js version matches (check `engines` in package.json)
2. Clean install in deployment environment
3. Use proper build commands:
   ```bash
   # For production build
   NODE_ENV=production npm run build
   ```

## 🏗️ Build Commands

### Development Build
```bash
npm run build
```
This runs:
1. `npm run build:frontend` - Frontend TypeScript + Vite
2. `npm run build:backend` - Backend TypeScript

### Production Build
```bash
npm run build:prod
```

### Individual Builds
```bash
# Frontend only
cd frontend && npm run build

# Backend only  
cd backend && npm run build
```

## 🔍 Verification Steps

After building, verify:

### 1. Check Build Artifacts
```bash
# Frontend dist should exist
ls -la frontend/dist/

# Backend dist should exist
ls -la backend/dist/
```

### 2. Check for TypeScript Errors
```bash
# Frontend
cd frontend && npx tsc --noEmit

# Backend
cd backend && npx tsc --noEmit
```

### 3. Run Health Check (if server is running)
```bash
curl http://localhost:3001/health
```

## 📋 CI/CD Best Practices

### For GitHub Actions / Jenkins / etc.

```yaml
# Example CI configuration
steps:
  - name: Setup Node.js
    uses: actions/setup-node@v3
    with:
      node-version: '22.16.0'
      cache: 'npm'
  
  - name: Clean Install
    run: |
      rm -rf node_modules package-lock.json
      npm install
      cd frontend && npm install && cd ..
      cd backend && npm install && cd ..
  
  - name: Build
    run: npm run build
  
  - name: Verify Build
    run: |
      test -d frontend/dist || exit 1
      test -d backend/dist || exit 1
```

## 🔐 Environment Variables

**CRITICAL**: Environment variables must be configured correctly before building for production!

### Backend (.env)
```bash
# Database
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# JWT
JWT_SECRET=your_secret

# Server
PORT=3001
NODE_ENV=production
```

### Frontend Environment Configuration

#### For Development:
1. Copy `env.development` to `.env`:
```bash
cd frontend
cp env.development .env
```

#### For Production:
1. Copy `env.production` to `.env.production`:
```bash
cd frontend
cp env.production .env.production
```

2. **IMPORTANT**: Edit `.env.production` and set your actual backend URL:
```bash
# Replace with your actual backend server URL
VITE_API_URL=https://your-backend-domain.com
```

**Examples of valid production URLs:**
- `https://api.10minuteschool.com`
- `https://backend.yourdomain.com`
- `https://your-backend-server.com`

#### ⚠️ Common Production URL Mistakes:
- ❌ `http://localhost:3001` (won't work in production)
- ❌ `http://127.0.0.1:3001` (won't work in production)
- ✅ `https://your-backend-domain.com`
- ✅ `https://api.yourdomain.com`

## 📝 Package Version Management

### TypeScript Versions (Consistent Across Project)
- Frontend: `~5.8.3`
- Backend: `~5.8.3`
- Use `~` to lock to patch version

### Type Definition Versions (Backend)
- `@types/express`: `^5.0.0`
- `@types/multer`: `^1.4.12`
- These must be compatible with TypeScript 5.8.3

## 🆘 Troubleshooting Checklist

### If Build Fails:
- [ ] Is Node.js version >= 18.0.0?
- [ ] Did you run clean install?
- [ ] Are all `package-lock.json` files committed?
- [ ] Are you using npm (not yarn)?
- [ ] Did you clear npm cache?
- [ ] Are environment variables set?
- [ ] Did you pull latest changes?
- [ ] Are there uncommitted `node_modules`?

### If Frontend Shows "Network Error" or "ERR_CONNECTION_REFUSED":

**Symptom**: Login page shows "Network Error" and console shows:
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3001/api/auth/staff/login:1
```

**Root Cause**: Frontend is trying to connect to `localhost:3001` instead of production backend.

**Solution**:
1. **Check environment configuration**:
```bash
cd frontend
ls -la | grep env
# Should see: env.development, env.production
```

2. **Create production environment file**:
```bash
cd frontend
cp env.production .env.production
```

3. **Edit `.env.production` with correct backend URL**:
```bash
# Replace with your actual backend server URL
VITE_API_URL=https://your-backend-domain.com
```

4. **Rebuild for production**:
```bash
npm run build:prod
# or
NODE_ENV=production npm run build
```

5. **Verify the build includes correct URL**:
```bash
# Check the built files contain your production URL, not localhost
grep -r "your-backend-domain.com" dist/ || echo "URL not found - check configuration"
```

## 📞 Support

If issues persist after following this guide:
1. Run: `npm list typescript @types/express @types/multer`
2. Capture full error output
3. Share Node.js and npm versions
4. Share operating system

---

**Last Updated**: October 2025  
**Maintained By**: Development Team

