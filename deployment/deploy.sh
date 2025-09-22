#!/bin/bash

# Deployment script for Speaking Test Booking System
# This script handles the deployment process to production

set -e

# Configuration
APP_NAME="speaking-test-booking"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME/deploy.log"
GIT_REPO="https://github.com/your-username/speaking-test-booking.git"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check if running as correct user
check_user() {
    if [ "$USER" != "deploy" ]; then
        error "This script should be run as the 'deploy' user"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required commands exist
    for cmd in git node npm pm2 nginx; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd is not installed or not in PATH"
        fi
    done
    
    # Check if directories exist
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory $APP_DIR does not exist"
    fi
    
    success "Prerequisites check passed"
}

# Create backup of current deployment
create_backup() {
    log "Creating backup of current deployment..."
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup application files (excluding node_modules and logs)
    tar --exclude='node_modules' --exclude='dist' --exclude='*.log' \
        -czf "$backup_path.tar.gz" -C "$APP_DIR" . 2>/dev/null || true
    
    # Backup database
    if command -v pg_dump &> /dev/null; then
        pg_dump -U speakingtest -h localhost speakingtest_prod | gzip > "$backup_path.sql.gz" 2>/dev/null || true
    fi
    
    success "Backup created: $backup_name"
}

# Pull latest code
pull_code() {
    log "Pulling latest code from $BRANCH branch..."
    
    cd "$APP_DIR"
    
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $(date)" 2>/dev/null || true
    
    # Pull latest changes
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    
    local commit_hash=$(git rev-parse --short HEAD)
    success "Code updated to commit: $commit_hash"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$APP_DIR"
    
    # Backend dependencies
    log "Installing backend dependencies..."
    cd backend
    npm ci --production=false
    cd ..
    
    # Frontend dependencies
    log "Installing frontend dependencies..."
    cd frontend
    npm ci --production=false
    cd ..
    
    success "Dependencies installed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$APP_DIR"
    
    # Build backend
    log "Building backend..."
    cd backend
    npm run build
    cd ..
    
    # Build frontend
    log "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    success "Application built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$APP_DIR/backend"
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    success "Database migrations completed"
}

# Update PM2 processes
update_pm2() {
    log "Updating PM2 processes..."
    
    cd "$APP_DIR"
    
    # Check if PM2 processes are running
    if pm2 list | grep -q "$APP_NAME"; then
        log "Reloading existing PM2 processes..."
        pm2 reload ecosystem.config.js --env production
    else
        log "Starting new PM2 processes..."
        pm2 start ecosystem.config.js --env production
    fi
    
    # Save PM2 configuration
    pm2 save
    
    success "PM2 processes updated"
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
    # Wait for application to start
    sleep 10
    
    # Test health endpoint
    local health_url="http://localhost:3001/health"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 2
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Reload Nginx
reload_nginx() {
    log "Reloading Nginx configuration..."
    
    # Test Nginx configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        success "Nginx reloaded successfully"
    else
        error "Nginx configuration test failed"
    fi
}

# Cleanup old files
cleanup() {
    log "Cleaning up old files..."
    
    # Clean old backups (keep last 10)
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
        ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    fi
    
    # Clean old logs (keep last 30 days)
    find "/var/log/$APP_NAME" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local commit_hash=$(cd "$APP_DIR" && git rev-parse --short HEAD)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    log "Deployment $status - Commit: $commit_hash - Time: $timestamp"
    
    # Here you could send notifications to Slack, email, etc.
    # Example: curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"Deployment '$status' - '$APP_NAME' - '$commit_hash'"}' \
    #   YOUR_SLACK_WEBHOOK_URL
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Find latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to: $(basename "$latest_backup")"
    
    # Stop PM2 processes
    pm2 stop ecosystem.config.js 2>/dev/null || true
    
    # Restore backup
    cd "$APP_DIR"
    tar -xzf "$latest_backup"
    
    # Restart PM2 processes
    pm2 start ecosystem.config.js --env production
    
    success "Rollback completed"
}

# Main deployment function
deploy() {
    log "Starting deployment of $APP_NAME..."
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    check_user
    check_prerequisites
    create_backup
    pull_code
    install_dependencies
    build_application
    run_migrations
    update_pm2
    test_deployment
    reload_nginx
    cleanup
    
    send_notification "SUCCESS"
    success "Deployment completed successfully!"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "test")
        test_deployment
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|test|backup|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment process (default)"
        echo "  rollback - Rollback to previous version"
        echo "  test     - Test current deployment"
        echo "  backup   - Create backup only"
        echo "  cleanup  - Cleanup old files only"
        exit 1
        ;;
esac