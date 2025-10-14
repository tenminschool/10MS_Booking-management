#!/bin/bash

# Production Deployment Script
# This script configures environment variables and builds for production

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if backend URL is provided
if [ -z "$1" ]; then
    print_error "Usage: ./scripts/deploy-production.sh <BACKEND_URL>"
    print_error "Example: ./scripts/deploy-production.sh https://lcbookings-api.10minuteschool.com"
    exit 1
fi

BACKEND_URL="$1"
print_status "Using backend URL: $BACKEND_URL"

# Navigate to frontend directory
cd frontend

# Create production environment file
print_status "Creating production environment configuration..."
echo "VITE_API_URL=$BACKEND_URL" > .env.production
print_status "Created .env.production with URL: $BACKEND_URL"

# Verify environment file
if [ ! -f ".env.production" ]; then
    print_error "Failed to create .env.production file"
    exit 1
fi

# Clean install dependencies
print_status "Installing dependencies..."
npm ci

# Build for production
print_status "Building frontend for production..."
NODE_ENV=production npm run build

# Verify build
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

# Check if the build contains the correct URL
print_status "Verifying build contains correct API URL..."
if grep -r "$BACKEND_URL" dist/ > /dev/null; then
    print_status "✅ Build verification passed - correct API URL found"
else
    print_warning "⚠️  API URL not found in build - please verify configuration"
fi

# Go back to root
cd ..

# Build backend
print_status "Building backend..."
cd backend
npm run build
cd ..

print_status "🎉 Production build completed successfully!"
print_status "Frontend dist: frontend/dist/"
print_status "Backend dist: backend/dist/"
print_warning "Remember to deploy your backend to: $BACKEND_URL"

echo ""
echo "📋 Next steps:"
echo "1. Deploy backend to: $BACKEND_URL"
echo "2. Deploy frontend dist/ folder to your hosting service"
echo "3. Ensure backend is running and accessible at: $BACKEND_URL"