#!/bin/bash

# Production Deployment Script
# This script builds and prepares the backend for production deployment

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build for production
echo "🔨 Building for production..."
npm run build:prod

# Verify build
echo "✅ Verifying build..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

# Show build stats
echo "📊 Build completed successfully!"
echo "   - Total files: $(find dist -name "*.js" | wc -l)"
echo "   - Build size: $(du -sh dist/ | cut -f1)"

echo "🎉 Ready for deployment!"
echo "   Run: npm start:prod"
