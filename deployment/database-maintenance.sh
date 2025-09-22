#!/bin/bash

# Database Maintenance Script for Speaking Test Booking System
# This script handles backups, cleanup, and maintenance tasks

set -e

# Configuration
DB_NAME="speakingtest_prod"
DB_USER="speakingtest"
DB_HOST="localhost"
BACKUP_DIR="/var/backups/speaking-test-booking"
LOG_FILE="/var/log/speaking-test-booking/maintenance.log"
RETENTION_DAYS=30
AUDIT_LOG_RETENTION_DAYS=90

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Database backup function
backup_database() {
    log "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    # Create backup with compression
    if pg_dump -U "$DB_USER" -h "$DB_HOST" "$DB_NAME" | gzip > "$backup_file"; then
        log "Database backup completed: $backup_file"
        
        # Verify backup integrity
        if gunzip -t "$backup_file" 2>/dev/null; then
            log "Backup integrity verified"
            
            # Get backup size
            local backup_size=$(du -h "$backup_file" | cut -f1)
            log "Backup size: $backup_size"
        else
            error_exit "Backup integrity check failed"
        fi
    else
        error_exit "Database backup failed"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        log "Deleting old backup: $(basename "$file")"
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    log "Deleted $deleted_count old backup files"
}

# Clean old audit logs
cleanup_audit_logs() {
    log "Cleaning up old audit logs (older than $AUDIT_LOG_RETENTION_DAYS days)..."
    
    # Connect to database and delete old audit logs
    local delete_query="DELETE FROM \"AuditLog\" WHERE \"createdAt\" < NOW() - INTERVAL '$AUDIT_LOG_RETENTION_DAYS days'"
    
    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "$delete_query" >/dev/null 2>&1; then
        local deleted_count=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT changes()" 2>/dev/null | tr -d ' ')
        log "Deleted $deleted_count old audit log entries"
    else
        log "WARNING: Failed to clean up audit logs"
    fi
}

# Database optimization
optimize_database() {
    log "Starting database optimization..."
    
    # Analyze tables for query optimization
    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "ANALYZE;" >/dev/null 2>&1; then
        log "Database analysis completed"
    else
        log "WARNING: Database analysis failed"
    fi
    
    # Vacuum database to reclaim space
    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "VACUUM;" >/dev/null 2>&1; then
        log "Database vacuum completed"
    else
        log "WARNING: Database vacuum failed"
    fi
    
    # Reindex for performance
    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;" >/dev/null 2>&1; then
        log "Database reindex completed"
    else
        log "WARNING: Database reindex failed"
    fi
}

# Check database health
check_database_health() {
    log "Checking database health..."
    
    # Check database connectivity
    if ! psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error_exit "Cannot connect to database"
    fi
    
    # Check database size
    local db_size=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tr -d ' ')
    log "Database size: $db_size"
    
    # Check table sizes
    log "Checking table sizes..."
    psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    " 2>/dev/null | while read line; do
        log "  $line"
    done
    
    # Check for long-running queries
    local long_queries=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM pg_stat_activity 
        WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
    " 2>/dev/null | tr -d ' ')
    
    if [ "$long_queries" -gt 0 ]; then
        log "WARNING: Found $long_queries long-running queries"
    else
        log "No long-running queries detected"
    fi
    
    # Check connection count
    local active_connections=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';
    " 2>/dev/null | tr -d ' ')
    
    log "Active database connections: $active_connections"
}

# Generate maintenance report
generate_report() {
    log "Generating maintenance report..."
    
    local report_file="$BACKUP_DIR/maintenance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Speaking Test Booking System - Database Maintenance Report"
        echo "Generated: $(date)"
        echo "========================================================="
        echo ""
        
        echo "Backup Status:"
        echo "- Latest backup: $(ls -t $BACKUP_DIR/db_backup_*.sql.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
        echo "- Total backups: $(ls $BACKUP_DIR/db_backup_*.sql.gz 2>/dev/null | wc -l)"
        echo "- Backup directory size: $(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)"
        echo ""
        
        echo "Database Health:"
        echo "- Database size: $(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tr -d ' ')"
        echo "- Active connections: $(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')"
        echo ""
        
        echo "Recent Activity (Last 24 hours):"
        echo "- New bookings: $(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Booking\" WHERE \"bookedAt\" > NOW() - INTERVAL '24 hours';" 2>/dev/null | tr -d ' ')"
        echo "- New assessments: $(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Assessment\" WHERE \"assessedAt\" > NOW() - INTERVAL '24 hours';" 2>/dev/null | tr -d ' ')"
        echo "- Audit log entries: $(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"AuditLog\" WHERE \"createdAt\" > NOW() - INTERVAL '24 hours';" 2>/dev/null | tr -d ' ')"
        
    } > "$report_file"
    
    log "Maintenance report generated: $report_file"
}

# Main execution
main() {
    log "Starting database maintenance routine..."
    
    # Check if database is accessible
    check_database_health
    
    # Perform maintenance tasks based on arguments
    case "${1:-full}" in
        "backup")
            backup_database
            ;;
        "cleanup")
            cleanup_old_backups
            cleanup_audit_logs
            ;;
        "optimize")
            optimize_database
            ;;
        "health")
            check_database_health
            ;;
        "report")
            generate_report
            ;;
        "full")
            backup_database
            cleanup_old_backups
            cleanup_audit_logs
            optimize_database
            generate_report
            ;;
        *)
            echo "Usage: $0 {backup|cleanup|optimize|health|report|full}"
            echo ""
            echo "Commands:"
            echo "  backup   - Create database backup"
            echo "  cleanup  - Clean old backups and audit logs"
            echo "  optimize - Optimize database performance"
            echo "  health   - Check database health"
            echo "  report   - Generate maintenance report"
            echo "  full     - Run all maintenance tasks (default)"
            exit 1
            ;;
    esac
    
    log "Database maintenance completed successfully"
}

# Run main function with all arguments
main "$@"