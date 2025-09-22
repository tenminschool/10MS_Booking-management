#!/bin/bash

# Security Hardening Script for Speaking Test Booking System
# This script applies additional security measures for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    apt update && apt upgrade -y
    success "System packages updated"
}

# Configure SSH security
secure_ssh() {
    log "Configuring SSH security..."
    
    # Backup original SSH config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # SSH hardening settings
    cat >> /etc/ssh/sshd_config.d/99-security.conf << 'EOF'
# SSH Security Configuration for Speaking Test Booking System

# Disable root login
PermitRootLogin no

# Use only SSH protocol 2
Protocol 2

# Change default port (uncomment and change if desired)
# Port 2222

# Disable password authentication (enable only after setting up key-based auth)
# PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Disable agent forwarding
AllowAgentForwarding no

# Disable TCP forwarding
AllowTcpForwarding no

# Set login grace time
LoginGraceTime 30

# Maximum authentication attempts
MaxAuthTries 3

# Maximum sessions per connection
MaxSessions 2

# Client alive settings
ClientAliveInterval 300
ClientAliveCountMax 2

# Allowed users (add your users here)
AllowUsers deploy

# Use strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# Use strong MACs
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256
EOF

    # Test SSH configuration
    if sshd -t; then
        systemctl restart sshd
        success "SSH security configured"
    else
        error "SSH configuration test failed"
    fi
}

# Configure fail2ban
setup_fail2ban() {
    log "Setting up fail2ban..."
    
    # Install fail2ban
    apt install -y fail2ban
    
    # Create custom jail configuration
    cat > /etc/fail2ban/jail.d/speaking-test.conf << 'EOF'
[DEFAULT]
# Ban time: 1 hour
bantime = 3600

# Find time: 10 minutes
findtime = 600

# Max retry: 5 attempts
maxretry = 5

# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

    # Create custom filter for application
    cat > /etc/fail2ban/filter.d/speaking-test-auth.conf << 'EOF'
[Definition]
failregex = ^.*"POST /api/auth/.*" 401.*$
            ^.*authentication failed.*client: <HOST>.*$
            ^.*invalid credentials.*client: <HOST>.*$

ignoreregex =
EOF

    # Start and enable fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    
    success "Fail2ban configured and started"
}

# Configure automatic security updates
setup_auto_updates() {
    log "Configuring automatic security updates..."
    
    # Install unattended-upgrades
    apt install -y unattended-upgrades apt-listchanges
    
    # Configure automatic updates
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    // Add packages to blacklist if needed
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

Unattended-Upgrade::Mail "admin@your-domain.com";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

    # Enable automatic updates
    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    success "Automatic security updates configured"
}

# Secure file permissions
secure_file_permissions() {
    log "Securing file permissions..."
    
    # Application directory permissions
    chown -R deploy:deploy /var/www/speaking-test-booking
    chmod -R 755 /var/www/speaking-test-booking
    
    # Secure environment files
    chmod 600 /var/www/speaking-test-booking/.env.production 2>/dev/null || true
    
    # Log directory permissions
    chown -R deploy:deploy /var/log/speaking-test-booking
    chmod -R 644 /var/log/speaking-test-booking
    
    # Backup directory permissions
    chown -R deploy:deploy /var/backups/speaking-test-booking
    chmod -R 700 /var/backups/speaking-test-booking
    
    # Secure SSH keys
    chmod 700 /home/deploy/.ssh 2>/dev/null || true
    chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    
    success "File permissions secured"
}

# Configure PostgreSQL security
secure_postgresql() {
    log "Securing PostgreSQL..."
    
    # Get PostgreSQL version
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
    
    # Backup original configuration
    cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
    cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"
    
    # Configure PostgreSQL security settings
    cat >> "$PG_CONFIG_DIR/postgresql.conf" << 'EOF'

# Security Configuration
ssl = on
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_failed_connections = on
log_statement = 'mod'
EOF

    # Restrict connections in pg_hba.conf
    sed -i 's/local   all             all                                     peer/local   all             all                                     scram-sha-256/' "$PG_CONFIG_DIR/pg_hba.conf"
    sed -i 's/host    all             all             127.0.0.1\/32            md5/host    all             all             127.0.0.1\/32            scram-sha-256/' "$PG_CONFIG_DIR/pg_hba.conf"
    
    # Restart PostgreSQL
    systemctl restart postgresql
    
    success "PostgreSQL security configured"
}

# Setup log monitoring
setup_log_monitoring() {
    log "Setting up log monitoring..."
    
    # Install logwatch
    apt install -y logwatch
    
    # Configure logwatch
    cat > /etc/logwatch/conf/logwatch.conf << 'EOF'
LogDir = /var/log
TmpDir = /var/cache/logwatch
MailTo = admin@your-domain.com
MailFrom = logwatch@your-domain.com
Print = No
Save = /var/cache/logwatch
Range = yesterday
Detail = Med
Service = All
mailer = "/usr/sbin/sendmail -t"
EOF

    # Create custom logwatch service for application
    mkdir -p /etc/logwatch/conf/services
    cat > /etc/logwatch/conf/services/speaking-test.conf << 'EOF'
Title = "Speaking Test Booking System"
LogFile = speaking-test-booking/*.log
*OnlyService = speaking-test
*RemoveHeaders
EOF

    success "Log monitoring configured"
}

# Configure system limits
configure_limits() {
    log "Configuring system limits..."
    
    # Configure limits for deploy user
    cat >> /etc/security/limits.conf << 'EOF'

# Speaking Test Booking System limits
deploy soft nofile 65536
deploy hard nofile 65536
deploy soft nproc 4096
deploy hard nproc 4096
EOF

    # Configure systemd limits
    mkdir -p /etc/systemd/system.conf.d
    cat > /etc/systemd/system.conf.d/limits.conf << 'EOF'
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=4096
EOF

    success "System limits configured"
}

# Setup intrusion detection
setup_intrusion_detection() {
    log "Setting up intrusion detection..."
    
    # Install AIDE (Advanced Intrusion Detection Environment)
    apt install -y aide
    
    # Initialize AIDE database
    aideinit
    
    # Move database to proper location
    mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
    
    # Create AIDE check script
    cat > /usr/local/bin/aide-check.sh << 'EOF'
#!/bin/bash
# AIDE integrity check script

AIDE_LOG="/var/log/aide/aide.log"
mkdir -p $(dirname $AIDE_LOG)

echo "AIDE integrity check started at $(date)" >> $AIDE_LOG
aide --check >> $AIDE_LOG 2>&1

if [ $? -ne 0 ]; then
    echo "AIDE detected changes! Check $AIDE_LOG for details" | mail -s "AIDE Alert - $(hostname)" admin@your-domain.com
fi
EOF

    chmod +x /usr/local/bin/aide-check.sh
    
    # Add AIDE check to cron (weekly)
    echo "0 3 * * 0 /usr/local/bin/aide-check.sh" >> /var/spool/cron/crontabs/root
    
    success "Intrusion detection configured"
}

# Main execution
main() {
    log "Starting security hardening for Speaking Test Booking System..."
    
    check_root
    update_system
    secure_ssh
    setup_fail2ban
    setup_auto_updates
    secure_file_permissions
    secure_postgresql
    setup_log_monitoring
    configure_limits
    setup_intrusion_detection
    
    success "Security hardening completed!"
    
    echo ""
    warning "Important Notes:"
    echo "1. Update email addresses in configuration files"
    echo "2. Consider changing SSH port in /etc/ssh/sshd_config.d/99-security.conf"
    echo "3. Set up SSH key-based authentication before disabling password auth"
    echo "4. Review and test all configurations"
    echo "5. Monitor logs regularly for security events"
    echo ""
    
    log "Security hardening summary:"
    echo "✅ SSH hardened with strong ciphers and limited access"
    echo "✅ Fail2ban configured for intrusion prevention"
    echo "✅ Automatic security updates enabled"
    echo "✅ File permissions secured"
    echo "✅ PostgreSQL security enhanced"
    echo "✅ Log monitoring with logwatch configured"
    echo "✅ System limits optimized"
    echo "✅ Intrusion detection with AIDE enabled"
}

# Run main function
main "$@"